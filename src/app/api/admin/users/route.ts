import { permissionGate } from "@/features/devtools/server/access";
import { auth, json, readJson, requestAccount, sameOrigin } from "@/features/account/server/http";
import { changePermissions } from "@/features/account/server/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS = { bad: 400, self: 409, missing: 404 } as const;

/**
 * /admin/users (development, or the admin permission): sets a person's permissions. JSON `{ userId, permissions }`,
 * permissions a list of "dev", "content", "admin". Answers `{ permissions }` as stored, or `{ error }`: "bad" (400, not
 * a list of known permissions), "self" (409, taking away your own admin), "missing" (404, no such user).
 */
export async function PATCH(req: Request) {
  const gate = await permissionGate(req, "admin");
  if (gate) return gate;
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const deps = auth();
  if (!deps) return json({ error: "No database: set DATABASE_URL." }, 503);
  const body = await readJson(req);
  if (typeof body?.userId !== "string" || !body.userId) return json({ error: "bad" }, 400);
  const { account } = await requestAccount(deps, req);
  const result = await changePermissions(deps, account, body.userId, body.permissions);
  return result.ok ? json({ permissions: result.permissions }) : json({ error: result.error }, STATUS[result.error]);
}
