"use client";

import { useSyncExternalStore } from "react";
import type { SectionNotes } from "@/features/course/notes";
import type { KeyChoice } from "@/features/creator/model/key";
import { parseDoc, type About, type DocKind, type Records } from "../model";
import { createDocClient, putDocument, type DocClient } from "./docClient";
import { getJson, LoadRefused } from "./load";
import { report, type SaveStatus, type Tracked } from "./registry";
import { localBackend } from "./localDocs";
import type { DataSource } from "./source";

/** The documents read and written through `userDoc`. The plan and the note have their own stores. */
export type UserDocKind = Extract<DocKind, "course_notes" | "creator" | "records" | "about">;

export interface UserDocTypes {
  course_notes: Record<string, SectionNotes>;
  creator: KeyChoice;
  records: Records;
  about: About;
}

/** Where one document is read from and saved to, for the current source. */
export interface DocBackend {
  /** the stored document, raw: `parseDoc` reads it. Rejects when the read is refused. */
  load(): Promise<unknown>;
  save(doc: unknown): void;
  /** calls `changed` when the stored copy changes elsewhere (another tab, for localStorage); returns a stop */
  watch?(changed: () => void): () => void;
}

export type Backends = (kind: UserDocKind) => DocBackend;

export interface UserDoc<T> {
  /** The document: its empty value (`parseDoc(kind, null)`) until it is loaded. */
  get(): T;
  /** Replace the whole document. Before the load it wins over what the load brings, and is saved at once. */
  set(next: T): void;
  /**
   * Change part of the document. Before the load the change shows at once, and is applied over the loaded document
   * and saved when the load arrives. While it waits it is "saving" in the save registry (the leave warning); a refused
   * load saves nothing and shows it as "signedOut" (401) or "rejected" in the save notice.
   */
  update(fn: (cur: T) => T): void;
  subscribe(fn: () => void): () => void;
  loaded(): boolean;
}

interface Entry {
  kind: UserDocKind;
  empty: unknown;
  value: unknown;
  loaded: boolean;
  loading: boolean;
  /** a whole `set` came before the load: it wins */
  overridden: boolean;
  /** set before any source was known, so not yet saved */
  unsaved: boolean;
  /** `update`s made before the load, applied over it */
  pending: ((cur: unknown) => unknown)[];
  listeners: Set<() => void>;
  unwatch: (() => void) | null;
  /** the last load was refused: its HTTP status (undefined when it gave none) */
  refused: { code?: number } | null;
  /** what the save registry sees of the changes still waiting on the load */
  tracked: Tracked;
}

/**
 * The status of the load and the changes made before it, which no `DocClient` holds yet: "signedOut" when the load was
 * refused with a 401, "rejected" on another refusal (so the save notice tells the player, changes waiting or not),
 * "saving" while changes wait (so the leave warning covers them), else "saved". Once the load arrives they are saved
 * through the `DocClient`.
 */
function waitingStatus(e: Entry): SaveStatus {
  if (e.refused) return e.refused.code === 401 ? "signedOut" : "rejected";
  return e.pending.length === 0 && !e.unsaved ? "saved" : "saving";
}

const entries = new Map<UserDocKind, Entry>();
let backends: Backends | null = null;
let currentKey: string | null = null;
let everSet = false;
/** bumped on every change of source, so a load from the old one is dropped */
let generation = 0;

const emit = (e: Entry) => e.listeners.forEach((fn) => fn());

function entry(kind: UserDocKind): Entry {
  let e = entries.get(kind);
  if (!e) {
    const empty = parseDoc(kind, null);
    const made: Entry = {
      kind, empty, value: empty, loaded: false, loading: false, overridden: false, unsaved: false, pending: [], listeners: new Set(), unwatch: null, refused: null,
      // nothing can be sent before the load, so a flush has nothing to send
      tracked: { status: () => waitingStatus(made), lastCode: () => made.refused?.code, flush: () => {}, unsaved: () => made.pending.length > 0 || made.unsaved },
    };
    e = made;
    entries.set(kind, e);
  }
  return e;
}

