"use client";

import { useSyncExternalStore } from "react";
import { legacyNoteKey } from "@/features/course/legacy";
import { EMPTY_NOTES, hasNotes, parseNotesStore, type SectionNotes } from "@/features/course/notes";

/**
 * The student's course notes and index layout, kept in localStorage and shared by every component on the page
 * (and other tabs, via the storage event). Server render and first paint use the empty store, so hydration always matches.
 */

/** v2: stage slugs renumbered 1–11; the old store is read once and moved over. */
const NOTES_KEY = "musickit.course.notes.v2";
const OLD_NOTES_KEY = "musickit.course.notes";
const LAYOUT_KEY = "musickit.course.layout";

export type CourseLayout = "stage" | "topic";

const read = (k: string): string | null => {
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { window.localStorage.setItem(k, v); } catch { /* storage unavailable: keep it for this visit only */ }
};

let notes: Record<string, SectionNotes> = {};
let layout: CourseLayout = "stage";
let loaded = false;
const listeners = new Set<() => void>();
const SERVER_NOTES: Record<string, SectionNotes> = {};

function loadAll() {
  const stored = read(NOTES_KEY);
  if (stored === null && read(OLD_NOTES_KEY) !== null) {
    notes = Object.fromEntries(Object.entries(parseNotesStore(read(OLD_NOTES_KEY))).map(([k, n]) => [legacyNoteKey(k), n]));
    write(NOTES_KEY, JSON.stringify(notes));
  } else notes = parseNotesStore(stored);
  layout = read(LAYOUT_KEY) === "topic" ? "topic" : "stage";
}

const emit = () => listeners.forEach((f) => f());

function onStorage(e: StorageEvent) {
  if (e.key === NOTES_KEY || e.key === LAYOUT_KEY) { loadAll(); emit(); }
}

function subscribe(fn: () => void) {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    loadAll();
    window.addEventListener("storage", onStorage);
  }
  listeners.add(fn);
  // pick up the stored values after hydration
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}

export function useAllNotes(): Record<string, SectionNotes> {
  return useSyncExternalStore(subscribe, () => notes, () => SERVER_NOTES);
}

/** Merge a change into one section's notes; a section left with nothing noted is removed. */
export function saveSectionNotes(key: string, patch: Partial<SectionNotes>) {
  const next = { ...(notes[key] ?? EMPTY_NOTES), ...patch };
  const copy = { ...notes };
  if (hasNotes(next)) copy[key] = next; else delete copy[key];
  notes = copy;
  write(NOTES_KEY, JSON.stringify(notes));
  emit();
}

export function useSectionNotes(key: string): [SectionNotes, (patch: Partial<SectionNotes>) => void] {
  const all = useAllNotes();
  return [all[key] ?? EMPTY_NOTES, (patch) => saveSectionNotes(key, patch)];
}

export function useCourseLayout(): [CourseLayout, (v: CourseLayout) => void] {
  const v = useSyncExternalStore(subscribe, () => layout, () => "stage" as CourseLayout);
  const set = (next: CourseLayout) => { layout = next; write(LAYOUT_KEY, next); emit(); };
  return [v, set];
}
