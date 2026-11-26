import type { CellAsk } from "./slot";

/** A saved tool video: the tool it covers and the steps it covers there (null for a tool with no ladder). */
export interface ToolVideo { id: string; tool: string | null; steps: string[] | null }

export interface CellVideo { cell: number; id: string; from: "block" | "tool"; repeat: boolean }

const holds = (row: ToolVideo, ask: CellAsk): boolean =>
  row.tool === ask.tool && (ask.step === null ? row.steps === null : (row.steps?.includes(ask.step) ?? false));

/** The video a tool cell shows: the block's own for that cell, else the tool's video holding its step. No borrowing. */
export function videoFor(ask: CellAsk, own: Record<number, string>, rows: ToolVideo[]): { id: string; from: "block" | "tool" } | null {
  const mine = own[ask.cell];
  if (mine) return { id: mine, from: "block" };
  const row = rows.find((r) => holds(r, ask));
  return row ? { id: row.id, from: "tool" } : null;
}

/** True at the first place of each id; false at a repeat and at null. */
export function firstShown(ids: (string | null)[]): boolean[] {
  const seen = new Set<string>();
  return ids.map((id) => {
    if (id === null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** One entry per cell that has a video; `repeat` when the same video showed at an earlier cell. */
export function blockVideos(asks: CellAsk[], own: Record<number, string>, rows: ToolVideo[]): CellVideo[] {
  const found = asks.map((ask) => ({ cell: ask.cell, video: videoFor(ask, own, rows) }));
  const first = firstShown(found.map((f) => f.video?.id ?? null));
  return found.flatMap((f, i) => (f.video ? [{ cell: f.cell, id: f.video.id, from: f.video.from, repeat: !first[i] }] : []));
}
