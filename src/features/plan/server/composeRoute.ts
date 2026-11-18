import type { AuthDeps } from "@/features/account/server/auth";
import { json, readJson } from "@/features/account/server/http";
import type { LibraryRepo } from "@/features/library/server/repo";
import { signedIn } from "@/features/userData/server/http";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { composeToday } from "./composeToday";

/** What `POST /api/me/plan/compose` needs, so tests call it over memory repos and the route file only builds the real ones. */
export interface ComposeHttpDeps {
  auth: AuthDeps;
  userData: UserDataRepo;
  library: LibraryRepo;
  /** The server's date as yyyy-mm-dd; the machine's by default. */
  today?: () => string;
}

const MESSAGES = {
  "no-answers": "There are no answers to make a plan from. Answer the questions on the Practice plan page first.",
  "bad-date": "The page sent a date that isn't today's. Check the device's date and time, then reload the page.",
  "no-blocks": "The library has no exercises yet that fit your answers, so no plan was made. Change your answers to pick other areas.",
  taught: "Your teacher makes your plans, so attunr doesn't make a daily plan for you. Reload the page to see your teacher's plan.",
};

/**
 * `POST /api/me/plan/compose { date, another }`: today's plan, composed from the player's answers, ratings and the library.
 * Writes nothing; the page stores the day. A teacher's student (`Account.taught`) gets their teacher's weeks only: 409
 * `taught`, before anything is read, so a stale tab can't compose over them.
 */
export async function composeRoute(h: ComposeHttpDeps, req: Request): Promise<Response> {
  const me = await signedIn(req, h.auth);
  if (me instanceof Response) return me;
  if (me.account.taught) return json({ error: MESSAGES.taught, code: "taught" }, 409, me.cookies);
  const body = await readJson(req);
  if (!body || typeof body.date !== "string" || typeof body.another !== "boolean") return json({ error: "Send { date, another }." }, 400, me.cookies);
  try {
    const answer = await composeToday({ library: h.library, userData: h.userData, today: h.today }, me.account.id, { date: body.date, another: body.another });
    if (!answer.ok) return json({ error: MESSAGES[answer.code], code: answer.code }, 409, me.cookies);
    return json(answer, 200, me.cookies);
  } catch (e) {
    console.error("compose failed", e);
    return json({ error: "attunr couldn't put today's plan together. Try again in a moment." }, 500, me.cookies);
  }
}
