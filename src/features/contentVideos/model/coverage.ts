import { LADDERS } from "@/features/plan/model/ladders";
import { TOOLS } from "@/features/plan/model/tools";
import { SHAPE_NAMES } from "@/features/exercises/shapes";
import { NO_LEVEL, TOOL_LADDERS, type CellAsk } from "./slot";
import type { ToolVideo } from "./lookup";

/**
 * What the Tools videos page lists: every tool a video can be for, its steps grouped by ladder, the video covering each
 * step, and how many seed blocks use the tool at that step. Pure: the page hands in the videos and the seed's tool cells.
 */

/** Every tool key a video can be for, in the plan registry's order: a guitar-play-along once per shape. The `video` tool shows a rendered video already and has none. */
export function videoTools(): string[] {
  return Object.keys(TOOLS).flatMap((t) => (t === "video" ? [] : t === "guitar-play-along" ? SHAPE_NAMES.map((s) => `${t}:${s}`) : [t]));
}

/** One step a video can cover: its stored key (`null` for a tool with no ladder: the tool itself), its name, and what it holds. */
export interface StepInfo { step: string | null; name: string; holds: string }

/** The steps of one ladder of a tool, or the tool alone (`ladder` null), or No level. */
export interface StepGroup { ladder: string | null; label: string; steps: StepInfo[] }

/** A tool's steps as the page lists them: one group per ladder in `TOOL_LADDERS` order, then No level; a tool with no ladder is one group, the tool. */
export function stepGroups(tool: string): StepGroup[] {
  const ids = Object.hasOwn(TOOL_LADDERS, tool) ? TOOL_LADDERS[tool] : [];
  if (!ids.length) return [{ ladder: null, label: "The tool", steps: [{ step: null, name: "Every exercise with this tool", holds: "" }] }];
  const groups: StepGroup[] = ids.flatMap((id) => {
    const l = LADDERS.find((x) => x.id === id);
    return l ? [{ ladder: id, label: l.label, steps: l.steps.map((s) => ({ step: `${id}:${s.key}`, name: s.name, holds: s.holds })) }] : [];
  });
  return [...groups, { ladder: null, label: "No level", steps: [{ step: NO_LEVEL, name: "No level", holds: "Exercises with this tool that set no level" }] }];
}

/** The key a step is counted under in `SeedUse`: the step, or "" for a tool with no ladder. */
export const stepKey = (step: string | null): string => step ?? "";

/** Which seed blocks use each tool at each step: tool key → `stepKey(step)` → block ids, sorted, each once. */
export type SeedUse = Record<string, Record<string, string[]>>;

/** Counts the seed blocks by the tool cells each draws (every choice of a block, each block once per tool and step). */
export function seedUse(blocks: { id: string; asks: CellAsk[] }[]): SeedUse {
  const out = new Map<string, Map<string, Set<string>>>();
  for (const b of blocks) {
    for (const a of b.asks) {
      const byStep = out.get(a.tool) ?? new Map<string, Set<string>>();
      out.set(a.tool, byStep);
      const ids = byStep.get(stepKey(a.step)) ?? new Set<string>();
      byStep.set(stepKey(a.step), ids);
      ids.add(b.id);
    }
  }
  return Object.fromEntries([...out].map(([tool, byStep]) => [tool, Object.fromEntries([...byStep].map(([k, ids]) => [k, [...ids].sort()]))]));
}

/** A step of a tool as the page shows it: the video covering it (null: Missing) and the seed blocks that use the tool there. */
export interface StepCover extends StepInfo { video: string | null; blocks: string[] }

/** The video holding a step of a tool: its steps hold it, or for a tool with no ladder, its steps are null. */
const holder = (tool: string, step: string | null, videos: ToolVideo[]): string | null =>
  videos.find((v) => v.tool === tool && (step === null ? v.steps === null : (v.steps?.includes(step) ?? false)))?.id ?? null;

/** A tool's step groups, each step with its video and the seed blocks using it. */
export interface GroupCover { ladder: string | null; label: string; steps: StepCover[] }

export function coverage(tool: string, videos: ToolVideo[], use: SeedUse): GroupCover[] {
  const mine = Object.hasOwn(use, tool) ? use[tool] : {};
  return stepGroups(tool).map((g) => ({
    ...g,
    steps: g.steps.map((s) => ({ ...s, video: holder(tool, s.step, videos), blocks: Object.hasOwn(mine, stepKey(s.step)) ? mine[stepKey(s.step)] : [] })),
  }));
}

/** How many of a tool's steps have a video, of how many. */
export function coveredCount(tool: string, videos: ToolVideo[]): { covered: number; of: number } {
  const steps = stepGroups(tool).flatMap((g) => g.steps);
  return { covered: steps.filter((s) => holder(tool, s.step, videos) !== null).length, of: steps.length };
}

/** A tool key as a person reads it: `picking-drill`, `guitar-play-along: riff`. */
export const toolName = (tool: string): string => tool.replace(":", ": ");

/**
 * What saving a tool video for `steps` would take off the tool's other videos, as the repo will (`takeSteps`): each video
 * that holds one of them, with the steps it would lose (by id; `steps` null for a tool with no ladder: the video that holds
 * the tool loses it). `except` is the video being re-ticked, never its own loser.
 */
export function wouldLose(tool: string, steps: string[] | null, videos: ToolVideo[], except?: string): { id: string; steps: string[] | null }[] {
  return videos.flatMap((v): { id: string; steps: string[] | null }[] => {
    if (v.id === except || v.tool !== tool) return [];
    if (steps === null) return v.steps === null ? [{ id: v.id, steps: null }] : [];
    const lost = (v.steps ?? []).filter((s) => steps.includes(s));
    return lost.length ? [{ id: v.id, steps: lost }] : [];
  });
}

/** The levels a video covers, for a person: "the whole tool", "every level and No level", "beginner", "new, beginner and No level". */
export function levelsText(tool: string, steps: string[] | null): string {
  if (steps === null) return "the whole tool";
  const all = stepGroups(tool).flatMap((g) => g.steps);
  if (all.every((s) => s.step !== null && steps.includes(s.step))) return "every level and No level";
  const names = new Map(all.map((s) => [s.step, s.name]));
  const list = steps.map((s) => names.get(s) ?? s);
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}
