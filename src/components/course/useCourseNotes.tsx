"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_NOTES, hasNotes, type SectionNotes } from "@/features/course/notes";
import { userDoc, useUserDoc } from "@/features/userData/client/useUserDoc";

/**
 * The student's course notes and the index layout, shared by every component on the page.
 *
 * The notes are the player's `course_notes` document (`userDoc`): on the server for a signed-in player, in localStorage
 * (`musickit.course.notes.v2`) without accounts. The layout belongs to this browser and stays in localStorage (and other
 * tabs, via the storage event). Server render and first paint use the empty notes and the "stage" layout, so hydration
 * always matches.
 */

const LAYOUT_KEY = "musickit.course.layout";

export type CourseLayout = "stage" | "topic";

const notesDoc = userDoc("course_notes");

let layout: CourseLayout = "stage";
let loaded = false;
const listeners = new Set<() => void>();

const readLayout = () => {
  try { layout = window.localStorage.getItem(LAYOUT_KEY) === "topic" ? "topic" : "stage"; } catch { /* storage unavailable */ }
};

const emit = () => listeners.forEach((f) => f());

function onStorage(e: StorageEvent) {
  if (e.key === LAYOUT_KEY) { readLayout(); emit(); }
}

function subscribeLayout(fn: () => void) {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    readLayout();
    window.addEventListener("storage", onStorage);
  }
  listeners.add(fn);
  // pick up the stored value after hydration
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}

export function useAllNotes(): Record<string, SectionNotes> {
  return useUserDoc("course_notes")[0];
}

/** Merge a change into one section's notes; a section left with nothing noted is removed. */
export function saveSectionNotes(key: string, patch: Partial<SectionNotes>) {
  notesDoc.update((notes) => {
    const next = { ...(notes[key] ?? EMPTY_NOTES), ...patch };
    const copy = { ...notes };
    if (hasNotes(next)) copy[key] = next; else delete copy[key];
    return copy;
  });
}

export function useSectionNotes(key: string): [SectionNotes, (patch: Partial<SectionNotes>) => void] {
  const all = useAllNotes();
  return [all[key] ?? EMPTY_NOTES, (patch) => saveSectionNotes(key, patch)];
}

export function useCourseLayout(): [CourseLayout, (v: CourseLayout) => void] {
  const v = useSyncExternalStore(subscribeLayout, () => layout, () => "stage" as CourseLayout);
  const set = (next: CourseLayout) => {
    layout = next;
    try { window.localStorage.setItem(LAYOUT_KEY, next); } catch { /* storage unavailable: keep it for this visit only */ }
    emit();
  };
  return [v, set];
}
