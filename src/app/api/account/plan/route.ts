import { accountPlans, choosePlan } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson } from "@/features/account/server/http";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The plans the signed-in person can see, the one they are on and how they pay for it: { plans, current, billing }. */
export async function GET(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const seen = await accountPlans(deps, me.account.id);
  if (!seen) return json({ error: "This account no longer exists." }, 404, me.cookies);
  return json(seen, 200, me.cookies);
}

/** Move to another plan, or pay for the same one the other way: JSON { planId, billing: "month" | "year" }. No payment during the beta. Answers the account, whose role may have changed. */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const body = await readJson(req);
  const account = await choosePlan(deps, me.account, body?.planId, body?.billing);
  if (!account) return json({ error: "That plan can't be chosen. Reload the page to see the plans you can choose." }, 400, me.cookies);
  return json({ ok: true, account }, 200, me.cookies);
}
