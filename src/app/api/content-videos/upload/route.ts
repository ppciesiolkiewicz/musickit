import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { planContentUpload } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { permissionCheck } from "@/features/devtools/server/access";
import { MAX_VIDEO_BYTES } from "@/features/videos/server/rules";
import { NO_VIDEO_STORE } from "@/features/videos/server/words";
import { blobToken } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The token for a browser upload of a content video (`upload()` from `@vercel/blob/client`, `handleUploadUrl:
 * "/api/content-videos/upload"`, `clientPayload` `{ id, type, size, madeFor }`). Needs the `content` permission and an account;
 * only `content/videos/<madeFor>/<id>.<ext>`, only WebM or MP4 up to 1 GB, never over an existing file. The row is written by
 * `POST /api/content-videos` afterwards.
 */
export async function POST(req: Request) {
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  if (!gate.account) return json({ error: "Log in to save a video." }, 401);
  const token = blobToken(process.env);
  if (!token) return json({ error: NO_VIDEO_STORE }, 503);
  const store = contentVideos();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  const body = (await readJson(req)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token" || !body.payload || typeof body.payload.pathname !== "string") return json({ error: "Bad request." }, 400);
  const plan = await planContentUpload(store.repo, body.payload.pathname, body.payload.clientPayload);
  if (!plan.ok) return json({ error: plan.error }, plan.status);
  try {
    const out = await handleUpload({
      token,
      request: req,
      body,
      onBeforeGenerateToken: async () => ({ allowedContentTypes: plan.allowedContentTypes, maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: false, allowOverwrite: false, tokenPayload: null }),
    });
    return json(out);
  } catch (e) {
    console.error("content-videos/upload: token failed", e);
    return json({ error: "The upload could not start. Try again." }, 502);
  }
}
