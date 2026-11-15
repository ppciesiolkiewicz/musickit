import { videoPath } from "../recording";

export { videoPath };

/**
 * Rules for a player's videos in the private Blob store. Pure: no Request, no SQL, no Blob SDK. A video's file lives at
 * `videos/<userId>/<id>.<webm|mp4>`; the id is the UUID the browser picked when it recorded the take.
 */

/** The largest video a player can upload: 1 GB. */
export const MAX_VIDEO_BYTES = 1024 ** 3;

/** The types a video is stored as: WebM or MP4, with or without codecs. */
export const VIDEO_TYPES = /^video\/(webm|mp4)(;.*)?$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webm|mp4)$/;

/** A video id: a lower-case UUID, as `crypto.randomUUID()` gives. Checked before any query, so a bad id never reaches Postgres. */
export const isVideoId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** True only for a file directly in this user's own folder: `videos/<userId>/<uuid>.<webm|mp4>`, nothing else. */
export function ownsPath(userId: string, path: string): boolean {
  if (typeof path !== "string" || !userId) return false;
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === "videos" && parts[1] === userId && FILE.test(parts[2]);
}

export type Check = { ok: true } | { ok: false; error: string };

/** May this file be uploaded: a UUID id, a WebM or MP4 type, and a size from 1 byte to `MAX_VIDEO_BYTES`. */
export function checkUpload({ id, type, size }: { id: unknown; type: unknown; size: unknown }): Check {
  if (!isVideoId(id)) return { ok: false, error: "Bad request." };
  if (typeof type !== "string" || !VIDEO_TYPES.test(type)) return { ok: false, error: "Only WebM and MP4 videos can be uploaded." };
  if (typeof size !== "number" || !Number.isInteger(size) || size < 1) return { ok: false, error: "This video is empty. Record it again." };
  if (size > MAX_VIDEO_BYTES) return { ok: false, error: "This video is over 1 GB. Record a shorter take." };
  return { ok: true };
}

/**
 * True only for a blob in a private store: `https://<store>.private.blob.vercel-storage.com/...`. A browser upload chooses its own
 * access (the client token doesn't bind it), so the server checks the stored blob's URL before keeping a row for it.
 */
export function isPrivateBlobUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password && /^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}
