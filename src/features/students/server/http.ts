import { can, cleanEmail, cleanName, type Account } from "@/features/account/model";
import { safeNext, type AuthDeps } from "@/features/account/server/auth";
import { NO_ACCOUNTS, baseUrl, json, readJson, resultCookies, sameOrigin } from "@/features/account/server/http";
import type { sendMail as sendMailFn } from "@/features/account/server/mail";
import { devOnly } from "@/features/devtools/gate";
import type { LibraryRepo } from "@/features/library/server/repo";
import { localDate } from "@/features/plan/model/schedule";
import { isNearToday } from "@/features/plan/server/composeToday";
import { signedIn } from "@/features/userData/server/http";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { fullLine } from "../model/places";
import { ACCOUNT_CHANGED_WORDS, LOGGED_OUT_WORDS } from "../model/words";
import { claimEmail, claimUrl } from "./mail";
import { makeWeek, studentView } from "./plans";
import { addStudent, listStudents, newClaimLink, openClaim, peekClaim, studentRow } from "./students";

/**
 * The students routes as functions over explicit deps and a `Request`, so tests call them over memory repos and the
 * `route.ts` files only build the real deps (`./deps.ts`). Every error body is `{ error, code }`; the `error` line is
 * shown to the teacher (or the student, for the claim page) as it is.
 */

type Env = Record<string, string | undefined>;

export interface StudentsHttpDeps {
  auth: AuthDeps;
  userData: UserDataRepo;
  library: LibraryRepo;
  sendMail: typeof sendMailFn;
  newId: () => string;
  env: Env;
  /** The server's date as yyyy-mm-dd; the machine's by default. */
  today?: () => string;
  /** Whether a student id from the URL could be one: a uuid by default, so a malformed one answers 404 before any query. */
  validId?: (id: string) => boolean;
}

const MESSAGES = {
  "not-teacher": "Only a teacher's account can have students. Choose a Teacher plan first.",
  "bad-request": "attunr couldn't read that request. Reload the page and try again.",
  "bad-date": "The page sent a date that isn't today's. Check the device's date and time, then reload the page.",
  name: "Type your student's name.",
  email: "Type your student's email address, like ann@school.com.",
  answers: "Pick at least one area, and at least one topic in each area you pick.",
  exists: "Someone already has an account with that email address. Use another address for your student.",
  taught: "This person has already been invited by a teacher. Send us a message on the Send feedback page and we'll help you out.",
  listed: "That student is already on your list.",
  "not-found": "That student isn't on your list.",
  claimed: "Your student has already logged in, so they don't need the link.",
  wait: "A link went out a moment ago. Wait a minute, then press Send the link again.",
  daily: "attunr has sent this student 5 links today, the most it sends in a day. Press Send the link again tomorrow.",
  "mail-failed": "The email didn't go out. Wait a minute, then press Send the link again.",
  "no-answers": "Your student has no answers on file, so no plan can be made. Tell us about it on the Send feedback page.",
  "no-blocks": "The library has no exercises yet that fit your student's answers, so no plan was made.",
  busy: "Your student saved a change at the same moment, so no plan was made. Press Make next week's plan again.",
  /** `busy` after Rotate this week's plan: the same code, naming the button that was pressed */
  "busy-rotate": "Your student saved a change at the same moment, so no plan was made. Press Rotate this week's plan again.",
  "too-big": "This student's saved plans take up too much room, so no plan was made. Tell us about it on the Send feedback page.",
  gone: "This link is too old or was already used. If you have opened it before, press Log in. If not, ask your teacher to send a new link.",
  failed: "attunr couldn't do that. Try again in a moment.",
} as const;

type Code = keyof typeof MESSAGES;

const fail = (code: Code, status: number, cookies: string[] = []): Response => json({ error: MESSAGES[code], code }, status, cookies);

/** Limit and extras used this month: 409 `limit`, the line naming the plan's numbers. */
const full = (r: { limit: number; extra: number }, cookies: string[]): Response => json({ error: fullLine(r.limit, r.extra), code: "limit" }, 409, cookies);

const FORBIDDEN = "That request didn't come from this site. Reload the page and try again.";
const AUTH: Record<number, { code: string; error: string }> = {
  503: { code: "no-accounts", error: NO_ACCOUNTS },
  403: { code: "forbidden", error: FORBIDDEN },
  401: { code: "logged-out", error: LOGGED_OUT_WORDS },
  409: { code: "account-changed", error: ACCOUNT_CHANGED_WORDS },
};

