import { ACCOUNT_CHANGED_WORDS, accountHeaders, isAccountChanged } from "@/features/userData/client/accountHeader";
import type { PlanAnswers } from "@/features/plan/intake/answers";
import type { AddedStudent, ClaimMail, StudentList, StudentRow } from "./model/types";

/**
 * The page's typed calls to the students routes (`server/http.ts`). None throws: each answers `{ ok: true, … }` or
 * `{ ok: false, code, error }`, where `code` is the route's own (`exists`, `limit`, `wait`…) or one of the page's
 * (`offline`: the request never reached the server; `failed`: a timeout, a 5xx or an answer of another shape;
 * `logged-out`: a 401; `account-changed`: another account logged in since the page loaded). `error` is the line to show:
 * the route's own words when it sent some, else the page's for that code. 20 s timeout; every call sends the page's
 * account (`accountHeaders`).
 */

export type Failure = { ok: false; code: string; error: string };

const TIMEOUT_MS = 20_000;

/** The page's own words for the failures the route can't word. */
export const CLIENT_WORDS: Record<string, string> = {
  offline: "attunr can't reach the server. Check your connection, then try again.",
  failed: "attunr couldn't do that. Try again in a moment.",
  "logged-out": "You're logged out. Log in again, then reload the page.",
  "account-changed": ACCOUNT_CHANGED_WORDS,
};

const failure = (code: string, error?: unknown): Failure => ({ ok: false, code, error: typeof error === "string" && error ? error : CLIENT_WORDS[code] ?? CLIENT_WORDS.failed });

const isRow = (r: unknown): r is StudentRow => {
  const x = r as StudentRow | null;
  return !!x && typeof x.id === "string" && typeof x.name === "string" && typeof x.email === "string" && typeof x.addedAt === "string" && (x.claimedAt === null || typeof x.claimedAt === "string");
};

/** Sends one request and reads its JSON body; a failure already worded, or the status and the body. */
async function send(url: string, init: RequestInit, fetcher: typeof fetch): Promise<Failure | { status: number; body: Record<string, unknown> | null }> {
  let res: Response;
  try {
    res = await fetcher(url, { ...init, headers: accountHeaders(init.body ? { "content-type": "application/json" } : {}), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    return failure(name === "TimeoutError" || name === "AbortError" ? "failed" : "offline");
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown> | null;
  } catch {
    body = null;
  }
  if (isAccountChanged(res.status, body)) return failure("account-changed");
  if (res.status === 401) return failure("logged-out");
  if (!res.ok) return failure(typeof body?.code === "string" ? body.code : "failed", body?.error);
  return { status: res.status, body };
}

/** `GET /api/students`: the teacher's students and their plan's limit. */
export async function fetchStudents(fetcher: typeof fetch = fetch): Promise<({ ok: true } & StudentList) | Failure> {
  const r = await send("/api/students", { method: "GET" }, fetcher);
  if ("ok" in r) return r;
  const { students, limit } = r.body ?? {};
  if (!Array.isArray(students) || !students.every(isRow) || !(limit === null || typeof limit === "number")) return failure("failed");
  return { ok: true, students, limit };
}

/** `POST /api/students`: adds a student with the answers given for them; `today` is the device's date (`localDate()`). */
export async function postStudent(input: { name: string; email: string; answers: PlanAnswers; today: string }, fetcher: typeof fetch = fetch): Promise<({ ok: true } & AddedStudent) | Failure> {
  const r = await send("/api/students", { method: "POST", body: JSON.stringify(input) }, fetcher);
  if ("ok" in r) return r;
  const { student, plan, mail } = r.body ?? {};
  if (!isRow(student) || !["made", "short", "none"].includes(plan as string) || !["sent", "off", "failed"].includes(mail as string)) return failure("failed");
  return { ok: true, student, plan: plan as AddedStudent["plan"], mail: mail as ClaimMail };
}

/** `POST /api/students/<id>/claim-link`: a new link for a student who hasn't opened theirs, mailed. */
export async function postClaimLink(id: string, fetcher: typeof fetch = fetch): Promise<{ ok: true; mail: Exclude<ClaimMail, "failed"> } | Failure> {
  const r = await send(`/api/students/${encodeURIComponent(id)}/claim-link`, { method: "POST" }, fetcher);
  if ("ok" in r) return r;
  const mail = r.body?.mail;
  return mail === "sent" || mail === "off" ? { ok: true, mail } : failure("failed");
}
