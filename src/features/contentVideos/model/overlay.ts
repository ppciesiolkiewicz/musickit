import { TOOLS, type PlanTool } from "@/features/plan/model/tools";
import { readPieces, type Piece } from "./clock";

/**
 * What a take saves for its overlay (`content_videos.overlay`): a copy of the tool's settings as it was drawn over the
 * camera, and its clock (`model/clock.ts`). A copy, not a link: a later change to the exercise doesn't move the overlay
 * off the hands. Pure.
 */
export interface Overlay { tool: PlanTool; clock: Piece[] }

/** The tools drawn over a video while it plays; every other tool's video just plays. */
export const OVERLAY_TOOLS = ["guitar-play-along", "melody-singer"] as const;

export const hasOverlay = (tool: Pick<PlanTool, "type">): boolean => (OVERLAY_TOOLS as readonly string[]).includes(tool.type);

/** `x` as an overlay, or null: a tool that has one, its settings read again by the plan's own parser, and a clock. */
export function readOverlay(x: unknown): Overlay | null {
  if (!x || typeof x !== "object") return null;
  const { tool: raw, clock: rawClock } = x as { tool?: unknown; clock?: unknown };
  const type = (raw as { type?: unknown } | null)?.type;
  if (typeof type !== "string" || !(OVERLAY_TOOLS as readonly string[]).includes(type)) return null;
  // read as a stored plan's tool is: the settings as they were saved, nothing defaulted or noted
  const tool = TOOLS[type as keyof typeof TOOLS].parse(raw as Record<string, unknown>, { notes: [], stored: true });
  const clock = readPieces(rawClock);
  if (!tool || !clock) return null;
  return { tool, clock };
}
