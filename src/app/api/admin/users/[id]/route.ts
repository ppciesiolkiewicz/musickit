import { del } from "@vercel/blob";
import { permissionCheck } from "@/features/devtools/server/access";
import { auth, json, sameOrigin } from "@/features/account/server/http";
import { adminDeleteUser, previewDelete } from "@/features/account/server/adminDelete";
import { userData } from "@/features/userData/server/http";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const STATUS = { self: 409, missing: 404 } as const;

/**
 * /admin/admin/users (development, or the admin permission): what deleting this account would take, counted.
 * Answers `{ footprint }` (`UserFootprint`), or `{ error }`: "self" (409, your own account), "missing" (404).
 */
export async function GET(req: Request, { params }: Ctx) {
  const gate = await permissionCheck(req, "admin");
  if (!gate.ok) return gate.response;
  const deps = auth();
  if (!deps) return json({ error: "No database: set DATABASE_URL." }, 503);
  const { id } = await params;
  const result = await previewDelete(deps, gate.account, id);
  return result.ok ? json({ footprint: result.footprint }) : json({ error: result.error }, STATUS[result.error]);
}

/**
 * Deletes the account and everything of theirs, the invites they joined with included. Their video paths are read
 * first, the rows deleted in one step, then the files: a file that can't be deleted is logged, the account is gone
 * either way. Answers `{ ok: true }` or `{ error }` as GET.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const gate = await permissionCheck(req, "admin");
  if (!gate.ok) return gate.response;
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const deps = auth();
  if (!deps) return json({ error: "No database: set DATABASE_URL." }, 503);
  const { id } = await params;
  const store = userData();
  const blobPaths = store ? await store.repo.videoPaths(id) : [];
  const result = await adminDeleteUser(deps, gate.account, id);
  if (!result.ok) return json({ error: result.error }, STATUS[result.error]);
  if (blobPaths.length) {
    const token = blobToken(process.env);
    try {
      if (!token) throw new Error("no Blob token");
      await del(blobPaths, { token });
    } catch (e) {
      console.error(`[admin/users] ${id} deleted, ${blobPaths.length} video file(s) not`, e);
    }
  }
  return json({ ok: true });
}
