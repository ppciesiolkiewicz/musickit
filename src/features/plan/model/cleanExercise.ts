import { parseChoiceDiag, parseCellDiag, resolveChordPlacement, toolsOf, type Cell } from "./tools";
import { cleanGiven, parseMoves } from "./moves";
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
  delete out.moves;
  delete out.given;
  // a `keys` field from before `given` is not read
  delete (out as { keys?: unknown }).keys;
  if (e.choice !== undefined) {
    const c = parseChoiceDiag(e.choice, { notes: [], stored: true });
    if (c.choice) out.choice = c.choice;
  }
  const moves = parseMoves(e.moves, toolsOf(out.cells)).moves;
  if (moves) out.moves = moves;
  // the version rides with the slot: kept where it fits the block as it is now, else dropped
  const given = cleanGiven(e.given, out);
  if (given) out.given = given;
  return out;
}

/** Every exercise of the plan through `cleanExercise`; a day without an exercise list is left as it is. */
export const cleanCells = (config: PlanConfig): PlanConfig => ({
  ...config,
  days: config.days.map((d) => (Array.isArray(d?.exercises) ? { ...d, exercises: d.exercises.map(cleanExercise) } : d)),
});
