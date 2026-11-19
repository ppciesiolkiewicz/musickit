import { cookies } from "next/headers";
import { isAdmin, type Account } from "@/features/account/model";
import { sessionAccount } from "@/features/account/server/auth";
import { auth, requestAccount, sameOrigin, SESSION_COOKIE } from "@/features/account/server/http";
import { devOnly } from "../gate";

/**
 * Who may open /dev and /admin and call /api/dev and /api/admin: anyone in development, and in production a signed-in
 * admin (`isAdmin`). Everyone else gets a 404, as if the page weren't there. `account` is only asked in production; a
 * failure to find it (no database, a broken session) counts as nobody.
 */
export async function devOrAdmin(account: () => Promise<Account | null>, dev: boolean = devOnly()): Promise<boolean> {
  if (dev) return true;
  try {
    return isAdmin(await account());
  } catch (e) {
    console.error("[access] could not check for an admin", e);
    return false;
  }
}

/** The signed-in account of the page being drawn (a server component or layout). A renewed session is not written back here. */
async function pageAccount(): Promise<Account | null> {
  const deps = auth();
  if (!deps) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return (await sessionAccount(deps, token))?.account ?? null;
}

/** For a /dev or /admin layout: `if (!(await devOrAdminPage())) notFound();`. */
export const devOrAdminPage = (): Promise<boolean> => devOrAdmin(pageAccount);

const notFound = () => new Response("Not found", { status: 404 });

/**
 * First line of every /api/dev and /api/admin handler: a 404 unless `devOrAdmin`, else null. In production a request
 * that isn't a GET must come from this site too (`sameOrigin`), since it carries an admin's cookie.
 */
export async function devOrAdminGate(req: Request): Promise<Response | null> {
  const ok = await devOrAdmin(async () => {
    if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return null;
    const deps = auth();
    return deps ? (await requestAccount(deps, req)).account : null;
  });
  return ok ? null : notFound();
}
