import { drawnParts, type Picks } from "@/features/plan/model/choice";
import { applyGiven, type At, type Given } from "@/features/plan/model/moves";
import type { Block } from "@/features/plan/model/types";
import { asksOf, type CellAsk } from "./slot";
import { firstShown, type CellVideo } from "./lookup";

/**
 * A block's tool cells as the reader draws them now: in its version (`given`, the version chips at `at`) and with its
 * choice chips at `picks` (`drawnParts`, as `BlockBody` does). A chip that sets a level changes the cell's step, so the
 * video follows the chips. The cell numbers are the block's own (a section's cells in its place).
 */
export function drawnAsks(block: Pick<Block, "title" | "choice" | "moves" | "cells">, given: Given | null | undefined, at: At, picks: Picks): CellAsk[] {
  const moved = applyGiven(block, given, at);
  return asksOf(drawnParts(moved, picks).flatMap((p) => p.cells));
}

/**
 * The videos a day shows, by exercise key and cell: each video only at its first place in the day (exercises in the
 * order given, cells in order within each), so two exercises or two tools pointing at one video show it once.
 */
export function dayVideos(keys: string[], blocks: Record<string, CellVideo[] | undefined>): Record<string, Record<number, string>> {
  const places = keys.flatMap((key) => (Object.hasOwn(blocks, key) ? blocks[key] ?? [] : []).map((v) => ({ key, cell: v.cell, id: v.id })));
  const first = firstShown(places.map((p) => p.id));
  // a Map, then entries: a key like "__proto__" stays an own key
  const out = new Map<string, Record<number, string>>();
  places.forEach((p, i) => {
    if (!first[i]) return;
    const cells = out.get(p.key) ?? {};
    cells[p.cell] = p.id;
    out.set(p.key, cells);
  });
  return Object.fromEntries(out);
}
