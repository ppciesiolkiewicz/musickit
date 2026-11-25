import { videoExtension } from "@/features/videos/recording";
import { MAX_CELLS } from "@/features/plan/model/tools";
import { isToolKey, stepsOfTool } from "../model/slot";

/** What `blocks.videos` holds: the video of each tool cell of a curated block, by the cell's index (a string key) to a content video id. */
export type BlockVideos = { cells?: Record<string, string> };

/** Where a content video's file is stored in the private Blob store: `content/videos/<made_for>/<id>.<webm|mp4>`. */
export const contentVideoPath = (madeFor: string, id: string, type: string): string => `content/videos/${madeFor}/${id}.${videoExtension(type)}`;

const BLOCK_ID = /^[a-z0-9][a-z0-9-]{0,199}$/;

/** What a video was made for: `tool:<tool key>`, or a block id. No slash, dots or capitals reach a path. */
export function isMadeFor(v: unknown): v is string {
  if (typeof v !== "string") return false;
  if (v.startsWith("tool:")) return isToolKey(v.slice(5));
  return BLOCK_ID.test(v);
}

/** Where a saved video goes: a tool at the steps ticked, or one tool cell of one curated block. */
export type Target = { kind: "tool"; tool: string; steps: string[] | null } | { kind: "cell"; blockId: string; cell: number };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads the target of a save and checks it against `madeFor`. Tool steps come back in the tool's own order. Null when anything is off. */
export function readTarget(raw: unknown, madeFor: string): Target | null {
  if (!isObject(raw)) return null;
  if (raw.kind === "tool") {
    const tool = raw.tool;
    if (typeof tool !== "string" || !isToolKey(tool) || madeFor !== `tool:${tool}`) return null;
    const all = stepsOfTool(tool);
    if (all === null) return raw.steps === null ? { kind: "tool", tool, steps: null } : null;
    const steps = raw.steps;
    if (!Array.isArray(steps) || !steps.length) return null;
    if (steps.some((s) => typeof s !== "string" || !all.includes(s)) || new Set(steps).size !== steps.length) return null;
    return { kind: "tool", tool, steps: all.filter((s) => steps.includes(s)) };
  }
  if (raw.kind === "cell") {
    const { blockId, cell } = raw;
    if (typeof blockId !== "string" || blockId !== madeFor || !isMadeFor(blockId) || blockId.startsWith("tool:")) return null;
    if (typeof cell !== "number" || !Number.isInteger(cell) || cell < 0 || cell >= MAX_CELLS) return null;
    return { kind: "cell", blockId, cell };
  }
  return null;
}

/** A note, trimmed, 1000 characters at most. */
export const cleanNote = (v: unknown): string => (typeof v === "string" ? v.trim().slice(0, 1000) : "");
