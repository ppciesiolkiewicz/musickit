import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { retargetContentVideo } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { permissionCheck } from "@/features/devtools/server/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Change levels: JSON { steps }, the steps the tool video covers from now on (taken off the tool's other videos); [] takes
 * every step off it, null is the whole tool for a tool with no ladder. Answers { video, lost }. No such video is a 404;
 * a block's own video is a 409.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  const store = contentVideos();
  if (!store) return json({ error: NO_ACCOUNTS }, 503);
  const out = await retargetContentVideo(store.repo, id, await readJson(req));
  if (!out) return json({ error: "Not found." }, 404);
  if (!out.ok) return json({ error: out.error }, out.status);
  return json({ video: out.video, lost: out.lost });
}
