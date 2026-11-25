import { cookies } from "next/headers";
import { hasPermission, PERMISSIONS, type Account, type Permission } from "@/features/account/model";
import { sessionAccount } from "@/features/account/server/auth";
import { auth, requestAccount, sameOrigin, SESSION_COOKIE } from "@/features/account/server/http";
import { devOnly } from "../gate";

/**
 * Who may open a page for building or running the app and call its routes: anyone in development, and in production a
 * signed-in account with the page's permission (`dev` for /dev and /api/dev, `content` for /admin/content and the /api/dev routes its pages call, `admin` for /admin/admin and /api/admin; see
 * `PERMISSIONS` in features/account/model.ts). Everyone else gets a 404, as if the page weren't there. `account` is
 * only asked in production; a failure to find it (no database, a broken session) counts as nobody.
 */
export type Needs = Permission | readonly Permission[];

const wanted = (p: Needs): readonly Permission[] => (typeof p === "string" ? [p] : p);

export async function permitted(p: Needs, account: () => Promise<Account | null>, dev: boolean = devOnly()): Promise<boolean> {
  if (dev) return true;
  try {
    const a = await account();
    return wanted(p).some((one) => hasPermission(a, one));
  } catch (e) {
    console.error(`[access] could not check for the ${wanted(p).join(" or ")} permission`, e);
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
export const permissionPage = (p: Needs): Promise<boolean> => permitted(p, viewerAccount);

const notFound = () => new Response("Not found", { status: 404 });

/** What the viewer may open: all three in development, else their `permissions` ([] for nobody or a failed look-up). */
export async function openPermissions(dev: boolean = devOnly(), account: () => Promise<Account | null> = viewerAccount): Promise<Permission[]> {
  if (dev) return [...PERMISSIONS];
  try {
    return [...((await account())?.permissions ?? [])];
  } catch (e) {
    console.error("[access] could not read the permissions", e);
    return [];
  }
}

/**
 * Like `permissionGate`, but says who it let in. In development the session is still read, so a route can use the
 * account; that account is null without a session or a database.
 */
export async function permissionCheck(req: Request, p: Needs): Promise<{ ok: false; response: Response } | { ok: true; account: Account | null }> {
  const lookUp = async (): Promise<Account | null> => {
    if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return null;
    const deps = auth();
    return deps ? (await requestAccount(deps, req)).account : null;
  };
  let found: Account | null = null;
  const ok = await permitted(p, async () => (found = await lookUp()));
  if (!ok) return { ok: false, response: notFound() };
  if (devOnly() && !found) {
    try {
      found = await lookUp();
    } catch {
      found = null;
    }
  }
  return { ok: true, account: found };
}

/**
 * First line of every /api/dev and /api/admin handler: a 404 unless `permitted`, else null. In production a request
 * that isn't a GET must come from this site too (`sameOrigin`), since it carries the cookie of someone with access.
 */
export async function permissionGate(req: Request, p: Needs): Promise<Response | null> {
  const r = await permissionCheck(req, p);
  return r.ok ? null : r.response;
}
