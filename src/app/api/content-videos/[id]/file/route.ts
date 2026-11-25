import { get } from "@vercel/blob";
import { CONTENT_VIDEO_CACHE } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { isVideoId } from "@/features/videos/server/rules";
import { blobRangeHeaders, failedStream, streamAnswer } from "@/features/videos/server/stream";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A content video's file from the private store, for a `<video>` to play and seek (the Range header goes to Blob). Public: no
 * session, no cookies, and the answer may be cached. A bad id, an unknown video, or a site without a database or a store is a 404.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = contentVideos();
  const token = blobToken(process.env);
  if (!isVideoId(id) || !store || !token) return streamAnswer(null);
  try {
    const video = await store.repo.get(id);
    if (!video) return streamAnswer(null);
    const read = await get(video.blobPath, { access: "private", token, headers: blobRangeHeaders(req.headers.get("range")) });
    return streamAnswer(read, CONTENT_VIDEO_CACHE);
  } catch (e) {
    return failedStream(e);
  }
}
