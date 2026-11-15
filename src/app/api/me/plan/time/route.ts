import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { readPlanTimes, writePlanTime } from "@/features/userData/server/data";
import { signedIn, userData } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The day timer's records of one plan, a day each: ?plan=<id> → { days }. */
export async function GET(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const planId = new URL(req.url).searchParams.get("plan");
  if (!planId || planId.length > 200) return json({ error: "Send ?plan=<id>." }, 400, me.cookies);
  return json({ days: await readPlanTimes(store.repo, me.account.id, planId) }, 200, me.cookies);
}

/** One day's record, replacing that day's: JSON { time: { planId, day, elapsed, spent: { <exerciseId>: seconds } } }. */
export async function PUT(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || !(await writePlanTime(store.repo, me.account.id, body.time, new Date()))) return json({ error: "Send { time }." }, 400, me.cookies);
  return json({ ok: true }, 200, me.cookies);
}
