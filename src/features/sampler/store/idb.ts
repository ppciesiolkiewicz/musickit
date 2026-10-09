import { createMemoryStore } from "./memory";
import type { SamplerStore } from "./types";

const DB = "musickit-sampler";
const PROJECT = "project";
const AUDIO = "audio";
const KEY = "main";

const wrap = <T>(req: IDBRequest<T>) => new Promise<T>((res, rej) => {
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore(PROJECT);
      r.result.createObjectStore(AUDIO);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/** The browser's IndexedDB. Falls back to memory (nothing persists) when it is not available, such as in some private windows. */
export function createIdbStore(): SamplerStore {
  if (typeof indexedDB === "undefined") return createMemoryStore();
  let db: Promise<IDBDatabase> | null = null;
  const get = () => (db ??= open());
  const run = async <T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
    const d = await get();
    return wrap(fn(d.transaction(store, mode).objectStore(store)));
  };
  return {
    loadProject: () => run(PROJECT, "readonly", (s) => s.get(KEY)).then((v) => v ?? null),
    saveProject: async (p) => void (await run(PROJECT, "readwrite", (s) => s.put(p, KEY))),
    putAudio: async (id, blob) => void (await run(AUDIO, "readwrite", (s) => s.put(blob, id))),
    getAudio: (id) => run<Blob | undefined>(AUDIO, "readonly", (s) => s.get(id)).then((v) => v ?? null),
    deleteAudio: async (id) => void (await run(AUDIO, "readwrite", (s) => s.delete(id))),
  };
}

let shared: SamplerStore | null = null;
export const getStore = (): SamplerStore => (shared ??= createIdbStore());
