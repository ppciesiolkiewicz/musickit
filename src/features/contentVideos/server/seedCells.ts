import { SEED_BLOCKS } from "@/features/library/seed";
import { exerciseOf } from "@/features/library/seed/choices";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import { applyGiven } from "@/features/plan/model/moves";
import { drawnParts } from "@/features/plan/model/choice";
import type { PlanTool } from "@/features/plan/model/tools";
import { stepOf, toolCells, toolKeyOf } from "../model/slot";
import { seedUse, type SeedUse } from "../model/coverage";

/** A tool cell of a seed block's choice, as written (each choice chip at its first option): where it is and the tool it draws. */
export interface SeedCell { blockId: string; choice: string; title: string; draft: boolean; cell: number; tool: PlanTool; key: string; step: string | null }

let cached: SeedCell[] | null = null;

/** Every tool cell of every choice of every seed block file, in file order. A choice that doesn't parse is left out (`seed check` names it). */
export function seedCells(): SeedCell[] {
  if (cached) return cached;
  const entries = catalogue();
  const out: SeedCell[] = [];
  for (const f of SEED_BLOCKS) {
    for (const c of f.choices ?? []) {
      const block = parseExercise(exerciseOf(f, c), f.id, entries).block;
      if (!block) continue;
      // the cells as drawn with no version and no chip moved: the block as written. A cell's index is its own block's (toolCells order).
      const drawn = toolCells(drawnParts(applyGiven(block, null, {}), {}).flatMap((p) => p.cells));
      drawn.forEach((tool, cell) => out.push({ blockId: f.id, choice: c.name, title: block.title, draft: c.draft === true, cell, tool, key: toolKeyOf(tool), step: stepOf(tool) }));
    }
  }
  cached = out;
  return out;
}

/** Which seed blocks use each tool at each step. */
export const seedToolUse = (): SeedUse => seedUse(Object.values(Object.groupBy(seedCells(), (c) => c.blockId)).map((cs) => ({ id: cs![0].blockId, asks: cs!.map((c) => ({ cell: c.cell, tool: c.key, step: c.step })) })));
