import type { UserDataRepo, VideoRow } from "@/features/userData/server/repo";
import { cleanTitle } from "../ref";
import { MAX_TAKE_SECONDS } from "../recording";
import { checkUpload, isPrivateBlobUrl, isVideoId, ownsPath, videoPath } from "./rules";

/**
 * Who may do what with a video, over the repo. The routes in src/app/api/videos read the request, find the signed-in person and
 * call these; the user id always comes from the session. No Request, no SQL, no Blob SDK here (the Blob lookups are passed in).
 */

/** A video as the browser sees it: no owner, no store path. */
export interface VideoInfo {
  id: string;
  title: string;
  type: string;
  seconds: number;
  width: number;
  height: number;
  size: number;
  savedAt: number;
}

export type Refused = { ok: false; status: number; error: string };

const refuse = (status: number, error: string): Refused => ({ ok: false, status, error });
const BAD = "Bad request.";
const NOT_YOURS = "This upload isn't in your account.";
const TAKEN = "This video is already saved.";

export const videoInfo = (v: VideoRow): VideoInfo => ({ id: v.id, title: v.title, type: v.type, seconds: v.seconds, width: v.width, height: v.height, size: v.size, savedAt: v.createdAt.getTime() });

/** The content types the upload token allows: the recorded type, and its plain form without codecs. */
const allowedTypes = (type: string): string[] => [...new Set([type, type.split(";")[0]])];

/**
 * Before the store hands out an upload token. `clientPayload` is the JSON `{ id, type, size }` the browser sent with `upload()`, and
 * `pathname` must be exactly that video's place in this user's own folder. A taken id is a 409, so no one starts an upload that
 * can't be saved.
 */
export async function planUpload(repo: UserDataRepo, userId: string, pathname: string, clientPayload: string | null): Promise<{ ok: true; allowedContentTypes: string[] } | Refused> {
  let p: Record<string, unknown>;
  try {
    const raw: unknown = JSON.parse(clientPayload ?? "");
    if (!raw || typeof raw !== "object") return refuse(400, BAD);
    p = raw as Record<string, unknown>;
  } catch {
    return refuse(400, BAD);
  }
  const check = checkUpload({ id: p.id, type: p.type, size: p.size });
  if (!check.ok) return refuse(400, check.error);
  const id = p.id as string;
  const type = p.type as string;
  if (!ownsPath(userId, pathname) || pathname !== videoPath(userId, id, type)) return refuse(403, NOT_YOURS);
  if (await repo.getVideo(id)) return refuse(409, TAKEN);
  return { ok: true, allowedContentTypes: allowedTypes(type) };
}

const whole = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null);

/**
 * After the browser's upload finished: `{ id, title, type, seconds, width, height, path }`. The path must be this user's own place
 * for the id; `blobs.find(path)` (Blob's `head`) must find the file, and its size is the one stored. A blob that isn't in the private
 * store (the browser chose `access: "public"`) is deleted with `blobs.drop` and refused, so no one keeps a public URL. A taken id is a 409.
 */
export interface BlobLookup {
  /** The stored file's size and URL, or null when there is none. */
  find(path: string): Promise<{ size: number; url: string } | null>;
  /** Deletes the file. */
  drop(path: string): Promise<void>;
}

export async function completeUpload(repo: UserDataRepo, userId: string, raw: unknown, blobs: BlobLookup, now: Date): Promise<{ ok: true; video: VideoInfo } | Refused> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return refuse(400, BAD);
  const b = raw as Record<string, unknown>;
  const first = checkUpload({ id: b.id, type: b.type, size: 1 });
  if (!first.ok) return refuse(400, first.error);
  const id = b.id as string;
  const type = b.type as string;
  if (typeof b.path !== "string" || !ownsPath(userId, b.path) || b.path !== videoPath(userId, id, type)) return refuse(403, NOT_YOURS);
  const seconds = whole(b.seconds, MAX_TAKE_SECONDS + 60);
  const width = whole(b.width, 10000);
  const height = whole(b.height, 10000);
  if (seconds === null || width === null || height === null) return refuse(400, BAD);
  const found = await blobs.find(b.path);
  if (!found) return refuse(400, "The upload didn't finish. Try again.");
  if (!isPrivateBlobUrl(found.url)) {
    await blobs.drop(b.path).catch((e: unknown) => console.error(`videos: public blob ${b.path} not deleted`, e));
    return refuse(400, "This upload wasn't private, so it was deleted. Upload it again.");
  }
  const size = found.size;
  const sized = checkUpload({ id, type, size });
  if (!sized.ok) return refuse(400, sized.error);
  const row: VideoRow = { id, userId, title: cleanTitle(b.title), type, seconds, width, height, size, blobPath: b.path, createdAt: now };
  if (!(await repo.createVideo(row))) return refuse(409, TAKEN);
  return { ok: true, video: videoInfo(row) };
}

/** The user's own videos, newest first. */
export const listMine = async (repo: UserDataRepo, userId: string): Promise<VideoInfo[]> => (await repo.listVideos(userId)).map(videoInfo);

/** Renames the user's own video; null when they have none with this id. */
export async function renameMine(repo: UserDataRepo, userId: string, id: string, title: unknown): Promise<VideoInfo | null> {
  if (!isVideoId(id)) return null;
  const row = await repo.renameVideo(userId, id, cleanTitle(title));
  return row ? videoInfo(row) : null;
}

/** Removes the user's own video row and returns it, so the route can delete its file; null when they have none with this id. */
export async function deleteMine(repo: UserDataRepo, userId: string, id: string): Promise<VideoRow | null> {
  return isVideoId(id) ? repo.deleteVideo(userId, id) : null;
}

/** The video when this viewer (null: a visitor) may watch it, else null. The file route answers 404 for null, never 403. */
export async function watch(repo: UserDataRepo, viewerId: string | null, id: string): Promise<VideoRow | null> {
  return isVideoId(id) ? repo.canWatch(viewerId, id) : null;
}
