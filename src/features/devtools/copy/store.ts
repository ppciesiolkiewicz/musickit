"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { onError } from "@/components/ui";
import { COPY_NOTES_KEY, noteIdOf, notesDiff, notesOfOldComments, OLD_COMMENTS_KEY, readCopyNotes, routeOf, type CopyNote } from "../model/copyNotes";

/*
 * The notes live in the database (`dev_notes`, /api/dev/notes): one list for everyone. This page keeps a copy, changes
 * it at once and sends the change; it reads the list again when the window gets focus and every 30 seconds.
 */

const API = "/api/dev/notes";
const EVENT = "musickit.dev.copyNotes";
const EMPTY: CopyNote[] = [];
let list: CopyNote[] = EMPTY;
/** Bumped by every write: a read that started before one is stale and dropped. */
let writes = 0;
let pending = 0;

const parse = (raw: string | null): unknown => {
  try {
    return JSON.parse(raw ?? "null");
  } catch {
    return null; // broken: nothing
  }
};

const set = (next: CopyNote[]) => {
  list = next;
  window.dispatchEvent(new Event(EVENT));
};

async function send(change: { put: CopyNote[]; remove: string[] }) {
  const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(change), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? `The notes couldn't be saved (${r.status}).`);
}

/** The notes this browser kept in localStorage before they moved to the database: sent up once, then removed here. */
async function moveLocalNotes(server: CopyNote[]) {
  const local = [...readCopyNotes(parse(localStorage.getItem(COPY_NOTES_KEY))), ...notesOfOldComments(parse(localStorage.getItem(OLD_COMMENTS_KEY)))];
  if (localStorage.getItem(COPY_NOTES_KEY) === null && localStorage.getItem(OLD_COMMENTS_KEY) === null) return server;
  const ids = new Set(server.map((n) => n.id));
  const put = local.filter((n, i) => !ids.has(n.id) && local.findIndex((m) => m.id === n.id) === i);
  if (put.length) await send({ put, remove: [] });
  localStorage.removeItem(COPY_NOTES_KEY);
  localStorage.removeItem(OLD_COMMENTS_KEY);
  return [...server, ...put].sort((a, b) => a.at.localeCompare(b.at));
}

