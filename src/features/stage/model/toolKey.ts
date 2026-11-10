/**
 * A plan tool's key, as the stage's `tool` subject moves it: the adapter between the master's tonic and the learning
 * components' `key` pitch class (an arpeggio's chord root). The scale slug is the tool's own and never follows the master.
 */
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { PlanTool, ToolName } from "@/features/plan/model/tools";
import { transposeTool } from "@/features/plan/model/transpose";

/** The learning components a stage may hold as widgets; the families draw from these. */
export const STAGE_TOOLS: ToolName[] = ["scale-neck", "position-neck", "arpeggio-neck", "chord-shapes", "staff", "melody-singer", "run-singer", "backing-track"];

/** The tool's key as a pitch class (an arpeggio's chord root), or null when it has none (chord shapes, games without a key). */
export function toolKey(tool: PlanTool): number | null {
  if (tool.type === "arpeggio-neck") return parseChordQuery(tool.chord)?.rootPc ?? null;
  return "key" in tool && typeof tool.key === "number" ? tool.key : null;
}

/** The tool moved to the key `pc`: pitch classes and chord names move with it, degrees stay. A tool without a key comes back as it is. */
export function withToolKey(tool: PlanTool, pc: number): PlanTool {
  const key = toolKey(tool);
  return key === null ? tool : transposeTool(tool, pc - key);
}
