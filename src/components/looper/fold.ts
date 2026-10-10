"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Folded sections of the looper UI ("Switch between buses", "Output goes to", an input row in the Inputs widget), by key.
 * One store for every view, so a section folded in the canvas block is folded in the floating Inputs widget too, and the
 * fold is remembered (localStorage `musickit.looper.folds`). Open unless folded.
 */
const KEY = "musickit.looper.folds";
const listeners = new Set<() => void>();
let folds: Record<string, boolean> | null = null;

const load = (): Record<string, boolean> => {
  if (folds) return folds;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    folds = raw && typeof raw === "object" ? Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean> : {};
  } catch {
    folds = {};
  }
  return folds;
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** `[open, toggle]` for a section; `byDefault` is used until the person folds or opens it. */
export function useFold(key: string, byDefault = true): [boolean, () => void] {
  const open = useSyncExternalStore(subscribe, () => load()[key] ?? byDefault, () => byDefault);
  const toggle = useCallback(() => {
    folds = { ...load(), [key]: !(load()[key] ?? byDefault) };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(folds));
    } catch {
      /* storage blocked: the fold still works for this page */
    }
    listeners.forEach((l) => l());
  }, [key, byDefault]);
  return [open, toggle];
}
