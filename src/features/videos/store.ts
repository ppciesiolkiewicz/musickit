"use client";

/**
 * The teacher's own videos in this browser (IndexedDB `musickit-videos`). Two kinds of entry share the store:
 * - Without accounts (and for a visitor) it is the whole library: `saveVideo`, `listVideos`, `renameVideo`, `deleteVideo`.
 *   Nothing is uploaded; a note plays such a video only in the browser that recorded it.
 * - For a signed-in player it is the upload queue (an entry with a `state`, `queue.ts`): `enqueue`, `listQueued`, `markQueued`,
 *   `dropQueued`. A take stays here until the server has its file and its row.
 * Every call fails soft (null, an empty list, false), as private windows may refuse storage. A take the browser refused to store is
 * kept in this page's memory instead (`keepUnstored`), so it can still be uploaded, played and downloaded until the page closes.
 */

import type { QueuedVideo, SavedVideo, SavedVideoInfo } from "./queue";

export type { QueuedVideo, SavedVideo, SavedVideoInfo };

const DB = "musickit-videos";
const STORE = "videos";

const wrap = <T>(req: IDBRequest<T>) =>
  new Promise<T>((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await wrap(fn(db.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    db.close();
  }
}

// tell open lists when the library changes (another tab's changes show on the next open)
const listeners = new Set<() => void>();
export const onVideosChange = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
export const changed = () => listeners.forEach((fn) => fn());

/** Saves a take; its id, or null when the browser refused. */
export async function saveVideo(v: Omit<SavedVideo, "id" | "savedAt">): Promise<string | null> {
  const id = crypto.randomUUID();
  try {
    await run("readwrite", (s) => s.put({ ...v, id, savedAt: Date.now() }));
    changed();
    return id;
  } catch {
    return null;
  }
}

/** A video kept in this browser, from the library or the queue (or this page's memory). */
export async function getVideo(id: string): Promise<SavedVideo | null> {
  const loose = unstored.get(id);
  if (loose) return loose;
  try {
    return (await run<SavedVideo | undefined>("readonly", (s) => s.get(id))) ?? null;
  } catch {
    return null;
  }
}

/** Every video in the local library (not the upload queue), newest first, without the files. */
export async function listVideos(): Promise<SavedVideoInfo[]> {
  try {
    const all = await run<(SavedVideo & { state?: string })[]>("readonly", (s) => s.getAll());
    return all.filter((v) => !v.state).map(({ blob: _blob, ...info }) => (void _blob, info)).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function deleteVideo(id: string): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.delete(id));
    changed();
    return true;
  } catch {
    return false;
  }
}

export async function renameVideo(id: string, title: string): Promise<boolean> {
  const v = await getVideo(id);
  if (!v) return false;
  try {
    await run("readwrite", (s) => s.put({ ...v, title }));
    changed();
    return true;
  } catch {
    return false;
  }
}

// ---- the upload queue (signed in) ----

/** Takes the browser refused to store, kept for this page only. */
const unstored = new Map<string, QueuedVideo>();

const isQueued = (v: unknown): v is QueuedVideo => typeof v === "object" && v !== null && typeof (v as QueuedVideo).state === "string";

/** Queues a take for upload under its own id; the id, or null when the browser refused to store it. */
export async function enqueue(v: Omit<QueuedVideo, "savedAt" | "state" | "tries">): Promise<string | null> {
  try {
    await run("readwrite", (s) => s.put({ ...v, savedAt: Date.now(), state: "waiting", tries: 0 }));
    changed();
    return v.id;
  } catch {
    return null;
  }
}

/** Keeps a take the browser refused to store in this page's memory, queued like the rest. */
export function keepUnstored(v: Omit<QueuedVideo, "savedAt" | "state" | "tries">): void {
  unstored.set(v.id, { ...v, savedAt: Date.now(), state: "waiting", tries: 0 });
  changed();
}

/** Whether a queued take is only in this page's memory (it is lost if the page closes before it is uploaded). */
export const isUnstored = (id: string): boolean => unstored.has(id);

/** Every queued take of this account, with its file, newest first. */
export async function listQueued(accountId: string): Promise<QueuedVideo[]> {
  let stored: QueuedVideo[] = [];
  try {
    stored = (await run<unknown[]>("readonly", (s) => s.getAll())).filter(isQueued);
  } catch {
    stored = [];
  }
  return [...stored, ...unstored.values()].filter((v) => v.accountId === accountId).sort((a, b) => b.savedAt - a.savedAt);
}

/** Changes a queued take (its state, its name); false when it isn't queued or the browser refused. */
export async function markQueued(id: string, patch: Partial<Omit<QueuedVideo, "id" | "blob" | "accountId">>): Promise<boolean> {
  const loose = unstored.get(id);
  if (loose) {
    unstored.set(id, { ...loose, ...patch });
    changed();
    return true;
  }
  const v = await getVideo(id);
  if (!isQueued(v)) return false;
  try {
    await run("readwrite", (s) => s.put({ ...v, ...patch }));
    changed();
    return true;
  } catch {
    return false;
  }
}

/** Removes a take from the queue (once the server has it, or when the player deletes it). */
export async function dropQueued(id: string): Promise<boolean> {
  if (unstored.delete(id)) {
    changed();
    return true;
  }
  return deleteVideo(id);
}