let loading: Promise<void> | null = null;
let failed = false;
function load() {
  loading ??= (async () => {
    const started = writes;
    try {
      const r = await fetch(API, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? `The notes couldn't be loaded (${r.status}).`);
      const notes = await moveLocalNotes(readCopyNotes(((await r.json()) as { notes?: unknown }).notes));
      failed = false;
      if (started === writes && pending === 0) set(notes);
    } catch (e) {
      if (!failed) onError(e, "The notes couldn't be loaded."); // once, not on every poll
      failed = true;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

let watchers = 0;
let stop: (() => void) | null = null;
const subscribe = (on: () => void) => {
  window.addEventListener(EVENT, on);
  if (watchers++ === 0) {
    void load();
    const again = () => document.visibilityState === "visible" && void load();
    const timer = setInterval(again, 30000);
    window.addEventListener("focus", again);
    stop = () => {
      clearInterval(timer);
      window.removeEventListener("focus", again);
    };
  }
  return () => {
    window.removeEventListener(EVENT, on);
    if (--watchers === 0) stop?.();
  };
};

/** Every saved note, on every page, everyone's; empty on the server and until the list arrives. */
export const useCopyNotes = (): CopyNote[] => useSyncExternalStore(subscribe, () => list, () => EMPTY);

/** Changes the saved notes: every open overlay and page follows at once, and the change goes to the database. */
export const writeCopyNotes = (change: (l: CopyNote[]) => CopyNote[]) => {
  const before = list;
  const after = change(before);
  const diff = notesDiff(before, after);
  if (!diff.put.length && !diff.remove.length) return;
  writes++;
  pending++;
  set(after);
  send(diff).then(
    () => pending--,
    (e) => {
      pending--;
      onError(e, "The notes couldn't be saved.");
      void Promise.resolve(loading).then(() => load()); // show what the database holds
    },
  );
};

/* ---- where the page is: path, hash and search, followed through hash links and history.pushState/replaceState too ---- */

const LOCATION = "musickit.dev.location";
let patched = false;
const onLocation = (on: () => void) => {
  // pages such as /admin/content/stories move by history.replaceState, which fires no event: have it (and pushState) send one,
  // after the call returns (it may come while React renders)
  if (!patched) {
    patched = true;
    for (const k of ["pushState", "replaceState"] as const) {
      const orig = history[k];
      history[k] = function (this: History, ...a: Parameters<History["pushState"]>) {
        orig.apply(this, a);
        queueMicrotask(() => window.dispatchEvent(new Event(LOCATION)));
      };
    }
  }
  for (const e of ["hashchange", "popstate", LOCATION]) window.addEventListener(e, on);
  return () => {
    for (const e of ["hashchange", "popstate", LOCATION]) window.removeEventListener(e, on);
  };
};

/** The route this page's notes are kept by (`routeOf`: path, and hash where there is one); "" on the server. */
export const useRoute = (): string => useSyncExternalStore(onLocation, () => routeOf(location.pathname, location.hash), () => "");

/** The note the location links to (`noteHref`), or null. */
export const useLinkedNote = (): string | null => useSyncExternalStore(onLocation, () => noteIdOf(location.search, location.hash), () => null);

/** Scrolls the element with `id` into the middle of the view once it is there (it may mount after the page). */
export function useScrollTo(id: string | null) {
  useEffect(() => {
    if (!id) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) clearInterval(timer);
      el?.scrollIntoView({ block: "center" });
    }, 100);
    return () => clearInterval(timer);
  }, [id]);
}

/* ---- git: HEAD and each example file's last commit, from /api/dev/commit ---- */

/** What a page says where git gives no commit (a production server has no checkout). */
export const COMMIT_UNKNOWN = "Commit not known";

export interface Commits {
  head: string;
  files: Record<string, { path: string; commit: string; dirty: boolean }>;
}

let commits: Promise<Commits | null> | null = null;

/** HEAD and the example files' commits, fetched once per page load; null until they arrive (or when git isn't there). */
export function useCommits(): Commits | null {
  return useCommitState().commits;
}

/** The same, and whether the answer is in: `settled` with no `commits` means the commit is not known (no git here, or the call failed). */
export function useCommitState(): { commits: Commits | null; settled: boolean } {
  const [state, setState] = useState<{ commits: Commits | null; settled: boolean }>({ commits: null, settled: false });
  useEffect(() => {
    commits ??= fetch("/api/dev/commit", { signal: AbortSignal.timeout(10000) }).then((r) => (r.ok ? r.json() : null), () => null);
    void commits.then((c) => setState({ commits: c, settled: true }), () => setState({ commits: null, settled: true }));
  }, []);
  return state;
}

/* ---- the sections a page notes on (/admin/content/library), so the Notes bar can re-pin them and count the outdated ---- */

/** Plain data and a function, so the bar (on every page) needs none of the plan model that /admin/content/library uses. */
export interface NoteSections {
  /** every section's hash now, by `hashKey` */
  hashes: Record<string, string>;
  /** the section notes pinned to their sections as they are now and to the files' commits (`repinSectionNotes`) */
  repin: (notes: CopyNote[], files?: Commits["files"]) => CopyNote[];
}

const SECTIONS = "musickit.dev.noteSections";
let shown: NoteSections | null = null;
const onSections = (on: () => void) => {
  window.addEventListener(SECTIONS, on);
  return () => window.removeEventListener(SECTIONS, on);
};

/** Tells the Notes bar the sections this page shows, while it is mounted. */
export function useShowSections(s: NoteSections) {
  useEffect(() => {
    shown = s;
    window.dispatchEvent(new Event(SECTIONS));
    return () => {
      if (shown === s) shown = null;
      window.dispatchEvent(new Event(SECTIONS));
    };
  }, [s]);
}

/** The sections the current page shows (see `useShowSections`), or null on a page without. */
export const useShownSections = (): NoteSections | null => useSyncExternalStore(onSections, () => shown, () => null);
