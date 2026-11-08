import { LEVELS, type Level } from "./levels";

/**
 * What the guide covers, for /dev/onboarding: each page and exercise tool registers, as it renders, the levels its
 * controls are tagged with (`Tier`, `useLevelAtLeast`), its tour's length and how many `Hint`s it draws. Development
 * only: in a production build `registerCoverage` does nothing. The registry lives in memory, so it holds what has
 * rendered this session; the page adds the static lists (`coveredPages.ts`, `TOOL_TOURS`) for what has not.
 */

export type CoverageEntry = { kind: "page" | "tool"; id: string; levels: Level[]; tourSteps: number; hints: number };

const entries = new Map<string, CoverageEntry>();
const listeners = new Set<() => void>();
let version = 0;

/**
 * Adds what a page or tool showed: merged by `kind:id`, so calling it every render, or from several components of one
 * tool, counts nothing twice (levels are a set, the counts the largest seen).
 */
export function registerCoverage(entry: CoverageEntry): void {
  if (process.env.NODE_ENV === "production") return;
  const key = `${entry.kind}:${entry.id}`;
  const was = entries.get(key);
  const levels = LEVELS.filter((l) => entry.levels.includes(l) || was?.levels.includes(l));
  const next: CoverageEntry = {
    kind: entry.kind,
    id: entry.id,
    levels,
    tourSteps: Math.max(entry.tourSteps, was?.tourSteps ?? 0),
    hints: Math.max(entry.hints, was?.hints ?? 0),
  };
  if (was && was.levels.length === levels.length && was.tourSteps === next.tourSteps && was.hints === next.hints) return;
  entries.set(key, next);
  version++;
  listeners.forEach((f) => f());
}

/** Everything registered this session, pages first, then tools, each by id. */
export function listCoverage(): CoverageEntry[] {
  return [...entries.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

/** For tests. */
export function clearCoverage(): void {
  entries.clear();
  version++;
}

/** For `useSyncExternalStore`: a number that changes whenever an entry does. */
export function subscribeCoverage(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const coverageVersion = (): number => version;
