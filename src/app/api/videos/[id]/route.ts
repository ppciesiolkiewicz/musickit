import { del } from "@vercel/blob";
import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { deleteMine, renameMine } from "@/features/videos/server/access";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Rename the player's own video: JSON { title }. Another person's video, or none, is a 404. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || typeof body.title !== "string") return json({ error: "Send { title }." }, 400, me.cookies);
  const video = await renameMine(store.repo, me.account.id, id, body.title);
  if (!video) return json({ error: "Not found." }, 404, me.cookies);
  return json({ video }, 200, me.cookies);
}

/** Delete the player's own video: the row, then the file. A file that can't be deleted is logged; the video is gone for the player either way. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const gone = await deleteMine(store.repo, me.account.id, id);
  if (!gone) return json({ error: "Not found." }, 404, me.cookies);
  const token = blobToken(process.env);
  try {
    if (!token) throw new Error("no Blob token");
    await del(gone.blobPath, { token });
  } catch (e) {
    console.error(`videos: row ${gone.id} deleted, file ${gone.blobPath} not`, e);
  }
  return json({ ok: true }, 200, me.cookies);
}
