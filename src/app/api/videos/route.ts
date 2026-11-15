import { del, head } from "@vercel/blob";
import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { completeUpload, listMine, type BlobLookup } from "@/features/videos/server/access";
import { NO_VIDEO_STORE } from "@/features/videos/server/words";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in player's videos, newest first: { videos }. */
export async function GET(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  return json({ videos: await listMine(store.repo, me.account.id) }, 200, me.cookies);
}

/** After an upload finished: JSON { id, title, type, seconds, width, height, path }. Checks the path is the player's own and the file is in the private store (a public one is deleted and refused), then saves the row: { video }. */
export async function POST(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const token = blobToken(process.env);
  if (!token) return json({ error: NO_VIDEO_STORE }, 503, me.cookies);
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
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
  const done = await completeUpload(store.repo, me.account.id, await readJson(req), blobs, new Date());
  if (!done.ok) return json({ error: done.error }, done.status, me.cookies);
  return json({ video: done.video }, 200, me.cookies);
}
