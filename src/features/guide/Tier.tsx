"use client";

import type { ReactNode } from "react";
import { atLeast, type Level } from "./levels";
import { LevelPinContext, PageIdContext } from "./pageContext";
import { useCoverage } from "./useCoverage";
import { useLevel } from "./useLevel";

/** Tells Tier and useLevel which page they sit on. Optional: without it the global level applies. */
export function GuideProvider({ pageId, children }: { pageId: string; children: ReactNode }) {
  return <PageIdContext.Provider value={pageId}>{children}</PageIdContext.Provider>;
}

/**
 * Fixes the level for everything under it, whatever the student picked: for a place with no level switch, such as the
 * teacher studio's stage, which must show its tools whole.
 */
export function LevelPin({ level, children }: { level: Level; children: ReactNode }) {
  return <LevelPinContext.Provider value={level}>{children}</LevelPinContext.Provider>;
}

/** True when `force` is set or the level in force is `min` or above. */
export function useLevelAtLeast(min: Level, force = false): boolean {
  const { level } = useLevel();
  useCoverage({ levels: [min] });
  return force || atLeast(level, min);
}

/** Renders its children only at `min` level or above (or when `force`). */
export function Tier({ min, force, children }: { min: Level; force?: boolean; children: ReactNode }) {
  return useLevelAtLeast(min, force) ? <>{children}</> : null;
}