/** `signedIn`'s own answers carry no `code` and a raw line: give each a code and a sentence, keeping the status and the cookies. */
async function withCode(res: Response): Promise<Response> {
  const a = AUTH[res.status] ?? { code: "failed", error: MESSAGES.failed };
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  headers.delete("content-type");
  return Response.json(a, { status: res.status, headers });
}

const isUuid = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** The signed-in teacher, or the answer to send. */
async function teacher(h: StudentsHttpDeps, req: Request): Promise<{ account: Account; cookies: string[] } | Response> {
  const me = await signedIn(req, h.auth);
  if (me instanceof Response) return withCode(me);
  if (!can(me.account, "students")) return fail("not-teacher", 403, me.cookies);
  return me;
}

const serverToday = (h: StudentsHttpDeps): string => (h.today ?? (() => localDate()))();

function unexpected(what: string, error: unknown, cookies: string[]): Response {
  console.error(`[students] ${what} failed`, error);
  return fail("failed", 500, cookies);
}

/** Mails the claim link. In development with no mail the link goes to the console, as the log-in link does. */
async function mailClaim(h: StudentsHttpDeps, req: Request, to: { email: string; name: string }, teacherName: string, token: string): Promise<"sent" | "off" | "failed"> {
  const link = claimUrl(baseUrl(req, h.env), token);
  const dev = devOnly({ NODE_ENV: h.env.NODE_ENV });
  try {
    const sent = await h.sendMail(claimEmail(to.email, to.name, teacherName, link, h.env), h.env);
    if (sent === "off" && dev) console.log(`[students] no RESEND_API_KEY, claim link for ${to.email}: ${link}`);
    return sent;
  } catch (error) {
    console.error(`[students] the claim email to ${to.email} was not sent: ${error instanceof Error ? error.message : String(error)}`);
    if (dev) console.log(`[students] development, claim link for ${to.email}: ${link}`);
    return "failed";
  }
}

/** GET /api/students?today=yyyy-mm-dd */
export async function listRoute(h: StudentsHttpDeps, req: Request): Promise<Response> {
  const me = await teacher(h, req);
  if (me instanceof Response) return me;
  const today = new URL(req.url).searchParams.get("today");
  if (!isNearToday(today, serverToday(h))) return fail("bad-date", 400, me.cookies);
  try {
    return json(await listStudents(h, me.account, today), 200, me.cookies);
  } catch (error) {
    return unexpected("list", error, me.cookies);
  }
}

/** POST /api/students: add, make the first week, mail the link. The student stays whatever happens after the add. */
export async function addRoute(h: StudentsHttpDeps, req: Request): Promise<Response> {
  const me = await teacher(h, req);
  if (me instanceof Response) return me;
  const body = await readJson(req);
  if (!body) return fail("bad-request", 400, me.cookies);
  const today = body.today;
  if (!isNearToday(today, serverToday(h))) return fail("bad-date", 400, me.cookies);

  let added;
  try {
    added = await addStudent(h, me.account, { name: body.name, email: body.email, answers: body.answers, today });
  } catch (error) {
    return unexpected("add", error, me.cookies);
  }
  if (!added.ok) {
    if (added.error === "limit") return full(added, me.cookies);
    const status = added.error === "exists" || added.error === "taught" || added.error === "listed" ? 409 : added.error === "not-teacher" ? 403 : 400;
    return fail(added.error, status, me.cookies);
  }
  const now = h.auth.now();
  const student = studentRow({ id: added.studentId, name: cleanName(body.name), email: cleanEmail(body.email as string) }, now, null);

  let plan: "made" | "short" | "none" = "none";
  try {
    const made = await makeWeek(h, me.account, added.studentId, { today, rotate: false, ...(Array.isArray(body.days) ? { days: body.days as number[] } : {}) }, now, h.newId);
    if (made.ok) plan = made.short ? "short" : "made";
  } catch (error) {
    console.error("[students] the first week failed", error);
  }
  const mail = await mailClaim(h, req, student, me.account.name, added.claimToken);
  return json({ student, plan, mail }, 200, me.cookies);
}

