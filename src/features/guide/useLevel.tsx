"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";
import { DEFAULT_LEVEL, effectiveLevel, resolveLevel, stepDown, stepUp, type Level } from "./levels";
import { GLOBAL_KEY, PAGE_KEY, readLevel, readOverrides } from "./levelStorage";
import { LevelPinContext, PageIdContext } from "./pageContext";

let global: Level = DEFAULT_LEVEL;
let overrides: Record<string, Level> = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    global = readLevel(window.localStorage.getItem(GLOBAL_KEY));
    overrides = readOverrides(window.localStorage.getItem(PAGE_KEY));
  } catch { /* storage unavailable */ }
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  // pick up the stored value after hydration
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}

function emit() {
  listeners.forEach((f) => f());
}

function persist() {
  try {
    window.localStorage.setItem(GLOBAL_KEY, global);
    window.localStorage.setItem(PAGE_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

function setGlobalLevel(l: Level) {
  global = l;
  overrides = {};
  persist();
  emit();
}

function setOverride(pageId: string, l: Level) {
  overrides = { ...overrides, [pageId]: l };
  persist();
  emit();
}

/** Snapshot of the global level; stable primitive so useSyncExternalStore does not loop. */
const getGlobal = () => global;
const getServerGlobal = () => DEFAULT_LEVEL;
const getOverrides = () => overrides;
const getServerOverrides = (): Record<string, Level> => EMPTY;
const EMPTY: Record<string, Level> = {};

/**
 * The level in force for a page: a `LevelPin` above wins, else the page's own override if set, else the global one.
 * Works without a GuideProvider.
 */
export function useLevel(pageId?: string): {
  level: Level;
  global: Level;
  setGlobal(l: Level): void;
  showMore(): void;
  showLess(): void;
  overridden: boolean;
} {
  const ctxId = useContext(PageIdContext);
  const id = pageId ?? ctxId;
  const g = useSyncExternalStore(subscribe, getGlobal, getServerGlobal);
  const o = useSyncExternalStore(subscribe, getOverrides, getServerOverrides);
  const pin = useContext(LevelPinContext);
  const override = id ? o[id] ?? null : null;
  const level = resolveLevel(g, override, pin ?? null);
  const showMore = useCallback(() => {
    if (id) setOverride(id, stepUp(effectiveLevel(global, overrides[id] ?? null)));
    else setGlobalLevel(stepUp(global));
  }, [id]);
  const showLess = useCallback(() => {
    if (id) setOverride(id, stepDown(effectiveLevel(global, overrides[id] ?? null)));
    else setGlobalLevel(stepDown(global));
  }, [id]);
  return { level, global: g, setGlobal: setGlobalLevel, showMore, showLess, overridden: override !== null };
}
