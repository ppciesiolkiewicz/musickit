import { keptCells } from "@/features/contentVideos/model/keptCells";
import type { BlockVideos } from "@/features/contentVideos/server/rules";
import type { Cell } from "@/features/plan/model/tools";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const cellsOf = (content: unknown): Cell[] => (isRecord(content) && Array.isArray(content.cells) ? (content.cells as Cell[]) : []);

/**
 * What the seed does to a stored block's `videos` when its content is rewritten: the entries whose tool cell moved
 * (`keptCells`, on the stored content's cells and the new ones) are dropped, the block's other `videos` fields stay, and
 * `cells` is `{}` when none is left. Null when nothing is dropped, so the block is not written. A `videos` that is not
 * an object, or whose `cells` is not one, has no entries; an entry whose value is not a string is dropped as well.
 */
export function dropMovedVideos(
  videos: unknown,
  before: unknown,
  after: unknown,
): { videos: BlockVideos; dropped: { cell: number; videoId: string }[] } | null {
  if (!isRecord(videos) || !isRecord(videos.cells)) return null;
  const { cells, ...rest } = videos;
  const strings: Record<string, string> = {};
  const bad: { cell: number; videoId: string }[] = [];
  for (const [k, v] of Object.entries(cells)) {
    if (typeof v === "string") strings[k] = v;
    else bad.push({ cell: Number(k), videoId: String(v) });
  }
  const { kept, dropped } = keptCells(strings, cellsOf(before), cellsOf(after));
  const all = [...dropped, ...bad];
  if (!all.length) return null;
  return { videos: { ...rest, cells: kept }, dropped: all.sort((a, b) => a.cell - b.cell) };
}
