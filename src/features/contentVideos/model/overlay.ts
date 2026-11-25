import { TOOLS, type PlanTool } from "@/features/plan/model/tools";
import { readPieces, type Piece } from "./clock";

/**
 * What a take saves for its overlay (`content_videos.overlay`): a copy of the tool's settings as it was drawn over the
 * camera, and its clock (`model/clock.ts`). A copy, not a link: a later change to the exercise doesn't move the overlay
 * off the hands. Pure.
 */
export interface Overlay { tool: PlanTool; clock: Piece[]; /** where the tool sat over the camera; none (older takes): `PLAYBACK_LOOK` */ look?: Look }

/**
 * Where the tool sits over the camera and over the video: at the bottom, top, left or right, or free (moved and sized by
 * hand: `box`); how much of the picture it may take; and on a dark panel or a clear one, so more of the picture shows
 * through.
 */
export interface Look { place: "bottom" | "top" | "left" | "right" | "free"; size: "small" | "medium" | "large"; bg: "dark" | "clear"; /** the free place, kept when another place is picked; none: `DEFAULT_BOX` */ box?: Box }
/** A free panel's left, top, width and height, each a share (0 to 1) of the picture's width or height. */
export interface Box { x: number; y: number; w: number; h: number }
export const PLACES = ["bottom", "top", "left", "right", "free"] as const;
export const SIZES = ["small", "medium", "large"] as const;
export const BGS = ["dark", "clear"] as const;
/** the record page's look until one is picked */
export const DEFAULT_LOOK: Look = { place: "bottom", size: "medium", bg: "dark" };
/** a saved video with no look: as videos played before looks were saved */
export const PLAYBACK_LOOK: Look = { place: "top", size: "medium", bg: "dark" };

/** a free panel before it is moved or sized */
export const DEFAULT_BOX: Box = { x: 0.05, y: 0.05, w: 0.5, h: 0.4 };
/** the smallest share of the picture a free panel may take, across and down */
export const MIN_BOX = 0.1;

const share = (x: number) => Math.round(x * 1000) / 1000;
/** `b` kept inside the picture and no smaller than `MIN_BOX`. */
export function fitBox(b: Box): Box {
  const w = Math.min(1, Math.max(MIN_BOX, b.w));
  const h = Math.min(1, Math.max(MIN_BOX, b.h));
  return { x: share(Math.min(1 - w, Math.max(0, b.x))), y: share(Math.min(1 - h, Math.max(0, b.y))), w: share(w), h: share(h) };
}
function readBox(x: unknown): Box | undefined {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const n = [o.x, o.y, o.w, o.h];
  return n.every((v) => typeof v === "number" && Number.isFinite(v)) ? fitBox({ x: n[0] as number, y: n[1] as number, w: n[2] as number, h: n[3] as number }) : undefined;
}

const oneOf = <T extends string>(list: readonly T[], x: unknown, or: T): T => (list.includes(x as T) ? (x as T) : or);

/** `x` as a look, each part that doesn't read taken from `or`. */
export function readLook(x: unknown, or: Look = DEFAULT_LOOK): Look {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const look: Look = { place: oneOf(PLACES, o.place, or.place), size: oneOf(SIZES, o.size, or.size), bg: oneOf(BGS, o.bg, or.bg) };
  const box = readBox(o.box) ?? or.box;
  return box ? { ...look, box } : look;
}

/** The tools drawn over a video while it plays; every other tool's video just plays. */
export const OVERLAY_TOOLS = ["guitar-play-along", "melody-singer"] as const;

export const hasOverlay = (tool: Pick<PlanTool, "type">): boolean => (OVERLAY_TOOLS as readonly string[]).includes(tool.type);

/** `x` as an overlay, or null: a tool that has one, its settings read again by the plan's own parser, and a clock; a look that doesn't read is the default. */
export function readOverlay(x: unknown): Overlay | null {
  if (!x || typeof x !== "object") return null;
  const { tool: raw, clock: rawClock, look } = x as { tool?: unknown; clock?: unknown; look?: unknown };
  const type = (raw as { type?: unknown } | null)?.type;
  if (typeof type !== "string" || !(OVERLAY_TOOLS as readonly string[]).includes(type)) return null;
  // read as a stored plan's tool is: the settings as they were saved, nothing defaulted or noted
  const tool = TOOLS[type as keyof typeof TOOLS].parse(raw as Record<string, unknown>, { notes: [], stored: true });
  const clock = readPieces(rawClock);
  if (!tool || !clock) return null;
  return look === undefined ? { tool, clock } : { tool, clock, look: readLook(look) };
}