/** GET /api/students/<id>?today=yyyy-mm-dd */
export async function viewRoute(h: StudentsHttpDeps, req: Request, id: string): Promise<Response> {
  const me = await teacher(h, req);
  if (me instanceof Response) return me;
  if (!(h.validId ?? isUuid)(id)) return fail("not-found", 404, me.cookies);
  const today = new URL(req.url).searchParams.get("today");
  if (!isNearToday(today, serverToday(h))) return fail("bad-date", 400, me.cookies);
  try {
    const view = await studentView(h, me.account, id, today);
    return view.ok ? json(view, 200, me.cookies) : fail("not-found", 404, me.cookies);
  } catch (error) {
    return unexpected("view", error, me.cookies);
  }
}

/** POST /api/students/<id>/claim-link */
export async function claimLinkRoute(h: StudentsHttpDeps, req: Request, id: string): Promise<Response> {
  const me = await teacher(h, req);
  if (me instanceof Response) return me;
  if (!(h.validId ?? isUuid)(id)) return fail("not-found", 404, me.cookies);
  try {
    const link = await newClaimLink(h, me.account, id);
    if (!link.ok && link.error === "wait") return json({ error: MESSAGES.wait, code: "wait", waitSeconds: Math.max(1, Math.ceil(link.waitMs / 1000)) }, 429, me.cookies);
    if (!link.ok) return fail(link.error, link.error === "not-found" ? 404 : link.error === "daily" ? 429 : 409, me.cookies);
    const mail = await mailClaim(h, req, link, me.account.name, link.claimToken);
    return mail === "failed" ? fail("mail-failed", 502, me.cookies) : json({ mail }, 200, me.cookies);
  } catch (error) {
    return unexpected("claim link", error, me.cookies);
  }
}

/** POST /api/students/<id>/plan { today, rotate, scores, comment, days } */
export async function planRoute(h: StudentsHttpDeps, req: Request, id: string): Promise<Response> {
  const me = await teacher(h, req);
  if (me instanceof Response) return me;
  if (!(h.validId ?? isUuid)(id)) return fail("not-found", 404, me.cookies);
  const body = await readJson(req);
  if (!body) return fail("bad-request", 400, me.cookies);
  if (!isNearToday(body.today, serverToday(h))) return fail("bad-date", 400, me.cookies);
  const scores = body.scores && typeof body.scores === "object" && !Array.isArray(body.scores) ? (body.scores as Record<string, number>) : undefined;
  try {
    const made = await makeWeek(h, me.account, id, { today: body.today, rotate: body.rotate === true, scores, comment: typeof body.comment === "string" ? body.comment : undefined, ...(Array.isArray(body.days) ? { days: body.days as number[] } : {}) }, h.auth.now(), h.newId);
    if (made.ok) return json({ planId: made.planId, start: made.start, short: made.short, comment: made.comment }, 200, me.cookies);
    if (made.error === "limit") return full(made, me.cookies);
    if (made.error === "busy" && body.rotate === true) return json({ error: MESSAGES["busy-rotate"], code: "busy" }, 409, me.cookies);
    const status = made.error === "not-found" ? 404 : made.error === "too-big" ? 413 : 409;
    return fail(made.error, status, me.cookies);
  } catch (error) {
    return unexpected("plan", error, me.cookies);
  }
}

/** GET /api/auth/claim?token=: whose link it is, spending nothing (an email scanner's GET must not use it). */
export async function claimPeekRoute(h: StudentsHttpDeps, req: Request): Promise<Response> {
  try {
    const who = await peekClaim(h.auth, new URL(req.url).searchParams.get("token"));
    return who ? json(who) : fail("gone", 410);
  } catch (error) {
    return unexpected("claim peek", error, []);
  }
}

/** POST /api/auth/claim { token }: spends the link and signs the student in. Used signed out. */
export async function claimOpenRoute(h: StudentsHttpDeps, req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: FORBIDDEN, code: "forbidden" }, 403);
  const body = await readJson(req);
  if (!body) return fail("bad-request", 400);
  try {
    const result = await openClaim(h.auth, body.token, req.headers.get("user-agent"));
    if (!result) return fail("gone", 410);
    return json({ next: safeNext(result.next) ?? "/welcome" }, 200, resultCookies(result, h.env));
  } catch (error) {
    return unexpected("claim", error, []);
  }
}
