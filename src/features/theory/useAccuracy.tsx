"use client";

import { useSyncExternalStore } from "react";
import { IN_TUNE_CENTS, savedAccuracy } from "./singing";

/** where the accuracy picked last is kept, in cents: the singing page and every singing tool share it */
export const ACCURACY_KEY = "singing.accuracy";
let current: number = IN_TUNE_CENTS;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const v = savedAccuracy(JSON.parse(window.localStorage.getItem(ACCURACY_KEY) ?? "null"));
      if (v !== null) current = v;
    } catch { /* storage unavailable */ }
  }
  listeners.add(fn);
  // pick up the stored value after hydration
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}

export function setAccuracy(cents: number) {
  current = cents;
  try { window.localStorage.setItem(ACCURACY_KEY, JSON.stringify(cents)); } catch { /* ignore */ }
  listeners.forEach((f) => f());
}

/** How close counts as on the note, in cents: one setting behind every singing tool, persisted. */
export function useAccuracy(): [number, (cents: number) => void] {
  const v = useSyncExternalStore(subscribe, () => current, () => IN_TUNE_CENTS);
  return [v, setAccuracy];
}
