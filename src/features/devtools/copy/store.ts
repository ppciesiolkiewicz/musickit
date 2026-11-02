"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { COPY_NOTES_KEY, noteIdOf, notesOfOldComments, OLD_COMMENTS_KEY, readCopyNotes, routeOf, type CopyNote } from "../model/copyNotes";

const EVENT = "musickit.dev.copyNotes";
let cache: { raw: string | null; list: CopyNote[] } = { raw: null, list: [] };
const EMPTY: CopyNote[] = [];

const parse = (raw: string | null): unknown => {
  try {
    return JSON.parse(raw ?? "null");
  } catch {
    return null; // broken: nothing
  }
};

/** Moves /dev/examples' old section comments into the notes, once (their ids keep a second run from doubling them). */
function migrate() {
  const old = localStorage.getItem(OLD_COMMENTS_KEY);
  if (old === null) return;
  const notes = readCopyNotes(parse(localStorage.getItem(COPY_NOTES_KEY)));
  const ids = new Set(notes.map((n) => n.id));
  localStorage.setItem(COPY_NOTES_KEY, JSON.stringify([...notes, ...notesOfOldComments(parse(old)).filter((n) => !ids.has(n.id))]));
  localStorage.removeItem(OLD_COMMENTS_KEY);
}

function snapshot(): CopyNote[] {
  migrate();
  const raw = localStorage.getItem(COPY_NOTES_KEY);
  if (raw !== cache.raw) cache = { raw, list: readCopyNotes(parse(raw)) };
  return cache.list;
}
const subscribe = (on: () => void) => {
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener("storage", on);
  };
};

/** Every saved note, on every page; empty on the server. */
export const useCopyNotes = (): CopyNote[] => useSyncExternalStore(subscribe, snapshot, () => EMPTY);

/** Changes the saved notes; every open overlay and page follows. */
export const writeCopyNotes = (change: (l: CopyNote[]) => CopyNote[]) => {
  localStorage.setItem(COPY_NOTES_KEY, JSON.stringify(change(snapshot())));
  window.dispatchEvent(new Event(EVENT));
};

/* ---- where the page is: path, hash and search, followed through hash links and history.pushState/replaceState too ---- */

const LOCATION = "musickit.dev.location";
let patched = false;
const onLocation = (on: () => void) => {
  // pages such as /dev/stories move by history.replaceState, which fires no event: have it (and pushState) send one,
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

export interface Commits {
  head: string;
  files: Record<string, { path: string; commit: string; dirty: boolean }>;
}

let commits: Promise<Commits | null> | null = null;

/** HEAD and the example files' commits, fetched once per page load; null until they arrive (or when git isn't there). */
export function useCommits(): Commits | null {
  const [c, setC] = useState<Commits | null>(null);
  useEffect(() => {
    commits ??= fetch("/api/dev/commit").then((r) => (r.ok ? r.json() : null), () => null);
    void commits.then(setC, () => setC(null));
  }, []);
  return c;
}

/* ---- the sections a page notes on (/dev/examples), so the Notes bar can re-pin them and count the outdated ---- */

/** Plain data and a function, so the bar (on every page) needs none of the plan model that /dev/examples uses. */
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
