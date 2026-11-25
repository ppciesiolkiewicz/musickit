"use client";

import type { CellVideo } from "../model/lookup";
import type { ContentVideoInfo, LookupAsk, PlayInfo } from "../server/access";
import type { Lost } from "../server/repo";
import { contentVideoPath, type Target } from "../server/rules";

/**
 * Content videos over the API (`src/app/api/content-videos`), from the browser: the save (the file straight to the private
 * Blob store with `upload()` from `@vercel/blob/client`, then the row), the lookup, and a video's file address. Only types
 * and the pure path rule come from `server/`: nothing server-only reaches the bundle.
 */

/** Where a `<video>` plays a content video from. */
export const contentVideoFileUrl = (id: string): string => `/api/content-videos/${id}/file`;

export interface SaveInput {
  id: string; blob: Blob; type: string; title: string; note: string; seconds: number; width: number; height: number; madeFor: string; target: Target;
  /** the file is in the store already: only the row is missing */
  fileUp?: boolean;
}
export type SaveResult = { ok: true; video: ContentVideoInfo; lost: Lost[] } | { ok: false; error: string; fileUp: boolean };
type Put = (path: string, blob: Blob, opts: { clientPayload: string; contentType: string }) => Promise<unknown>;

/** The file is in the store but the row didn't come back: the next save sends only the row. */
export const UPLOADED_NOT_SAVED = "The video is uploaded but wasn't saved. Press Save for players again.";
const LOOKUP_FAILED = "The videos could not be loaded.";
const ROW_MS = 20_000;
const LOOKUP_MS = 10_000;
/** Over this size the file goes up in parts, each retried by the Blob client. */
const MULTIPART_BYTES = 64 * 1024 ** 2;

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const blobPut: Put = async (path, blob, opts) => {
  const { upload } = await import("@vercel/blob/client");
  return upload(path, blob, { access: "private", handleUploadUrl: "/api/content-videos/upload", multipart: blob.size > MULTIPART_BYTES, ...opts });
};

/** The server's words in a JSON `{ error }`, or "" when it sent none. */
async function wordsOf(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : "";
}

type Row = { ok: true; video: ContentVideoInfo; lost: Lost[] } | { ok: false; status: number | null; words: string };

/** The row for an uploaded file. Never throws: a timeout or a dropped connection is `status: null`. */
async function saveRow(input: SaveInput, path: string, doFetch: typeof fetch): Promise<Row> {
  const { id, title, note, type, seconds, width, height, madeFor, target } = input;
  try {
    const res = await doFetch("/api/content-videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(ROW_MS),
      body: JSON.stringify({ id, title, note, type, seconds, width, height, path, madeFor, target }),
    });
    if (!res.ok) return { ok: false, status: res.status, words: await wordsOf(res) };
    const body = (await res.json().catch(() => null)) as { video?: ContentVideoInfo; lost?: Lost[] } | null;
    if (!body?.video) return { ok: false, status: null, words: "" };
    return { ok: true, video: body.video, lost: Array.isArray(body.lost) ? body.lost : [] };
  } catch {
    return { ok: false, status: null, words: "" };
  }
}

/**
 * Saves a content video: the file (unless `fileUp` says it is in the store already: the store won't overwrite it), then the
 * row. Never throws. A failed transfer tries the row once, since the file may be up from an earlier try. A refusal of the row,
 * a 409 among them, is an error with the server's words, never a save; `fileUp` says whether the next try sends only the row.
 */
export async function saveContentVideo(input: SaveInput, deps: { put: Put; fetch: typeof fetch } = { put: blobPut, fetch: (...a) => fetch(...a) }): Promise<SaveResult> {
  const path = contentVideoPath(input.madeFor, input.id, input.type);
  if (!input.fileUp) {
    try {
      await deps.put(path, input.blob, {
        clientPayload: JSON.stringify({ id: input.id, type: input.type, size: input.blob.size, madeFor: input.madeFor }),
        contentType: input.type,
      });
    } catch (e) {
      const row = await saveRow(input, path, deps.fetch);
      if (row.ok) return row;
      // a 409 comes only after the server found the file: it is up
      return { ok: false, error: row.words || `The upload didn't finish (${message(e)}). Press Save for players again.`, fileUp: row.status === 409 };
    }
  }
  const row = await saveRow(input, path, deps.fetch);
  if (row.ok) return row;
  return { ok: false, error: row.words || UPLOADED_NOT_SAVED, fileUp: true };
}

/** Which video each tool cell of the given blocks shows, and those videos. Throws with the server's words, or "The videos could not be loaded." */
export async function lookUpVideos(blocks: LookupAsk[]): Promise<{ blocks: Record<string, CellVideo[]>; videos: Record<string, PlayInfo> }> {
  let res: Response;
  try {
    res = await fetch("/api/content-videos/lookup", { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(LOOKUP_MS), body: JSON.stringify({ blocks }) });
  } catch {
    throw new Error(LOOKUP_FAILED);
  }
  if (!res.ok) throw new Error((await wordsOf(res)) || LOOKUP_FAILED);
  const body = (await res.json().catch(() => null)) as { blocks?: unknown; videos?: unknown } | null;
  const obj = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);
  if (!body || !obj(body.blocks) || !obj(body.videos)) throw new Error(LOOKUP_FAILED);
  return body as { blocks: Record<string, CellVideo[]>; videos: Record<string, PlayInfo> };
}
