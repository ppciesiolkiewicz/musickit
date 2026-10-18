"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_NOTES, PRESET_TAGS, hasNotes, parseCustomTags, parseNotesStore, type SectionNotes, type Tag } from "@/features/course/notes";

/**
 * The student's course notes, custom tags and index layout, kept in localStorage and shared by every component on the page
 * (and other tabs, via the storage event). Server render and first paint use the empty store, so hydration always matches.
 */

const NOTES_KEY = "musickit.course.notes";
const TAGS_KEY = "musickit.course.tags";
const LAYOUT_KEY = "musickit.course.layout";

export type CourseLayout = "stage" | "topic";

const read = (k: string): string | null => {
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { window.localStorage.setItem(k, v); } catch { /* storage unavailable: keep it for this visit only */ }
};

let notes: Record<string, SectionNotes> = {};
let custom: Tag[] = [];
let allTags: Tag[] = PRESET_TAGS;
let layout: CourseLayout = "stage";
let loaded = false;
const listeners = new Set<() => void>();
const SERVER_NOTES: Record<string, SectionNotes> = {};

function loadAll() {
  notes = parseNotesStore(read(NOTES_KEY));
  custom = parseCustomTags(read(TAGS_KEY));
  allTags = [...PRESET_TAGS, ...custom];
  layout = read(LAYOUT_KEY) === "topic" ? "topic" : "stage";
}

const emit = () => listeners.forEach((f) => f());

function onStorage(e: StorageEvent) {
  if (e.key === NOTES_KEY || e.key === TAGS_KEY || e.key === LAYOUT_KEY) { loadAll(); emit(); }
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

export function useSectionNotes(key: string): [SectionNotes, (patch: Partial<SectionNotes>) => void] {
  const all = useAllNotes();
  const set = (patch: Partial<SectionNotes>) => {
    const next = { ...(notes[key] ?? EMPTY_NOTES), ...patch };
    const copy = { ...notes };
    if (hasNotes(next)) copy[key] = next; else delete copy[key];
    notes = copy;
    write(NOTES_KEY, JSON.stringify(notes));
    emit();
  };
  return [all[key] ?? EMPTY_NOTES, set];
}

export function useTags(): [Tag[], (t: Tag) => void] {
  const v = useSyncExternalStore(subscribe, () => allTags, () => PRESET_TAGS);
  const add = (t: Tag) => {
    custom = [...custom, t];
    allTags = [...PRESET_TAGS, ...custom];
    write(TAGS_KEY, JSON.stringify(custom));
    emit();
  };
  return [v, add];
}

export function useCourseLayout(): [CourseLayout, (v: CourseLayout) => void] {
  const v = useSyncExternalStore(subscribe, () => layout, () => "stage" as CourseLayout);
  const set = (next: CourseLayout) => { layout = next; write(LAYOUT_KEY, next); emit(); };
  return [v, set];
}
