import { cookies } from "next/headers";
import { hasPermission, type Account, type Permission } from "@/features/account/model";
import { sessionAccount } from "@/features/account/server/auth";
import { auth, requestAccount, sameOrigin, SESSION_COOKIE } from "@/features/account/server/http";
import { devOnly } from "../gate";

/**
 * Who may open a page for building or running the app and call its routes: anyone in development, and in production a
 * signed-in account with the page's permission (`dev` for /dev and /api/dev, `admin` for /admin and /api/admin; see
 * `PERMISSIONS` in features/account/model.ts). Everyone else gets a 404, as if the page weren't there. `account` is
 * only asked in production; a failure to find it (no database, a broken session) counts as nobody.
 */
export async function permitted(p: Permission, account: () => Promise<Account | null>, dev: boolean = devOnly()): Promise<boolean> {
  if (dev) return true;
  try {
    return hasPermission(await account(), p);
  } catch (e) {
    console.error(`[access] could not check for the ${p} permission`, e);
    return false;
  }
}

/** The signed-in account of the page being drawn (a server component or layout), or null. A renewed session is not written back here. */
export async function viewerAccount(): Promise<Account | null> {
  const deps = auth();
  if (!deps) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return (await sessionAccount(deps, token))?.account ?? null;
}

/** For a layout: `if (!(await permissionPage("dev"))) notFound();`. */
export const permissionPage = (p: Permission): Promise<boolean> => permitted(p, viewerAccount);

const notFound = () => new Response("Not found", { status: 404 });

/**
 * First line of every /api/dev and /api/admin handler: a 404 unless `permitted`, else null. In production a request
 * that isn't a GET must come from this site too (`sameOrigin`), since it carries the cookie of someone with access.
 */
export async function permissionGate(req: Request, p: Permission): Promise<Response | null> {
  const ok = await permitted(p, async () => {
    if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return null;
    const deps = auth();
    return deps ? (await requestAccount(deps, req)).account : null;
  });
  return ok ? null : notFound();
}
