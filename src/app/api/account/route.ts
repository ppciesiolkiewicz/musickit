import { rename } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson, requestAccount, sameOrigin, signOutCookies } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGGED_OUT = "You are logged out. Log in and try again.";

/** Change the signed-in account's name: JSON { name }. */
export async function PATCH(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const { account, cookies } = await requestAccount(deps, req);
  if (!account) return json({ error: LOGGED_OUT }, 401, cookies);
  const body = await readJson(req);
  const renamed = await rename(deps, account.id, body?.name);
  if (!renamed) return json({ error: "Type your name.", field: "name" }, 400, cookies);
  return json({ ok: true, account: renamed }, 200, cookies);
}

/** Delete the signed-in account, with its sessions. */
export async function DELETE(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const { account, cookies } = await requestAccount(deps, req);
  if (!account) return json({ error: LOGGED_OUT }, 401, cookies);
  await deps.repo.deleteUser(account.id);
  return json({ ok: true }, 200, signOutCookies());
}
