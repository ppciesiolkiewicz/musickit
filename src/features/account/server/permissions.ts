import { cleanPermissions, hasPermission, type Account, type Permission } from "../model";
import type { AuthDeps } from "./auth";

export type ChangePermissions = { ok: true; permissions: Permission[] } | { ok: false; error: "bad" | "self" | "missing" };

/**
 * Sets what of /dev and /admin a person may open (/admin/admin/users). `raw` comes from the request: anything but a list of
 * known permissions is `bad` and writes nothing. An admin can't take away their own admin permission (`self`), so the
 * last admin can't lock everyone out (someone without it, in development, may change their own row); `actor` is null in development with nobody signed in. Who may call this at all is
 * the route's gate (`permissionCheck(req, "admin")`), not this.
 */
export async function changePermissions(deps: AuthDeps, actor: Account | null, userId: string, raw: unknown): Promise<ChangePermissions> {
  const permissions = cleanPermissions(raw);
  if (!permissions) return { ok: false, error: "bad" };
  if (actor?.id === userId && hasPermission(actor, "admin") && !permissions.includes("admin")) return { ok: false, error: "self" };
  const row = await deps.repo.setPermissions(userId, permissions, deps.now());
  return row ? { ok: true, permissions: row.permissions } : { ok: false, error: "missing" };
}
