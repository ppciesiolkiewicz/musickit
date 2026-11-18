import { parseChoiceDiag, parseCellDiag, resolveChordPlacement, type Cell } from "./tools";
import { cleanKeys } from "./keys";
import type { PlanConfig, PlanExercise } from "./types";

/**
 * An exercise's cells and choice run through the plan's own parser again (as stored: nothing is noted), so a cell the
 * reader can't draw (a staff with no key, a tool of an unknown type) is dropped here, not met by a tool on /plan. An
 * exercise left with no cell shows its title, as on paste. A stored plan is loaded through this (`state.ts`), and a plan
 * being started or a day being edited goes through it before its block ids are made, so the id is of what is stored.
 */
export function cleanExercise(e: PlanExercise): PlanExercise {
  const title = typeof e.title === "string" ? e.title : "";
  const cells = resolveChordPlacement(e.cells.flatMap((c): Cell[] => {
    // draft: an exercise being edited keeps an empty text or a section with no heading yet
    const p = parseCellDiag(c, { stored: true, draft: true });
    return p.cell ? [p.cell] : [];
  }));
  const out: PlanExercise = { ...e, title, cells: cells.length ? cells : [{ type: "text", text: title || "Exercise" }] };
  delete out.choice;
  // the player's keys ride with the slot: kept when they read as keys, else dropped
  delete out.keys;
  const keys = cleanKeys(e.keys);
  if (keys) out.keys = keys;
  if (e.choice !== undefined) {
    const c = parseChoiceDiag(e.choice, { notes: [], stored: true });
    if (c.choice) out.choice = c.choice;
  }
  return out;
}

/** Every exercise of the plan through `cleanExercise`; a day without an exercise list is left as it is. */
export const cleanCells = (config: PlanConfig): PlanConfig => ({
  ...config,
  days: config.days.map((d) => (Array.isArray(d?.exercises) ? { ...d, exercises: d.exercises.map(cleanExercise) } : d)),
});
