import type { Cell } from "@/features/plan/model/tools";
import { toolCells, toolKeyOf } from "./slot";

const CANONICAL = /^(0|[1-9][0-9]*)$/;

/**
 * Which of a block's own videos (`cells`: tool cell index to content video id) stay after the block's cells changed from
 * `before` to `after`. An entry stays only when the block has as many tool cells as before and the tool at its index is
 * the same (`toolKeyOf`: a guitar-play-along of another shape is another tool). A changed count drops every entry, since no
 * position can be trusted. Text edits, a changed level or other settings of a tool keep it. An entry whose key isn't a canonical index ("01" is not),
 * or whose index has no tool cell before, is dropped.
 */
export function keptCells(
  cells: Record<string, string>,
  before: Cell[],
  after: Cell[],
): { kept: Record<string, string>; dropped: { cell: number; videoId: string }[] } {
  const was = toolCells(before).map(toolKeyOf);
  const now = toolCells(after).map(toolKeyOf);
  const sameCount = was.length === now.length;
  const kept: Record<string, string> = {};
  const dropped: { cell: number; videoId: string }[] = [];
  for (const [k, videoId] of Object.entries(cells)) {
    const cell = Number(k);
    if (sameCount && CANONICAL.test(k) && cell >= 0 && was[cell] !== undefined && was[cell] === now[cell]) kept[k] = videoId;
    else dropped.push({ cell, videoId });
  }
  dropped.sort((a, b) => a.cell - b.cell);
  return { kept, dropped };
}
