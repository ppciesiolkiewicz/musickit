import { MAX_CELLS } from "@/features/plan/model/tools";
import { cleanTitle } from "@/features/videos/ref";
import { MAX_TAKE_SECONDS } from "@/features/videos/recording";
import type { BlobLookup, Refused } from "@/features/videos/server/access";
import { checkUpload, isPrivateBlobUrl, isVideoId } from "@/features/videos/server/rules";
import { blockVideos, type CellVideo } from "../model/lookup";
import { readOverlay } from "../model/overlay";
import { toolKeyOf } from "../model/slot";
import type { CellAsk } from "../model/slot";
import type { ContentVideoRepo, ContentVideoRow, Lost, Pointers } from "./repo";
import { cleanNote, contentVideoPath, isMadeFor, readTarget } from "./rules";

/**
 * Who may do what with a content video, over the repo. The routes in src/app/api/content-videos check the `content`
 * permission and the signed-in account, then call these. No Request, no SQL, no Blob SDK here (the Blob lookups are passed in).
 */

/** A content video as the browser sees it: no store path, no author. */
export interface ContentVideoInfo {
  id: string; title: string; note: string; madeFor: string; tool: string | null; steps: string[] | null;
  type: string; seconds: number; width: number; height: number; size: number; savedAt: number; overlay: unknown | null;
}

const refuse = (status: number, error: string): Refused => ({ ok: false, status, error });
const BAD = "Bad request.";
const NOT_YOURS = "This upload isn't in your account.";
const TAKEN = "This video is already saved.";
const NO_BLOCK = "This exercise isn't in the library here yet. Run db:seed-blocks, then save again.";
const NO_CELL = "This exercise has changed and that tool isn't where it was. Reload and save again.";
export const STILL_SHOWN = "A tool or an exercise still shows this video. Take its levels off with Change levels, then delete it.";

export const contentVideoInfo = (v: ContentVideoRow): ContentVideoInfo => ({
  id: v.id, title: v.title, note: v.note, madeFor: v.madeFor, tool: v.tool, steps: v.steps ? [...v.steps] : null,
  type: v.type, seconds: v.seconds, width: v.width, height: v.height, size: v.size, savedAt: v.createdAt.getTime(), overlay: v.overlay ?? null,
});

const allowedTypes = (type: string): string[] => [...new Set([type, type.split(";")[0]])];

const objectOf = (raw: unknown): Record<string, unknown> | null => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);

/**
 * Before the store hands out an upload token. `clientPayload` is the JSON `{ id, type, size, madeFor }` the browser sent with
 * `upload()`; `pathname` must be exactly that video's place. A taken id is a 409, so no one starts an upload that can't be saved.
 */
export async function planContentUpload(repo: ContentVideoRepo, pathname: string, clientPayload: string | null): Promise<{ ok: true; allowedContentTypes: string[] } | Refused> {
  let p: Record<string, unknown> | null;
  try {
    p = objectOf(JSON.parse(clientPayload ?? ""));
  } catch {
    return refuse(400, BAD);
  }
  if (!p) return refuse(400, BAD);
  const check = checkUpload({ id: p.id, type: p.type, size: p.size });
  if (!check.ok) return refuse(400, check.error);
  if (!isMadeFor(p.madeFor)) return refuse(400, BAD);
  const id = p.id as string;
  const type = p.type as string;
  if (pathname !== contentVideoPath(p.madeFor, id, type)) return refuse(403, NOT_YOURS);
  if (await repo.get(id)) return refuse(409, TAKEN);
  return { ok: true, allowedContentTypes: allowedTypes(type) };
}

const whole = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null);

/**
 * After the browser's upload finished: `{ id, title, note, type, seconds, width, height, path, madeFor, target, overlay? }`. The path must
 * be the id's place for `madeFor`; the file must be found, and its size is the one stored. A public blob is deleted and refused.
 * An overlay (`model/overlay.ts`) must read and be for the target's tool; with none the video just plays.
 */
