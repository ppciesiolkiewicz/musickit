"use client";

import { kernelBytes, loadDsp } from "./dsp";
import { readNam, toTransferable, type NamInfo, type NamSpec } from "./info";
import type { ModelSource } from "./host";

export interface ModelRecord {
  id: number;
  name: string;
  /** the file as it was loaded */
  text: string;
  info: NamInfo;
  /** how many times faster than real time the model ran on this device when it was added */
  speed: number | null;
  addedAt: number;
}

const DB = "musickit-nam";
const STORE = "models";

const wrap = <T>(req: IDBRequest<T>) =>
  new Promise<T>((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/** Times a model on this device: about a quarter of a second of audio through the same WebAssembly code the effect uses. */
export async function measureSpeed(spec: NamSpec): Promise<number | null> {
  try {
    if (typeof WebAssembly === "undefined" || typeof performance === "undefined") return null;
    await new Promise((r) => setTimeout(r, 0));
    const model = loadDsp().buildModel(spec, 128, { wasm: kernelBytes() });
    const x = new Float32Array(128), y = new Float32Array(128);
    for (let s = 0; s < model.prewarmSamples + 128; s += 128) model.process([x], [y], 128);
    const blocks = 96;
    for (let i = 0; i < 128; i++) x[i] = 0.2 * Math.sin(i / 3) + 0.05 * Math.sin(i * 1.7);
    const t0 = performance.now();
    for (let b = 0; b < blocks; b++) model.process([x], [y], 128);
    const secs = (performance.now() - t0) / 1000;
    const rate = model.sampleRate > 0 ? model.sampleRate : 48000;
    return secs > 0 ? (blocks * 128) / rate / secs : null;
  } catch {
    return null;
  }
}

/** The models a person has added, kept in IndexedDB (in memory only where that is not available). */
export class ModelLibrary implements ModelSource {
  private records = new Map<number, ModelRecord>();
  private parsed = new Map<number, { spec: NamSpec; info: NamInfo }>();
  private listeners = new Set<() => void>();
  private db: Promise<IDBDatabase> | null = null;
  private ready: Promise<void> | null = null;
  private nextMemoryId = 1;

  private store<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("no storage"));
    this.db ??= openDb();
    return this.db.then((d) => wrap(fn(d.transaction(STORE, mode).objectStore(STORE))));
  }

  /** Reads the saved models. Safe to call many times. */
  init(): Promise<void> {
    this.ready ??= this.store("readonly", (s) => s.getAll() as IDBRequest<ModelRecord[]>)
      .then((all) => {
        all.forEach((r) => this.records.set(r.id, r));
        this.nextMemoryId = Math.max(0, ...all.map((r) => r.id)) + 1;
        this.emit();
      })
      .catch(() => undefined);
    return this.ready;
  }

  list(): ModelRecord[] {
    return [...this.records.values()].sort((a, b) => a.id - b.id);
  }

  get(id: number): ModelRecord | undefined {
    return this.records.get(id);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  /** Adds a .nam file. Throws an Error with a short message when it cannot be used. */
  async addFile(file: File): Promise<ModelRecord> {
    await this.init();
    const text = await file.text();
    const read = readNam(text, file.name);
    if (!read.ok) throw new Error(`${file.name}: ${read.error}`);
    const speed = await measureSpeed(read.spec);
    const draft = { name: read.info.name, text, info: read.info, speed, addedAt: Date.now() };
    let id: number;
    try {
      id = Number(await this.store("readwrite", (s) => s.add(draft)));
    } catch {
      id = this.nextMemoryId++;
    }
    const record: ModelRecord = { ...draft, id };
    this.records.set(id, record);
    this.emit();
    return record;
  }

  async remove(id: number): Promise<void> {
    this.records.delete(id);
    this.parsed.delete(id);
    this.emit();
    await this.store("readwrite", (s) => s.delete(id)).catch(() => undefined);
  }

  async load(id: number): Promise<{ spec: NamSpec; info: NamInfo } | null> {
    await this.init();
    const hit = this.parsed.get(id);
    if (hit) return hit;
    const rec = this.records.get(id);
    if (!rec) return null;
    const read = readNam(rec.text, rec.name);
    if (!read.ok) return null;
    const out = { spec: toTransferable(read.spec), info: read.info };
    this.parsed.set(id, out);
    return out;
  }
}

let shared: ModelLibrary | null = null;
export const getModelLibrary = (): ModelLibrary => (shared ??= new ModelLibrary());
