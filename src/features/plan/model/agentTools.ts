import { parseToolDiag, toolInterface, type PlanTool } from "./tools";
import { COMPONENT_DOCS } from "@/features/exercises/docs";

/**
 * What the browser's AI (WebMCP) reads and gets back from the app-wide exercise tools (`ui/AgentExerciseTools.tsx`):
 * the tool list is the prompt's own (`toolInterface`, from `COMPONENT_DOCS`) and a tool it sends is checked with the
 * plan's parser, so a tool that shows here shows the same in a plan.
 */

/** Put before the plan prompt when the AI reads it through `get_practice_plan_prompt`: the prompt is written for a chat reply. */
export const PROMPT_VIA_TOOLS =
  "You are reading this prompt through the page's tools, not from a paste. Where it says to reply with a JSON code block, send that JSON object with submit_practice_plan instead. If it says to ask the student questions first, ask them in your chat, then send the plan.";

/** The names `show_exercise_tool` takes. */
export const toolNames = (): string[] => COMPONENT_DOCS.filter((d) => d.kind !== "shape").map((d) => d.name);

/** The `list_exercise_tools` answer: every tool with its props, or only the named ones. */
export function listToolsReply(names?: unknown): string {
  const all = toolInterface();
  const wanted = Array.isArray(names) ? names.filter((n): n is string => typeof n === "string") : [];
  const picked = wanted.length ? all.filter((t) => wanted.some((n) => t.startsWith(`- ${n} :`))) : all;
  const head = "Exercise tools the page can show with show_exercise_tool({ tool: { type, ...props } }). Degrees are strings (\"b3\", \"5\"); keys are note names (\"a\", \"f-sharp\").";
  if (!picked.length) return `No tool named ${wanted.join(", ")}. Tools: ${toolNames().join(", ")}.`;
  return [head, ...picked].join("\n");
}

/** A `show_exercise_tool` input, parsed: the tool to show, or none, and what to tell the AI. */
export function showToolReply(raw: unknown): { tool: PlanTool | null; reply: string } {
  const input = typeof raw === "string" ? safeJson(raw) : raw;
  const { tool, dropped, notes } = parseToolDiag(input);
  if (!tool) return { tool, reply: `Not shown: ${dropped ?? "it can't be shown"}. Call list_exercise_tools for the tools and their props.` };
  const shown = `Showing ${tool.type} to the student.`;
  return { tool, reply: notes.length ? [`${shown} The page changed some things:`, ...notes.map((n) => `- ${n}`)].join("\n") : shown };
}

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};
