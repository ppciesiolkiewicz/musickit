import type { Target } from "./rules";

/** A row of `content_videos`. `tool` and `steps` are the steps it covers now: both null for a block's own video and for one no step points at any more. */
export interface ContentVideoRow {
  id: string; title: string; note: string; recordedBy: string | null; madeFor: string;
  tool: string | null; steps: string[] | null;
  type: string; seconds: number; width: number; height: number; size: number;
  blobPath: string; overlay: unknown | null; createdAt: Date;
}

/** A video that lost steps to a new one: the steps taken off it, and whether it is left with none (its tool is then null). */
export interface Lost { id: string; title: string; steps: string[]; emptied: boolean }

/** What points at a video: its tool and steps (null when it has none), and the curated blocks' cells that hold it (by block id, bytewise, then cell). */
export interface Pointers { tool: { tool: string; steps: string[] | null } | null; cells: { blockId: string; cell: number }[] }

/**
 * The content videos. One video per tool and step: `create` takes the target's steps off the tool's other videos in the
 * same transaction, so no two videos of a tool ever hold one step. A video left with no steps keeps its row (and file)
 * with `tool` and `steps` null. A block's own video lives in `blocks.videos.cells`, by the cell's index among the block's
 * tool cells; only a curated block has one.
 */
export interface ContentVideoRepo {
  /**
   * In one transaction: takes the target's steps off the tool's other videos (or, for a tool with no ladder, the tool off them),
   * or points the block's cell at the video; then writes the row with the target's tool and steps (`row.tool` and `row.steps`
   * are ignored; a cell target stores both null). `lost` lists the videos that lost a step (for a tool with no ladder, the one
   * that held the tool, with `steps: []`), by id. Pointing a cell at a new video leaves the old video's row alone.
   * `taken`: the id or the path is already stored. `no-block`: no curated block has the id. `no-cell`: the cell is past the
   * block's tool cells. Nothing is changed then.
   */
  create(row: ContentVideoRow, target: Target): Promise<{ ok: true; lost: Lost[] } | { ok: false; reason: "taken" | "no-block" | "no-cell" }>;
  get(id: string): Promise<ContentVideoRow | null>;
  /** every video, newest first (ties by id) */
  list(): Promise<ContentVideoRow[]>;
  edit(id: string, to: { title: string; note: string }): Promise<ContentVideoRow | null>;
  pointers(id: string): Promise<Pointers>;
  /** null: no such video. Refused, with what points at it, while its tool is set or a block's cell holds it. */
  remove(id: string): Promise<{ ok: true; row: ContentVideoRow } | { ok: false; pointers: Pointers } | null>;
  /**
   * For the lookup: curated blocks' own cells (`blockId → cell → video id`; a hashed or unknown block, and a curated one with no
   * cells, has no entry), and every row whose tool is one of `tools` or that one of those cells holds (newest first).
   */
  forLookup(blockIds: string[], tools: string[]): Promise<{ own: Record<string, Record<number, string>>; rows: ContentVideoRow[] }>;
}

/** The cells of `blocks.videos` that are well formed: a non-negative integer key to a string id. */
export function cellsOf(videos: unknown): [number, string][] {
  if (typeof videos !== "object" || videos === null || Array.isArray(videos)) return [];
  const cells = (videos as { cells?: unknown }).cells;
  if (typeof cells !== "object" || cells === null || Array.isArray(cells)) return [];
  return Object.entries(cells).flatMap(([k, v]) => (/^(0|[1-9][0-9]*)$/.test(k) && typeof v === "string" ? [[Number(k), v] as [number, string]] : []));
}

/** What a tool target takes off another video of the tool: its new steps and what it lost; null when it loses nothing. */
export function takeSteps(other: { steps: string[] | null }, target: { steps: string[] | null }): { steps: string[] | null; lost: string[]; emptied: boolean } | null {
  if (target.steps === null) return { steps: null, lost: [], emptied: true };
  const lost = (other.steps ?? []).filter((s) => target.steps!.includes(s));
  if (!lost.length) return null;
  const left = (other.steps ?? []).filter((s) => !target.steps!.includes(s));
  return left.length ? { steps: left, lost, emptied: false } : { steps: null, lost, emptied: true };
}

/** Bytewise, as `collate "C"`. */
export const bytewise = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Newest first, then by id. */
export const newestFirst = (a: ContentVideoRow, b: ContentVideoRow): number => b.createdAt.getTime() - a.createdAt.getTime() || bytewise(a.id, b.id);
