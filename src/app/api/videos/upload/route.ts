import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { planUpload } from "@/features/videos/server/access";
import { MAX_VIDEO_BYTES } from "@/features/videos/server/rules";
import { NO_VIDEO_STORE } from "@/features/videos/server/words";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The token for a browser upload (`upload()` from `@vercel/blob/client`, `handleUploadUrl: "/api/videos/upload"`, `clientPayload`
 * `{ id, type, size }`). Only a signed-in person, only their own `videos/<userId>/<id>.<ext>`, only WebM or MP4 up to 1 GB, and never
 * over an existing file. The row is written by `POST /api/videos` afterwards, not by Blob's completion webhook (it can't reach localhost).
 */
export async function POST(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const token = blobToken(process.env);
  if (!token) return json({ error: NO_VIDEO_STORE }, 503, me.cookies);
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = (await readJson(req)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token" || !body.payload || typeof body.payload.pathname !== "string") return json({ error: "Bad request." }, 400, me.cookies);
  const plan = await planUpload(store.repo, me.account.id, body.payload.pathname, body.payload.clientPayload);
  if (!plan.ok) return json({ error: plan.error }, plan.status, me.cookies);
  try {
    const out = await handleUpload({
      token,
      request: req,
      body,
      onBeforeGenerateToken: async () => ({ allowedContentTypes: plan.allowedContentTypes, maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: false, allowOverwrite: false, tokenPayload: null }),
    });
    return json(out, 200, me.cookies);
  } catch (e) {
    console.error("videos/upload: token failed", e);
    return json({ error: "The upload could not start. Try again." }, 502, me.cookies);
  }
}
