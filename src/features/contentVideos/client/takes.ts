"use client";

import { readKeptTake, type KeptTake } from "../model/takeKey";

export type { KeptTake, TakeLog } from "../model/takeKey";
export type { NeckRead } from "@/features/neckFx";

/** Takes kept in this browser (IndexedDB), one per target (`takeKey`). The old riff maker's Take panel kept its takes in this same store, under the riff's block id, and `readKeptTake` still reads them. */
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

/** Keep a target's take, in place of the one it had. Throws when the browser won't store it. */
export const saveKeptTake = async (t: KeptTake): Promise<void> => { await run("readwrite", (s) => s.put(t)); };

/** A target's take under `key`, else under `oldKey` (an old record's id); null when it has none or the browser's storage can't be read. */
export const getKeptTake = async (key: string, oldKey?: string): Promise<KeptTake | null> => {
  try {
    const first = readKeptTake(await run<unknown>("readonly", (s) => s.get(key)));
    if (first || !oldKey) return first;
    return readKeptTake(await run<unknown>("readonly", (s) => s.get(oldKey)));
  } catch { return null; }
};

export const deleteKeptTake = async (key: string): Promise<void> => { await run("readwrite", (s) => s.delete(key)); };
