"use client";

import { useCallback, useSyncExternalStore } from "react";
import { parseSeen, seenKey } from "./tour";

/** Seen flags read so far, by page id; read from storage the first time a page asks. */
const seen = new Map<string, boolean>();
const listeners = new Set<() => void>();

function read(pageId: string): boolean {
  let v = seen.get(pageId);
  if (v === undefined) {
    v = false;
    try {
      v = parseSeen(window.localStorage.getItem(seenKey(pageId)));
    } catch { /* storage unavailable */ }
    seen.set(pageId, v);
  }
  return v;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // pick up the stored value after hydration
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}

function markSeen(pageId: string) {
  if (seen.get(pageId) === true) return;
  seen.set(pageId, true);
  try { window.localStorage.setItem(seenKey(pageId), "1"); } catch { /* ignore */ }
  listeners.forEach((f) => f());
}

const notSeen = () => false;

/** Whether this page's tour button has been clicked once (stored per page). Not seen on the server and while hydrating. */
export function useTourSeen(pageId: string): [seen: boolean, markSeen: () => void] {
  const v = useSyncExternalStore(subscribe, () => read(pageId), notSeen);
  const mark = useCallback(() => markSeen(pageId), [pageId]);
  return [v, mark];
}
