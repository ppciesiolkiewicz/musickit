import { rename, setEmailUpdates } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson } from "@/features/account/server/http";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Change the signed-in account's name, JSON { name }, or the emails about what we fix and add, and offers, JSON { emailUpdates }. Like every changing route it goes through `signedIn`: 503 without
 * accounts, 403 from another site, 401 logged out, 409 `account-changed` when `X-Account-Id` names another account.
 *
 * There is no DELETE (user, 2026-11-28): a person asks us to delete their account with the contact form on /account, and
 * we delete it on /admin/admin/users (`DELETE /api/admin/users/[id]`), after cancelling any subscription in Stripe.
 */
export async function PATCH(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const { account, cookies } = me;
  const body = await readJson(req);
  if (body && "emailUpdates" in body) {
    const changed = await setEmailUpdates(deps, account.id, body.emailUpdates);
    if (!changed) return json({ error: "That change couldn't be saved. Reload the page and try again." }, 400, cookies);
    return json({ ok: true, account: changed }, 200, cookies);
  }
  const renamed = await rename(deps, account.id, body?.name);
  if (!renamed) return json({ error: "Please type your name.", field: "name" }, 400, cookies);
  return json({ ok: true, account: renamed }, 200, cookies);
}
