import type { Account } from "@/features/account/model";
import type { AuthDeps } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, requestAccount, sameOrigin } from "@/features/account/server/http";
import { ACCOUNT_HEADER } from "@/features/account/serverAccountStore";
import { getDb } from "@/lib/db/client";
import { drizzleUserDataRepo } from "./repo.drizzle";
import type { UserDataRepo } from "./repo";

const LOGGED_OUT = "You are logged out. Log in and try again.";


/** The player's data over the database, or null when the site has none. */
export function userData(env: Record<string, string | undefined> = process.env): { repo: UserDataRepo } | null {
  const db = getDb(env);
  return db ? { repo: drizzleUserDataRepo(db) } : null;
}

/**
 * The signed-in account of a request, or the answer to send instead: 503 without a database, 403 for a changing
 * request another site made a browser send, 401 without a session, 409 `account-changed` when the request names (in
 * `X-Account-Id`) another account than the session's: a tab still open from before someone else logged in, which must
 * not write its account's data into theirs. Without the header the request is let through (curl, tests); every app
 * client sends it. A GET needs a session but not the Origin check: another site's page can't read its answer. Pass
 * `deps` to answer over other storage (tests).
 */
export async function signedIn(req: Request, deps: AuthDeps | null = auth()): Promise<{ account: Account; cookies: string[] } | Response> {
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const { account, cookies } = await requestAccount(deps, req);
  if (!account) return json({ error: LOGGED_OUT }, 401, cookies);
  const named = req.headers.get(ACCOUNT_HEADER);
  if (named !== null && named !== account.id) return json({ error: "account-changed" }, 409, cookies);
  return { account, cookies };
}
