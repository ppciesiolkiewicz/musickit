"use client";

import { useSyncExternalStore } from "react";

/**
 * A setting kept in this browser (localStorage) and shared live by everything that reads it: a page's settings panel
 * and the tool it hosts change and show the same value. The saved value comes in after hydration (the server and the
 * first render use `initial`); a stored value that `valid` rejects is ignored.
 */
export function savedSetting<T>(key: string, initial: T, valid: (v: unknown) => boolean): () => [T, (v: T) => void] {
  let value = initial;
  let loaded = false;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (!loaded) {
      loaded = true;
      try {
        const v: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (valid(v)) {
          value = v as T;
          queueMicrotask(() => listeners.forEach((l) => l()));
        }
      } catch { /* storage blocked */ }
    }
    return () => listeners.delete(listener);
  };
  const set = (v: T) => {
    value = v;
    try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ }
    listeners.forEach((l) => l());
  };
  return () => [useSyncExternalStore(subscribe, () => value, () => initial), set];
}
