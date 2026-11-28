import type { Account } from "../model";
import type { AuthDeps } from "./auth";
import type { UserFootprint } from "./repo";

export type AdminDeleteError = "self" | "missing";

/**
 * What deleting the account would take, for the question on /admin/admin/users. An admin can't delete their own account
 * here (`self`). `actor` is null in development with nobody signed in. Who may call
 * this at all is the route's gate (`permissionCheck(req, "admin")`).
 */
export async function previewDelete(deps: AuthDeps, actor: Account | null, userId: string): Promise<{ ok: true; footprint: UserFootprint } | { ok: false; error: AdminDeleteError }> {
  if (actor?.id === userId) return { ok: false, error: "self" };
  const footprint = await deps.repo.userFootprint(userId);
  return footprint ? { ok: true, footprint } : { ok: false, error: "missing" };
}

/**
 * Deletes the account and everything of theirs, the invites they joined with included (`purgeUser`). Their video files
 * are the route's to delete, after this, from paths it read before.
 */
export async function adminDeleteUser(deps: AuthDeps, actor: Account | null, userId: string): Promise<{ ok: true } | { ok: false; error: AdminDeleteError }> {
  if (actor?.id === userId) return { ok: false, error: "self" };
  return (await deps.repo.purgeUser(userId)) ? { ok: true } : { ok: false, error: "missing" };
}
