import { del, head } from "@vercel/blob";
import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { completeContentUpload, listContentVideos } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { permissionCheck } from "@/features/devtools/server/access";
import type { BlobLookup } from "@/features/videos/server/access";
import { NO_VIDEO_STORE } from "@/features/videos/server/words";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every content video, newest first: { videos }. */
export async function GET(req: Request) {
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  const store = contentVideos();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  return json({ videos: await listContentVideos(store.repo) });
}

/** After an upload finished: JSON { id, title, note, type, seconds, width, height, path, madeFor, target }. Saves the row: { video, lost }. */
export async function POST(req: Request) {
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  if (!gate.account) return json({ error: "Log in to save a video." }, 401);
  const token = blobToken(process.env);
  if (!token) return json({ error: NO_VIDEO_STORE }, 503);
  const store = contentVideos();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  const blobs: BlobLookup = {
    async find(path) {
      try {
        const h = await head(path, { token });
        return { size: h.size, url: h.url };
      } catch {
        return null;
      }
    },
    drop: (path) => del(path, { token }),
  };
  const done = await completeContentUpload(store.repo, gate.account.id, await readJson(req), blobs, new Date());
  if (!done.ok) return json({ error: done.error }, done.status);
  return json({ video: done.video, lost: done.lost });
}
