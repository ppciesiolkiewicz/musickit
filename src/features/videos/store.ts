"use client";

/**
 * The teacher's own videos, kept in this browser (IndexedDB `musickit-videos`). Nothing is uploaded: a note that holds one plays it
 * only in the browser that recorded it. Every call fails soft (null, an empty list, false), as private windows may refuse storage.
 */

export interface SavedVideo {
  id: string;
  title: string;
  /** the recorded type ("video/webm;codecs=vp9,opus") */
  type: string;
  blob: Blob;
  seconds: number;
  /** the picture's size, for its shape */
  width: number;
  height: number;
  savedAt: number;
}
/** A saved video without its file: what a list shows. */
export type SavedVideoInfo = Omit<SavedVideo, "blob">;

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
const changed = () => listeners.forEach((fn) => fn());

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

export async function getVideo(id: string): Promise<SavedVideo | null> {
  try {
    return (await run<SavedVideo | undefined>("readonly", (s) => s.get(id))) ?? null;
  } catch {
    return null;
  }
}

/** Every saved video, newest first, without the files. */
export async function listVideos(): Promise<SavedVideoInfo[]> {
  try {
    const all = await run<SavedVideo[]>("readonly", (s) => s.getAll());
    return all.map(({ blob: _blob, ...info }) => (void _blob, info)).sort((a, b) => b.savedAt - a.savedAt);
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
