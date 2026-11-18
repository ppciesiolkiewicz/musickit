import { setUpAccount } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson } from "@/features/account/server/http";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /account/setup, a new account's first page: JSON { name, planId, billing, emailUpdates, acceptTerms } sets them at once; acceptTerms must be true. No payment during the beta.
 * Answers the account, whose role may have changed with the plan.
 */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const body = await readJson(req);
  const result = await setUpAccount(deps, me.account, { name: body?.name, planId: body?.planId, billing: body?.billing, emailUpdates: body?.emailUpdates, acceptTerms: body?.acceptTerms });
  if (result.ok) return json({ ok: true, account: result.account }, 200, me.cookies);
  if (result.error === "name") return json({ error: "Please type your name.", field: "name" }, 400, me.cookies);
  if (result.error === "terms") return json({ error: "Please agree to the terms of use.", field: "terms" }, 400, me.cookies);
  return json({ error: "That plan can't be chosen. Reload the page to see the plans you can choose.", field: "plan" }, 400, me.cookies);
}
