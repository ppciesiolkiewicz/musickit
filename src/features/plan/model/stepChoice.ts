import { MAX_BPM as BACKING_MAX_BPM, MIN_BPM as BACKING_MIN_BPM } from "@/features/backing/model";
import { TOOL_LEVELS } from "@/features/exercises/basics/levels";
import { hasLevel, setLevel, type PlanTool, type Section, type StepOption } from "./tools";
import { canTranspose, stepsOf, transposeTool, type Step } from "./transpose";

/**
 * A step with a `step-choice` tool: the tool lists 2-4 `options`, the student picks one, and every other tool in the step
 * (heading to heading) is set to it. An option holds parts (a key, a tempo, a position, a level), the same parts in every option;
 * the step's tools are written as option 1. Pure: the tools keep receiving plain props and know nothing about the chooser.
 * A new part is one entry in `PARTS`.
 */

export type PartName = "key" | "bpm" | "position" | "level";
/** The parts in the order a chip lists them. */
export const PART_NAMES: PartName[] = ["key", "bpm", "position", "level"];

type Chooser = Extract<PlanTool, { type: "step-choice" }>;

interface Part {
  /** whether the tool has this part to set */
  follows(tool: PlanTool): boolean;
  /** the tool set to `value`; `first` is option 1's value (a tool with no key of its own moves by the distance from it) */
  apply(tool: PlanTool, value: number, first: number): PlanTool;
  /** what the tool is written with, to compare with option 1; null when it has no single value */
  written(tool: PlanTool): number | null;
  /** the paste warning when no tool in the step follows it */
  none: string;
}

const pc = (n: number) => ((n % 12) + 12) % 12;
const hasBpm = (t: PlanTool): t is Extract<PlanTool, { bpm?: number }> =>
  t.type === "staff" ? t.click === true : ["backing-band", "backing-track", "guitar-play-along", "strum-along", "finger-pattern", "picking-drill", "legato-trill"].includes(t.type);

const writtenKey = (t: PlanTool): number | null => ("key" in t && typeof t.key === "number" ? t.key : null);

const PARTS: Record<PartName, Part> = {
  key: {
    follows: canTranspose,
    // from the tool's own key, so the tool lands on the chip's key also when it was written in another one than option 1;
    // a tool that only has chord names moves by the distance from option 1
    apply: (tool, value, first) => transposeTool(tool, value - (writtenKey(tool) ?? first)),
    written: writtenKey,
    none: "no tool that can change key",
  },
  bpm: {
    follows: hasBpm,
    apply: (tool, value) => (tool.type === "backing-track" ? { ...tool, bpm: Math.min(BACKING_MAX_BPM, Math.max(BACKING_MIN_BPM, value)) } : hasBpm(tool) ? { ...tool, bpm: value } : tool),
    written: (t) => ("bpm" in t && typeof t.bpm === "number" ? t.bpm : null),
    none: "no tool with a tempo",
  },
  position: {
    follows: (t) => t.type === "scale-neck" || (t.type === "position-neck" && !t.cross),
    apply: (tool, value) => (tool.type === "scale-neck" ? { ...tool, boxes: [value] } : tool.type === "position-neck" && !tool.cross ? { ...tool, positions: [value] } : tool),
    written: (t) => {
      const shown = t.type === "scale-neck" ? t.boxes : t.type === "position-neck" ? t.positions : undefined;
      return shown?.length === 1 ? shown[0] : null;
    },
    none: "no neck that shows one position",
  },
  level: {
    follows: hasLevel,
    // the level's own settings replace the tool's (`setLevel`); an index outside the levels leaves the tool alone
    apply: (tool, value) => (TOOL_LEVELS[value] ? setLevel(tool, TOOL_LEVELS[value]) : tool),
    written: (t) => (hasLevel(t) && t.level ? TOOL_LEVELS.indexOf(t.level) : null),
    none: "no tool that takes a level",
  },
};

/** The parts a chooser's options set: option 1's, in chip order. */
export function partsOf(options: StepOption[]): PartName[] {
  const first = options[0];
  return first ? PART_NAMES.filter((p) => typeof first[p] === "number") : [];
}

/** Whether a tool can be set to this part of an option; the chooser itself never. */
export function canFollow(tool: PlanTool, part: PartName): boolean {
  return tool.type !== "step-choice" && PARTS[part].follows(tool);
}

/** A tool set to an option: every part the tool can follow. */
function applyTo(tool: PlanTool, option: StepOption, first: StepOption): PlanTool {
  let out = tool;
  for (const p of PART_NAMES) {
    const value = option[p], base = first[p];
    if (typeof value === "number" && typeof base === "number" && canFollow(out, p)) out = PARTS[p].apply(out, value, base);
  }
  return out;
}

/**
 * The sections of a step set to option `index` (an index outside the options: option 1): its tools only; text stays (its
 * `{{3}}` dots read the moved tools), and so does the chooser. Option 1 is applied too, so the screen always shows what
 * its chip says, also when the tools were written with another key, tempo or position.
 */
export function applyOption(sections: Section[], options: StepOption[], index: number): Section[] {
  const first = options[0];
  if (!first) return sections;
  const option = options[index] ?? first;
  return sections.map((s) => {
    if (s.type !== "tool") return s;
    const tool = applyTo(s.tool, option, first);
    return tool === s.tool ? s : { type: "tool", tool };
  });
}

/** A step's chooser: its first `step-choice`; null when it has none. */
export function stepChoice(sections: Section[], step: Step): Chooser | null {
  for (let i = step.from; i < step.to; i++) {
    const s = sections[i];
    if (s.type === "tool" && s.tool.type === "step-choice") return s.tool;
  }
  return null;
}

const PART_WORD: Record<PartName, string> = { key: "key", bpm: "tempo", position: "position", level: "level" };

/**
 * What's wrong with the steps that hold a step-choice: more than one, nothing to move, a tool that can't change key, a
 * part no tool has, or an option 1 that isn't how the tools are written. Worded to be pasted back to the AI.
 */
export function choiceWarnings(sections: Section[]): string[] {
  const out: string[] = [];
  for (const step of stepsOf(sections)) {
    const chooser = stepChoice(sections, step);
    if (!chooser) continue;
    const h = sections[step.head];
    const name = h?.type === "heading" ? `"${h.text}"` : "the intro";
    const all = sections.slice(step.from, step.to).flatMap((s) => (s.type === "tool" ? [s.tool] : []));
    const tools = all.filter((t) => t.type !== "step-choice");
    if (all.length - tools.length > 1) out.push(`${name} has more than one step-choice; only the first is used.`);
    if (!tools.length) {
      out.push(`${name} has a step-choice, but no tool for it to move.`);
      continue;
    }
    const first = chooser.options[0];
    const off: string[] = [];
    for (const p of partsOf(chooser.options)) {
      const followers = tools.filter((t) => canFollow(t, p));
      if (p === "key") {
        const stuck = tools.filter((t) => !canFollow(t, p)).map((t) => t.type);
        if (stuck.length) out.push(`${name} has a step-choice with keys, but ${[...new Set(stuck)].join(", ")} can't change key.`);
      } else if (!followers.length) out.push(`${name} has a step-choice with a ${PART_WORD[p]}, but ${PARTS[p].none}.`);
      const written = followers.map(PARTS[p].written).find((v) => v !== null);
      if (written !== undefined && written !== null && (p === "key" ? pc(written) !== pc(first[p]!) : written !== first[p])) off.push(PART_WORD[p]);
    }
    if (off.length) out.push(`${name}: the step-choice's option 1 should match the tools as written (its ${off.join(" and ")}).`);
  }
  return out;
}
