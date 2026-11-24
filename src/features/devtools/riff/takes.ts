"use client";

/** The riff maker's video takes, one per riff, kept in this browser (IndexedDB) under the riff's id. */
export interface RiffTake {
  id: string; blob: Blob; type: string; seconds: number; at: number;
  /** recorded to the click: seconds into the take where beat 1 fell (after the count-in, latency allowed for), the tempo and the expected bars */
  downbeat?: number; bpm?: number; bars?: number;
  /** what was detected in the take: what Read the neck saw while it played (DetectLog) */
  log?: TakeLog;
}

/** One frame Read the neck read, at `t` seconds into the take: the marker ids and each hand's fingertips. */
export interface NeckRead {
  t: number; markers: number[]; hands: { x: number; y: number }[][];
  /** each marker's centre; x and y here and in `hands` are fractions of the frame's width */
  at?: { id: number; x: number; y: number }[];
}
export interface TakeLog { neck?: NeckRead[] }

const DB = "musickit-dev-riff-takes";
const STORE = "takes";

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

/** Keep a riff's take, in place of the one it had. Throws when the browser won't store it. */
export const saveTake = async (take: RiffTake): Promise<void> => { await run("readwrite", (s) => s.put(take)); };

/** A riff's take, or null when it has none or the browser's storage can't be read. */
export const getTake = async (id: string): Promise<RiffTake | null> => {
  try { return (await run<RiffTake | undefined>("readonly", (s) => s.get(id))) ?? null; } catch { return null; }
};

export const deleteTake = async (id: string): Promise<void> => { await run("readwrite", (s) => s.delete(id)); };
