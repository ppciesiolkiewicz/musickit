import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import { composeToday } from "@/features/plan/server/composeToday";
import { signedIn, userData } from "@/features/userData/server/http";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGES = {
  "no-answers": "There are no answers to make a plan from. Answer the questions on the plan page first.",
  "bad-date": "The page sent a date that isn't today's. Check the device's date and time, then reload the page.",
  "no-blocks": "The library has no exercises yet that fit your answers, so no plan was made. Change your answers to pick other areas.",
};

/** Today's plan, composed from the player's answers, ratings and the library: JSON { date, another }. Writes nothing; the page stores the day. */
export async function POST(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  const db = getDb();
  if (!store || !db) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || typeof body.date !== "string" || typeof body.another !== "boolean") return json({ error: "Send { date, another }." }, 400, me.cookies);
  try {
    const library = drizzleLibraryRepo(db);
    const answer = await composeToday({ library, userData: store.repo }, me.account.id, { date: body.date, another: body.another });
    if (!answer.ok) return json({ error: MESSAGES[answer.code], code: answer.code }, 409, me.cookies);
    return json(answer, 200, me.cookies);
  } catch (e) {
    console.error("compose failed", e);
    return json({ error: "attunr couldn't put today's plan together. Try again in a moment." }, 500, me.cookies);
  }
}
