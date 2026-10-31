import { AREAS, CONCEPTS, conceptById, conceptsFor, type Area, type Concept } from "./concepts";
import type { Level, PlanAnswers } from "./types";

export const MAX_FOCUS = 3;
const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];

/** The areas the player did not skip, in screen order. */
export const activeAreas = (a: Pick<PlanAnswers, "levels">) => AREAS.filter((x) => a.levels[x.id]);

/** Concepts offered as this week's focus: rated 1-2 among those shown (unrated is not weak), plus the first two of each area's next level. */
export function focusOptions(a: Pick<PlanAnswers, "levels" | "ratings">): Concept[] {
  const out: Concept[] = [];
  for (const { id } of activeAreas(a)) {
    const level = a.levels[id]!;
    const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
    out.push(...conceptsFor(id, level).filter((c) => (a.ratings[c.id] ?? 6) <= 2));
    if (next) out.push(...CONCEPTS.filter((c) => c.area === id && c.level === next).slice(0, 2));
  }
  return out;
}

/** The focus ids without those of a skipped area (unknown ids go too). */
export const focusWithout = (focus: string[], area: Area): string[] => focus.filter((id) => { const c = conceptById(id); return c && c.area !== area; });

/** Toggle one focus id, never going past MAX_FOCUS. */
export const toggleFocus = (focus: string[], id: string): string[] =>
  focus.includes(id) ? focus.filter((x) => x !== id) : focus.length < MAX_FOCUS ? [...focus, id] : focus;
