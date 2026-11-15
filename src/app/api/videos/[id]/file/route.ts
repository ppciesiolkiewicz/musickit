import { get } from "@vercel/blob";
import { auth, requestAccount } from "@/features/account/server/http";
import { userData } from "@/features/userData/server/http";
import { watch } from "@/features/videos/server/access";
import { blobRangeHeaders, failedStream, streamAnswer } from "@/features/videos/server/stream";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A video's file from the private store, for a `<video>` to play and seek: the Range header goes to Blob and its 200 or 206 comes back.
 * Checked on every request (`watch`). Anyone who may not watch it, or a site without a database or a store, gets 404, never 403,
 * so an id is never confirmed.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const deps = auth();
  const store = userData();
  const token = blobToken(process.env);
  if (!deps || !store || !token) return streamAnswer(null);
  const { account, cookies } = await requestAccount(deps, req);
  const video = await watch(store.repo, account?.id ?? null, id);
  if (!video) return withCookies(streamAnswer(null), cookies);
  try {
    const read = await get(video.blobPath, { access: "private", token, headers: blobRangeHeaders(req.headers.get("range")) });
    return withCookies(streamAnswer(read), cookies);
  } catch (e) {
    return withCookies(failedStream(e), cookies);
  }
}

/** The session cookies to send back (a renewed session, or the clearing ones when it is gone). */
function withCookies(res: Response, cookies: string[]): Response {
  for (const c of cookies) res.headers.append("set-cookie", c);
  return res;
}
