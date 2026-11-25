import { permissionGate } from "@/features/devtools/server/access";
import { joinHref } from "@/features/account/loginGuard";
import { auth, json, readJson, sameOrigin } from "@/features/account/server/http";
import { SITE_URL } from "@/lib/site";
import { listInvites, makeInvite } from "@/features/account/server/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_DB = "No database: set DATABASE_URL.";

/**
 * Where the link points. The invite lives in the database this server uses: a local one (Docker, a scratch Postgres)
 * links to this server, any other (the release database, as in the usual .env.local) to the public site, so a link made
 * on a laptop's /admin works for the teacher who gets it.
 */
const linkBase = (req: Request): string => {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "";
    }
  })();
  return host === "localhost" || host === "127.0.0.1" ? new URL(req.url).origin : SITE_URL;
};

/** /admin/invites (development, or the admin permission): every invite, newest first, with its `link` (null when it was made before tokens were kept). */
export async function GET(req: Request) {
  const gate = await permissionGate(req, "admin");
  if (gate) return gate;
  const deps = auth();
  if (!deps) return json({ error: NO_DB }, 503);
  const base = linkBase(req);
  const invites = (await listInvites(deps)).map(({ token, ...invite }) => ({ ...invite, link: token ? `${base}${joinHref(token)}` : null }));
  return json({ invites });
}

/** A new invite: JSON `{ note, kind }`, kind "teacher" (Teacher Demo, the default) or "personal" (Personal Demo). Answers `{ invite, link }`. */
export async function POST(req: Request) {
  const gate = await permissionGate(req, "admin");
  if (gate) return gate;
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const deps = auth();
  if (!deps) return json({ error: NO_DB }, 503);
  const body = await readJson(req);
  const { token, invite } = await makeInvite(deps, body?.note, body?.kind);
  return json({ invite, link: `${linkBase(req)}${joinHref(token)}` });
}

/** Deletes an invite: `?id=<id>`. Whoever joined with it keeps their plan. */
export async function DELETE(req: Request) {
  const gate = await permissionGate(req, "admin");
  if (gate) return gate;
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const deps = auth();
  if (!deps) return json({ error: NO_DB }, 503);
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Not found." }, 404);
  await deps.repo.deleteInvite(id);
  return json({ ok: true });
}
