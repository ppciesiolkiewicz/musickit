import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { readNoteShare } from "@/features/userData/server/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** A live note link, for anyone with no login: { note, sharedAt }. Never the owner. A stopped, unknown or plan link is 404. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  const share = await readNoteShare(store.repo, id);
  if (!share) return json({ error: "Not found." }, 404);
  return json(share);
}

/** Stops the signed-in person's own live link. Anyone else's, a stopped one or none is 404. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  if (!(await store.repo.stopShare(me.account.id, id, new Date()))) return json({ error: "Not found." }, 404, me.cookies);
  return json({ ok: true }, 200, me.cookies);
}