export async function completeContentUpload(repo: ContentVideoRepo, userId: string, raw: unknown, blobs: BlobLookup, now: Date): Promise<{ ok: true; video: ContentVideoInfo; lost: Lost[] } | Refused> {
  const b = objectOf(raw);
  if (!b) return refuse(400, BAD);
  const first = checkUpload({ id: b.id, type: b.type, size: 1 });
  if (!first.ok) return refuse(400, first.error);
  if (!isMadeFor(b.madeFor)) return refuse(400, BAD);
  const id = b.id as string;
  const type = b.type as string;
  const madeFor = b.madeFor;
  const target = readTarget(b.target, madeFor);
  if (!target) return refuse(400, BAD);
  if (typeof b.path !== "string" || b.path !== contentVideoPath(madeFor, id, type)) return refuse(403, NOT_YOURS);
  const seconds = whole(b.seconds, MAX_TAKE_SECONDS + 60);
  const width = whole(b.width, 10000);
  const height = whole(b.height, 10000);
  if (seconds === null || width === null || height === null) return refuse(400, BAD);
  const overlay = b.overlay === undefined || b.overlay === null ? null : readOverlay(b.overlay);
  if (overlay === null && b.overlay != null) return refuse(400, BAD);
  if (overlay && toolKeyOf(overlay.tool) !== target.tool) return refuse(400, BAD);
  const found = await blobs.find(b.path);
  if (!found) return refuse(400, "The upload didn't finish. Try again.");
  if (!isPrivateBlobUrl(found.url)) {
    await blobs.drop(b.path).catch((e: unknown) => console.error(`content-videos: public blob ${b.path} not deleted`, e));
    return refuse(400, "This upload wasn't private, so it was deleted. Upload it again.");
  }
  const size = found.size;
  const sized = checkUpload({ id, type, size });
  if (!sized.ok) return refuse(400, sized.error);
  const row: ContentVideoRow = {
    id, title: cleanTitle(b.title), note: cleanNote(b.note), recordedBy: userId, madeFor,
    tool: null, steps: null, type, seconds, width, height, size, blobPath: b.path, overlay, createdAt: now,
  };
  const made = await repo.create(row, target);
  if (!made.ok) return refuse(409, made.reason === "taken" ? TAKEN : made.reason === "no-block" ? NO_BLOCK : NO_CELL);
  // The row as stored: the repo gives it the target's tool and steps.
  const stored = (await repo.get(id)) ?? row;
  return { ok: true, video: contentVideoInfo(stored), lost: made.lost };
}

/** Every video, newest first. */
export const listContentVideos = async (repo: ContentVideoRepo): Promise<ContentVideoInfo[]> => (await repo.list()).map(contentVideoInfo);

/** Sets the title and the note (both trimmed); one left out of the body stays as it is. Null when no video has this id. */
export async function editContentVideo(repo: ContentVideoRepo, id: string, raw: unknown): Promise<ContentVideoInfo | null> {
  if (!isVideoId(id)) return null;
  const now = await repo.get(id);
  if (!now) return null;
  const b = objectOf(raw) ?? {};
  const title = b.title === undefined ? now.title : cleanTitle(b.title);
  const note = b.note === undefined ? now.note : cleanNote(b.note);
  const row = await repo.edit(id, { title, note });
  return row ? contentVideoInfo(row) : null;
}

const OWN_VIDEO = "This video belongs to one exercise, so it has no levels to change.";

/**
 * **Change steps**: `{ steps }`, the steps the tool video covers from now on, with the save's rule (they are taken off the
 * tool's other videos). `[]` takes every step off it, so it shows nowhere; `null` is the tool itself for a tool with no
 * ladder. The tool is the one the video was made for. Null when no video has this id.
 */
export async function retargetContentVideo(repo: ContentVideoRepo, id: string, raw: unknown): Promise<{ ok: true; video: ContentVideoInfo; lost: Lost[] } | Refused | null> {
  if (!isVideoId(id)) return null;
  const now = await repo.get(id);
  if (!now) return null;
  if (!now.madeFor.startsWith("tool:")) return refuse(409, OWN_VIDEO);
  const b = objectOf(raw);
  if (!b || !Object.hasOwn(b, "steps")) return refuse(400, BAD);
  const tool = now.madeFor.slice(5);
  let target: { tool: string; steps: string[] | null } | null = null;
  if (!(Array.isArray(b.steps) && b.steps.length === 0)) {
    const t = readTarget({ kind: "tool", tool, steps: b.steps }, now.madeFor);
    if (!t || t.kind !== "tool") return refuse(400, BAD);
    target = { tool, steps: t.steps };
  }
  const out = await repo.retarget(id, target);
  if (!out.ok) return out.reason === "no-video" ? null : refuse(409, OWN_VIDEO);
  return { ok: true, video: contentVideoInfo(out.row), lost: out.lost };
}

