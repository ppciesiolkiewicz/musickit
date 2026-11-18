import { del } from "@vercel/blob";
import { rename, setEmailUpdates } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson, signOutCookies } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { devOnly } from "@/features/devtools/gate";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Change the signed-in account's name, JSON { name }, or the emails about what we fix and add, JSON { emailUpdates }. Like every changing route it goes through `signedIn`: 503 without
 * accounts, 403 from another site, 401 logged out, 409 `account-changed` when `X-Account-Id` names another account.
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

/**
 * Development only for now: a 404 in production, where /account shows no Delete account.
 * Delete the signed-in account: its video paths are read first, then the user row is deleted (the database cascades its
 * sessions, data, shares and videos), then the files. A failed delete strands no file without its row; a file that can't
 * be deleted is logged, and the account is gone either way.
 */
export async function DELETE(req: Request) {
  if (!devOnly()) return json({ error: "Not found" }, 404);
  const deps = auth();
  // a tab still open from before someone else logged in names its own account: 409, so it never deletes theirs
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const { account } = me;
  const store = userData();
  const blobPaths = store ? await store.repo.videoPaths(account.id) : [];
  await deps.repo.deleteUser(account.id);
  if (blobPaths.length) {
    const token = blobToken(process.env);
    try {
      if (!token) throw new Error("no Blob token");
      await del(blobPaths, { token });
    } catch (e) {
      console.error(`account: ${account.id} deleted, ${blobPaths.length} video file(s) not`, e);
    }
  }
  return json({ ok: true }, 200, signOutCookies());
}
