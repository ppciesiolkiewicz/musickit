"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";
import { DEFAULT_LEVEL, effectiveLevel, resolveLevel, stepDown, stepUp, type Level } from "./levels";
import { userDoc } from "@/features/userData/client/useUserDoc";
import { LevelPinContext, PageIdContext } from "./pageContext";

/*
 * The level and the per-page levels are part of the player's "about me" document (`userDoc("about")`): on the server
 * for a signed-in player, in localStorage (`musickit.level`, `musickit.level.page`) without accounts. Until it loads,
 * and in the server render, the level is the default.
 */
const about = userDoc("about");

function setGlobalLevel(l: Level) {
  about.update((a) => ({ ...a, level: l, levelPages: {} }));
}

function setOverride(pageId: string, l: Level) {
  about.update((a) => ({ ...a, levelPages: { ...a.levelPages, [pageId]: l } }));
}

/** Snapshots: a primitive and a kept object, so useSyncExternalStore does not loop. */
const getGlobal = () => about.get().level;
const getServerGlobal = () => DEFAULT_LEVEL;
const getOverrides = () => about.get().levelPages;
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
  const g = useSyncExternalStore(about.subscribe, getGlobal, getServerGlobal);
  const o = useSyncExternalStore(about.subscribe, getOverrides, getServerOverrides);
  const pin = useContext(LevelPinContext);
  const override = id ? o[id] ?? null : null;
  const level = resolveLevel(g, override, pin ?? null);
  const showMore = useCallback(() => {
    const { level: global, levelPages } = about.get();
    if (id) setOverride(id, stepUp(effectiveLevel(global, levelPages[id] ?? null)));
    else setGlobalLevel(stepUp(global));
  }, [id]);
  const showLess = useCallback(() => {
    const { level: global, levelPages } = about.get();
    if (id) setOverride(id, stepDown(effectiveLevel(global, levelPages[id] ?? null)));
    else setGlobalLevel(stepDown(global));
  }, [id]);
  return { level, global: g, setGlobal: setGlobalLevel, showMore, showLess, overridden: override !== null };
}