/** Removes the row when nothing points at it and returns it, so the route can delete its file. */
export async function deleteContentVideo(repo: ContentVideoRepo, id: string): Promise<{ ok: true; row: ContentVideoRow } | { ok: false; status: 409; error: string; pointers: Pointers } | null> {
  if (!isVideoId(id)) return null;
  const out = await repo.remove(id);
  if (!out) return null;
  return out.ok ? out : { ok: false, status: 409, error: STILL_SHOWN, pointers: out.pointers };
}

/** What a page may know of a video to play it: no store path, recorder or size. */
export interface PlayInfo { id: string; title: string; note: string; seconds: number; width: number; height: number; overlay: unknown | null }

/** An id's file never changes; a deleted video may still play from a cache for up to an hour. */
export const CONTENT_VIDEO_CACHE = "public, max-age=3600";

/** One block of a lookup: the caller's own `key` for it, the block's id when it has one, and its tool cells. */
export interface LookupAsk { key: string; blockId?: string; cells: CellAsk[] }

const MAX_BLOCKS = 60;
const short = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

/** `{ blocks: [{ key, blockId?, cells: [{ cell, tool, step }] }] }`, or null when it isn't that or is too large. */
export function readLookup(raw: unknown): LookupAsk[] | null {
  const b = objectOf(raw);
  if (!b || !Array.isArray(b.blocks) || b.blocks.length > MAX_BLOCKS) return null;
  const keys = new Set<string>();
  const out: LookupAsk[] = [];
  for (const item of b.blocks) {
    const o = objectOf(item);
    if (!o || typeof o.key !== "string" || o.key.length < 1 || o.key.length > 200 || keys.has(o.key)) return null;
    if (o.blockId !== undefined && !short(o.blockId, 200)) return null;
    if (!Array.isArray(o.cells) || o.cells.length > MAX_CELLS) return null;
    const cells: CellAsk[] = [];
    for (const c of o.cells) {
      const k = objectOf(c);
      if (!k || !Number.isInteger(k.cell) || (k.cell as number) < 0 || (k.cell as number) >= MAX_CELLS) return null;
      if (!short(k.tool, 80) || !(k.step === null || short(k.step, 80))) return null;
      cells.push({ cell: k.cell as number, tool: k.tool, step: k.step });
    }
    keys.add(o.key);
    out.push(o.blockId === undefined ? { key: o.key, cells } : { key: o.key, blockId: o.blockId, cells });
  }
  return out;
}

/** Which video each tool cell of each block shows, and the play details of those videos only. A cell whose video's row is gone is left out. */
export async function lookUp(repo: ContentVideoRepo, asks: LookupAsk[]): Promise<{ blocks: Record<string, CellVideo[]>; videos: Record<string, PlayInfo> }> {
  const blockIds = [...new Set(asks.flatMap((a) => (a.blockId === undefined ? [] : [a.blockId])))];
  const tools = [...new Set(asks.flatMap((a) => a.cells.map((c) => c.tool)))];
  const { own, rows } = await repo.forLookup(blockIds, tools);
  const byId = new Map(rows.map((r) => [r.id, r]));
  // entries, not keyed writes: a key like "__proto__" must stay an own key
  const blocks: [string, CellVideo[]][] = [];
  const videos = new Map<string, PlayInfo>();
  for (const a of asks) {
    const mine = a.blockId !== undefined && Object.hasOwn(own, a.blockId) ? own[a.blockId] : {};
    const found = blockVideos(a.cells, mine, rows).filter((v) => byId.has(v.id));
    blocks.push([a.key, found]);
    for (const v of found) {
      const r = byId.get(v.id)!;
      videos.set(v.id, { id: r.id, title: r.title, note: r.note, seconds: r.seconds, width: r.width, height: r.height, overlay: r.overlay ?? null });
    }
  }
  return { blocks: Object.fromEntries(blocks), videos: Object.fromEntries(videos) };
}
