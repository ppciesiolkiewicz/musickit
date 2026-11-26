import { readJson } from "@/features/account/server/http";
import { lookUp, readLookup } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const answer = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Which video each tool cell of the given blocks shows: JSON { blocks: [{ key, blockId?, cells: [{ cell, tool, step }] }] } answers
 * { blocks: { [key]: [{ cell, id, from, repeat }] }, videos: { [id]: { title, note, seconds, width, height, overlay } } }.
 * No session. Never cached, so a video saved now shows on the next draw.
 */
export async function POST(req: Request) {
  const asks = readLookup(await readJson(req));
  if (!asks) return answer({ error: "Send { blocks: [{ key, blockId, cells }] }." }, 400);
  const store = contentVideos();
  if (!store) return answer({ blocks: {}, videos: {} });
  try {
    return answer(await lookUp(store.repo, asks));
  } catch (e) {
    console.error("content-videos: lookup failed", e);
    return answer({ error: "The videos could not be looked up." }, 502);
  }
}
