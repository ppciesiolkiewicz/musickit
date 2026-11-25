import { LADDERS } from "@/features/plan/model/ladders";
import { TOOLS, toolsOf, type Cell, type PlanTool } from "@/features/plan/model/tools";
import { SHAPE_NAMES } from "@/features/exercises/shapes";

/** The step of a laddered tool whose cell reads no step of its ladders: "No level". */
export const NO_LEVEL = "none";

/**
 * A tool's ladders by the tool's key, in the order they are tried. A ladder doesn't name its tool, so it is written out
 * here; steps come from `LADDERS` only. `melody-difficulty` reads nothing and is no tool's.
 */
export const TOOL_LADDERS: Record<string, readonly string[]> = {
  "interval-singer": ["interval-singer"], "interval-ears": ["interval-ears", "chord-changes"],
  "note-finder": ["note-finder"], "string-singer": ["string-singer"], breathwork: ["farinelli"],
  "finger-pattern": ["finger-pattern"], "picking-drill": ["picking-drill"], "legato-trill": ["legato-trill"],
  "clap-along": ["clap-along"], "double-stops-neck": ["double-stops-neck"], "staff-reading": ["staff-reading"],
  "vowel-guide": ["vowel-guide"], "song-chart": ["song-chart"],
  "guitar-play-along:interval": ["intervals-on-neck"], "guitar-play-along:melody": ["guitar-tunes"],
  "melody-singer": ["melody-stages"], "run-singer": ["run-stages"],
};

/** The key a tool is a video's tool by: its type, and for a guitar-play-along, its shape too. */
export const toolKeyOf = (tool: PlanTool): string => (tool.type === "guitar-play-along" ? `guitar-play-along:${tool.shape.shape}` : tool.type);

/** Whether a key names a tool: a tool of the plan (a guitar-play-along only with one of its shapes). */
export function isToolKey(key: string): boolean {
  const [type, shape, ...rest] = key.split(":");
  if (rest.length) return false;
  if (type === "guitar-play-along") return shape !== undefined && SHAPE_NAMES.includes(shape);
  return shape === undefined && Object.hasOwn(TOOLS, type);
}

/** Every step a tool's video can cover, `<ladder id>:<key>` in ladder order, then No level; null for a tool with no ladder. */
export function stepsOfTool(key: string): string[] | null {
  const ids = Object.hasOwn(TOOL_LADDERS, key) ? TOOL_LADDERS[key] : [];
  if (!ids.length) return null;
  const steps = ids.flatMap((id) => LADDERS.find((l) => l.id === id)?.steps.map((s) => `${id}:${s.key}`) ?? []);
  return [...steps, NO_LEVEL];
}

/** The step a tool cell is: the first of its ladders that reads one; No level when it has ladders and none does; null with no ladder. */
export function stepOf(tool: PlanTool): string | null {
  const ids = TOOL_LADDERS[toolKeyOf(tool)] ?? [];
  if (!ids.length) return null;
  for (const id of ids) {
    const key = LADDERS.find((l) => l.id === id)?.read?.(tool);
    if (key != null) return `${id}:${key}`;
  }
  return NO_LEVEL;
}

/** The tools of a block in reading order, a section's cells in its place. */
export const toolCells = (cells: Cell[]): PlanTool[] => toolsOf(cells);

/** A tool cell of a block: its index among the tool cells, its tool key and its step. */
export interface CellAsk { cell: number; tool: string; step: string | null }

export const asksOf = (cells: Cell[]): CellAsk[] => toolCells(cells).map((t, cell) => ({ cell, tool: toolKeyOf(t), step: stepOf(t) }));
