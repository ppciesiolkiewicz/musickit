import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { writePlanTime } from "@/features/userData/server/data";
import { signedIn, userData } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The day timer's seconds for one day of the current plan, written into the stored plan: JSON { time: { planId, day, elapsed, spent } }. */
export async function PUT(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || !(await writePlanTime(store.repo, me.account.id, body.time, new Date()))) return json({ error: "Send { time }." }, 400, me.cookies);
  return json({ ok: true }, 200, me.cookies);
}
