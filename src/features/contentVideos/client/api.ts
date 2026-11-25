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
const LIST_MS = 10_000;
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

/** The video with this id in the list (`GET /api/content-videos`), or null when it isn't there or the list can't be read. */
async function listed(id: string, doFetch: typeof fetch): Promise<ContentVideoInfo | null> {
  try {
    const res = await doFetch("/api/content-videos", { signal: AbortSignal.timeout(LIST_MS) });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { videos?: ContentVideoInfo[] } | null;
    return (Array.isArray(body?.videos) ? body.videos : []).find((v) => v?.id === id) ?? null;
  } catch {
    return null;
  }
}

/** The row, and on a 409 the list: a video already saved under this id (an earlier try whose answer was lost) counts as saved. */
async function saveOrFind(input: SaveInput, path: string, doFetch: typeof fetch): Promise<Row> {
  const row = await saveRow(input, path, doFetch);
  if (row.ok || row.status !== 409) return row;
  const video = await listed(input.id, doFetch);
  return video ? { ok: true, video, lost: [] } : row;
}

/**
 * Saves a content video: the file (unless `fileUp` says it is in the store already: the store won't overwrite it), then the
 * row. Never throws. A failed transfer tries the row once, since the file may be up from an earlier try. A 409 from the row is
 * a save only when the list holds this id; any other refusal is an error with the server's words, and `fileUp` says whether
 * the next try sends only the row.
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
      const row = await saveOrFind(input, path, deps.fetch);
      if (row.ok) return row;
      // a 409 comes only after the server found the file: it is up
      return { ok: false, error: row.words || `The upload didn't finish (${message(e)}). Press Save for players again.`, fileUp: row.status === 409 };
    }
  }
  const row = await saveOrFind(input, path, deps.fetch);
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

const EDIT_MS = 15_000;
const NOT_REACHED = "The server couldn't be reached. Check your connection and try again.";

export type Done<T> = { ok: true; value: T } | { ok: false; error: string };

/** One request to a content-video route: the JSON body on success, else the server's words or a line saying it wasn't reached. Never throws. */
async function call<T>(url: string, init: RequestInit, ms: number, read: (body: Record<string, unknown>) => T | null, failed: string): Promise<Done<T>> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  } catch {
    return { ok: false, error: NOT_REACHED };
  }
  if (!res.ok) return { ok: false, error: (await wordsOf(res)) || failed };
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const value = body ? read(body) : null;
  return value === null ? { ok: false, error: failed } : { ok: true, value };
}

const sendJson = (method: string, body: unknown): RequestInit => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** Every content video, newest first. */
export const listContentVideos = (): Promise<Done<ContentVideoInfo[]>> =>
  call("/api/content-videos", {}, LIST_MS, (b) => (Array.isArray(b.videos) ? (b.videos as ContentVideoInfo[]) : null), "The videos could not be loaded.");

/** A video's title and note. */
export const editContentVideo = (id: string, to: { title: string; note: string }): Promise<Done<ContentVideoInfo>> =>
  call(`/api/content-videos/${id}`, sendJson("PATCH", to), EDIT_MS, (b) => (b.video as ContentVideoInfo) ?? null, "The video wasn't changed.");

/** The steps a tool video covers from now on (`[]`: none; `null`: the whole tool, for a tool with no ladder), and the videos that lost steps to it. */
export const retickContentVideo = (id: string, steps: string[] | null): Promise<Done<{ video: ContentVideoInfo; lost: Lost[] }>> =>
  call(`/api/content-videos/${id}/steps`, sendJson("PUT", { steps }), EDIT_MS,
    (b) => (b.video ? { video: b.video as ContentVideoInfo, lost: Array.isArray(b.lost) ? (b.lost as Lost[]) : [] } : null), "The levels weren't changed.");

/** Deletes a video nothing points at, and its file. */
export const deleteContentVideo = (id: string): Promise<Done<true>> =>
  call(`/api/content-videos/${id}`, { method: "DELETE" }, EDIT_MS, () => true, "The video wasn't deleted.");