function start(e: Entry) {
  if (!backends || e.loaded || e.loading) return;
  const gen = generation;
  const b = backends(e.kind);
  e.loading = true;
  b.load().then(
    (raw) => {
      if (gen !== generation) return;
      e.loading = false;
      e.loaded = true;
      const write = e.unsaved || e.pending.length > 0;
      if (!e.overridden) e.value = e.pending.reduce((v, fn) => fn(v), parseDoc(e.kind, raw));
      e.pending = [];
      e.overridden = false;
      e.unsaved = false;
      e.refused = null;
      if (write) b.save(e.value);
      report(e.tracked);
      e.unwatch = b.watch?.(() => {
        void b.load().then((fresh) => {
          if (gen !== generation) return;
          e.value = parseDoc(e.kind, fresh);
          emit(e);
        }, () => {});
      }) ?? null;
      emit(e);
    },
    (err: unknown) => {
      // refused: nothing is saved, and the document stays not loaded; the next subscriber asks again. Changes waiting
      // on it show as not saved in the save notice.
      if (gen !== generation) return;
      e.loading = false;
      e.refused = { code: err instanceof LoadRefused ? err.code : undefined };
      report(e.tracked);
    },
  );
}

/**
 * Point every document at a source. `key` names it (the source, and the account for the server): the same key again
 * changes nothing; a new one empties every document and loads it afresh, so nothing carries from one account to another.
 * Writes made before the first source is known are kept and saved to it. Tests pass fake `backends`.
 */
export function setUserDocBackends(key: string | null, next: Backends | null): void {
  if (key === currentKey) return;
  currentKey = key;
  backends = next;
  generation++;
  const first = !everSet;
  if (key !== null) everSet = true;
  for (const e of entries.values()) {
    e.unwatch?.();
    e.unwatch = null;
    e.loading = false;
    e.loaded = false;
    if (!first) {
      e.value = e.empty;
      e.overridden = false;
      e.unsaved = false;
      e.pending = [];
      e.refused = null;
      report(e.tracked);
      emit(e);
    }
    if (e.listeners.size > 0 || e.unsaved || e.pending.length > 0) start(e);
  }
}

/** The documents for a data source: the server (one `DocClient` per kind), the old localStorage keys, or nothing kept. */
export function backendsFor(source: DataSource): Backends {
  switch (source) {
    case "server": {
      const made = new Map<UserDocKind, DocBackend>();
      return (kind) => {
        let b = made.get(kind);
        if (!b) {
          let client: DocClient | null = null;
          b = {
            load: () => getJson(`/api/me/documents/${kind}`).then((body) => (body as { data?: unknown } | null)?.data ?? null),
            save: (doc) => (client ??= createDocClient({ put: putDocument(kind) })).save(doc),
          };
          made.set(kind, b);
        }
        return b;
      };
    }
    case "local":
      return localBackend;
    case "memory":
      return () => ({ load: async () => null, save: () => {} });
  }
}

/** Follow a data source (`UserDataProvider` calls it); the account id keeps two signed-in accounts apart. */
export function setUserDocSource(source: DataSource, accountId: string | null): void {
  setUserDocBackends(source === "server" ? `server:${accountId ?? ""}` : source, backendsFor(source));
}

const docs = new Map<UserDocKind, UserDoc<unknown>>();

/** The one shared copy of a document, for `useSyncExternalStore` or a reader outside React. */
export function userDoc<K extends UserDocKind>(kind: K): UserDoc<UserDocTypes[K]> {
  let d = docs.get(kind);
  if (!d) {
    const e = entry(kind);
    d = {
      get: () => e.value,
      set(next) {
        e.value = next;
        if (!e.loaded) {
          e.overridden = true;
          e.pending = [];
        }
        if (backends) backends(kind).save(next);
        else e.unsaved = true;
        report(e.tracked);
        start(e);
        emit(e);
      },
      update(fn) {
        if (e.loaded || e.overridden) return d!.set(fn(e.value));
        e.value = fn(e.value);
        e.pending.push(fn);
        report(e.tracked);
        start(e);
        emit(e);
      },
      subscribe(fn) {
        e.listeners.add(fn);
        start(e);
        return () => {
          e.listeners.delete(fn);
        };
      },
      loaded: () => e.loaded,
    };
    docs.set(kind, d);
  }
  return d as UserDoc<UserDocTypes[K]>;
}

/**
 * One document in a component: `[value, set, loaded]`. The server render and the first paint use the empty document,
 * then the loaded one, so hydration always matches.
 */
export function useUserDoc<K extends UserDocKind>(kind: K): [UserDocTypes[K], (next: UserDocTypes[K]) => void, boolean] {
  const d = userDoc(kind);
  const empty = entry(kind).empty as UserDocTypes[K];
  const value = useSyncExternalStore(d.subscribe, d.get, () => empty);
  const loaded = useSyncExternalStore(d.subscribe, d.loaded, () => false);
  return [value, d.set, loaded];
}
