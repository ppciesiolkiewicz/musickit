import { del } from "@vercel/blob";
import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { deleteContentVideo, editContentVideo } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { permissionCheck } from "@/features/devtools/server/access";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Change a content video's title or note: JSON { title?, note? }; one left out stays. No such video is a 404. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  const store = contentVideos();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  const body = await readJson(req);
  if (!body || (body.title !== undefined && typeof body.title !== "string") || (body.note !== undefined && typeof body.note !== "string")) return json({ error: "Send { title, note }." }, 400);
  const video = await editContentVideo(store.repo, id, body);
  if (!video) return json({ error: "Not found." }, 404);
  return json({ video });
}

/** Delete a content video the tool and the exercises no longer show: the row, then the file. A file that can't be deleted is logged; the answer stays 200. Still shown: 409 { error, pointers }. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  const store = contentVideos();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  const out = await deleteContentVideo(store.repo, id);
  if (!out) return json({ error: "Not found." }, 404);
  if (!out.ok) return json({ error: out.error, pointers: out.pointers }, out.status);
  const token = blobToken(process.env);
  try {
    if (!token) throw new Error("no Blob token");
    await del(out.row.blobPath, { token });
  } catch (e) {
    console.error(`content-videos: row ${out.row.id} deleted, file ${out.row.blobPath} not`, e);
  }
  return json({ ok: true });
}
