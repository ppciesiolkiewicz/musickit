import { MAX_BPM as BACKING_MAX_BPM, MIN_BPM as BACKING_MIN_BPM } from "@/features/backing/model";
import { TOOL_LEVELS } from "@/features/exercises/basics/levels";
import { keyName } from "@/features/theory/keySlug";
import { PART_NAMES, canFollowPart, hasLevel, setLevel, toolsOf, type Cell, type Choice, type ChoiceOption, type PartName, type PlainCell, type PlanTool, type SectionCell } from "./tools";
import { transposeTool } from "./transpose";
import type { Block } from "./types";

/**
 * A choice is a layer over the tools under it. On a block it reaches every cell; a section's own choice wins inside
 * that section. With `options` the student picks a chip and the tools are set to it (the tools are written as option
 * 1); with `open` the tools are written in the open value and follow it. A tool keeps its own value for a part it has
 * in `pinned`. Pure: the tools keep receiving plain props and know nothing about the chooser. A new part is one entry
 * in `PARTS`.
 */

type PartValue = number | string;

interface Part {
  /** the tool set to `value`; `first` is option 1's value (a tool with no key of its own moves by the distance from it) */
  apply(tool: PlanTool, value: PartValue, first: PartValue): PlanTool;
  /** what the tool is written with, to compare with option 1; null when it has no single value */
  written(tool: PlanTool): PartValue | null;
  /** the paste warning when no tool under the choice follows it */
  none: string;
  /** the value in words, for a warning */
  say(value: PartValue): string;
}

const pc = (n: number) => ((n % 12) + 12) % 12;
const writtenKey = (t: PlanTool): number | null => ("key" in t && typeof t.key === "number" ? t.key : null);
const num = (v: PartValue): number => (typeof v === "number" ? v : Number(v));

const PARTS: Record<PartName, Part> = {
  key: {
    // from the tool's own key, so the tool lands on the chip's key also when it was written in another one than option 1;
    // a tool that only has chord names moves by the distance from option 1
    apply: (tool, value, first) => transposeTool(tool, num(value) - (writtenKey(tool) ?? num(first))),
    written: writtenKey,
    none: "no tool that can change key",
    say: (v) => keyName(num(v)),
  },
  scale: {
    apply: (tool, value) => (canFollowPart(tool, "scale") ? ({ ...tool, scale: String(value) } as PlanTool) : tool),
    written: (t) => ("scale" in t && typeof t.scale === "string" ? t.scale : null),
    none: "no tool with a scale",
    say: (v) => String(v),
  },
  bpm: {
    apply: (tool, value) => (tool.type === "backing-track" ? { ...tool, bpm: Math.min(BACKING_MAX_BPM, Math.max(BACKING_MIN_BPM, num(value))) } : canFollowPart(tool, "bpm") ? ({ ...tool, bpm: num(value) } as PlanTool) : tool),
    written: (t) => ("bpm" in t && typeof t.bpm === "number" ? t.bpm : null),
    none: "no tool with a tempo",
    say: (v) => `${v} bpm`,
  },
  position: {
    apply: (tool, value) => (tool.type === "scale-neck" ? { ...tool, boxes: [num(value)] } : tool.type === "position-neck" && !tool.cross ? { ...tool, positions: [num(value)] } : tool),
    written: (t) => {
      const shown = t.type === "scale-neck" ? t.boxes : t.type === "position-neck" ? t.positions : undefined;
      return shown?.length === 1 ? shown[0] : null;
    },
    none: "no neck that shows one position",
    say: (v) => `position ${v}`,
  },
  level: {
    // the level's own settings replace the tool's (`setLevel`); an index outside the levels leaves the tool alone
    apply: (tool, value) => (TOOL_LEVELS[num(value)] ? setLevel(tool, TOOL_LEVELS[num(value)]) : tool),
    written: (t) => (hasLevel(t) && t.level ? TOOL_LEVELS.indexOf(t.level) : null),
    none: "no tool that takes a level",
    say: (v) => TOOL_LEVELS[num(v)] ?? String(v),
  },
};

const PART_WORD: Record<PartName, string> = { key: "key", scale: "scale", bpm: "tempo", position: "position", level: "level" };

export const isOpen = (c: Choice): c is { open: ChoiceOption } => "open" in c;

/** The parts a choice sets: option 1's, or the open value's, in chip order. */
export function partsOf(choice: Choice): PartName[] {
  const first = isOpen(choice) ? choice.open : choice.options[0];
  return first ? PART_NAMES.filter((p) => first[p] !== undefined) : [];
}

/** The option a choice is at: `options[index]` (an index outside them: option 1), or the open value. */
export function valueOf(choice: Choice, index: number): ChoiceOption {
  return isOpen(choice) ? choice.open : (choice.options[index] ?? choice.options[0] ?? {});
}

/** Whether a choice's part moves this tool: it can follow it and has not pinned it. */
export function follows(tool: PlanTool, part: PartName): boolean {
  return canFollowPart(tool, part) && !tool.pinned?.includes(part);
}

/** A tool set to an option: every part the tool follows. */
function applyTo(tool: PlanTool, option: ChoiceOption, first: ChoiceOption): PlanTool {
  let out = tool;
  for (const p of PART_NAMES) {
    const value = option[p], base = first[p];
    if (value !== undefined && base !== undefined && follows(out, p)) out = PARTS[p].apply(out, value, base);
  }
  return out;
}

/**
 * The cells under a choice set to its value at `index` (`valueOf`): their tool cells only; text stays (its `{{3}}` dots
 * read the moved tools). Option 1 is applied too, so the screen always shows what its chip says, also when the tools
 * were written with another key, tempo or position. A section cell is left alone: the caller applies the section's own
 * choice, or this one, to the section's cells.
 */
export function applyChoice<T extends Cell>(cells: T[], choice: Choice, index: number): T[] {
  const first = isOpen(choice) ? choice.open : choice.options[0];
  if (!first) return cells;
  const option = valueOf(choice, index);
  return cells.map((s) => {
    if (s.type !== "tool") return s;
    const tool = applyTo(s.tool, option, first);
    return tool === s.tool ? s : ({ type: "tool", tool } as T);
  });
}

/** The choice that reaches a section's cells (its own, else the block's), or the block's own cells (the block's). */
export const resolvedChoice = (block: Pick<Block, "choice">, section?: SectionCell): Choice | undefined => section?.choice ?? block.choice;

/**
 * A section's cells under both choices, part by part: the block's choice first (at `blockIndex`), then the section's own
 * (at `sectionIndex`), so a part the section sets wins and the parts it doesn't set come from the block. Either choice may
 * be absent.
 */
export function applyUnder<T extends Cell>(cells: T[], blockChoice: Choice | undefined, blockIndex: number, sectionChoice: Choice | undefined, sectionIndex: number): T[] {
  const under = blockChoice ? applyChoice(cells, blockChoice, blockIndex) : cells;
  return sectionChoice ? applyChoice(under, sectionChoice, sectionIndex) : under;
}

/** One part of a block as drawn: a run of the block's own cells in document order (`section` null), or a section. `from` is where its cells start in `cellsOf(cells)`. */
export interface LayoutPart { section: SectionCell | null; cells: PlainCell[]; from: number }

/** The block's cells grouped as they are drawn, in document order: each section is a part, and each run of own cells between sections is a part. */
export function layoutParts(cells: Cell[]): LayoutPart[] {
  const parts: LayoutPart[] = [];
  let from = 0;
  for (const c of cells) {
    if (c.type === "section") {
      parts.push({ section: c, cells: c.cells, from });
      from += c.cells.length;
      continue;
    }
    const last = parts[parts.length - 1];
    if (last && !last.section) last.cells = [...last.cells, c];
    else parts.push({ section: null, cells: [c], from });
    from += 1;
  }
  return parts;
}

/**
 * What's wrong with the choices of a block: nothing to move, a tool that can't change key, a part no tool has, an
 * option 1 that isn't how the tools are written, a tool written in another value than an open choice (it will follow).
 * Worded to be pasted back to the AI. A section's tools are under the block's choice for every part the section's own
 * choice does not set.
 */
export function choiceWarnings(block: Pick<Block, "choice" | "cells">): string[] {
  const out: string[] = [];
  const own = block.cells.filter((c): c is Exclude<Cell, SectionCell> => c.type !== "section");
  const sections = block.cells.filter((c): c is SectionCell => c.type === "section");
  if (block.choice) {
    const under: Under[] = [
      ...toolsOf(own).map((tool) => ({ tool, parts: null })),
      ...sections.flatMap((s) => toolsOf(s.cells).map((tool) => ({ tool, parts: s.choice ? partsOf(s.choice) : null }))),
    ];
    check(block.choice, under, "the block", out);
  }
  for (const s of sections) if (s.choice) check(s.choice, toolsOf(s.cells).map((tool) => ({ tool, parts: null })), `"${s.heading}"`, out);
  return out;
}

/** A tool under a choice, with the parts another choice already sets on it (null: none). */
interface Under { tool: PlanTool; parts: PartName[] | null }

function check(choice: Choice, under: Under[], name: string, out: string[]): void {
  const what = isOpen(choice) ? "an open choice" : "a choice";
  const parts = partsOf(choice);
  // the tools this choice can reach for at least one of its parts
  const reach = under.filter((u) => parts.some((p) => !u.parts?.includes(p)));
  if (!reach.length) {
    out.push(`${name} has ${what}, but no tool for it to move.`);
    return;
  }
  const first = valueOf(choice, 0);
  const off: string[] = [];
  for (const p of parts) {
    const tools = under.filter((u) => !u.parts?.includes(p)).map((u) => u.tool);
    const followers = tools.filter((t) => follows(t, p));
    if (p === "key") {
      const stuck = tools.filter((t) => !canFollowPart(t, p)).map((t) => t.type);
      if (stuck.length) out.push(`${name} has ${what} with keys, but ${[...new Set(stuck)].join(", ")} can't change key.`);
    } else if (!followers.length) out.push(`${name} has ${what} with a ${PART_WORD[p]}, but ${PARTS[p].none}.`);
    const value = first[p]!;
    const same = (w: PartValue) => (p === "key" ? pc(num(w)) === pc(num(value)) : w === value);
    if (isOpen(choice)) {
      for (const t of followers) {
        const w = PARTS[p].written(t);
        if (w !== null && !same(w)) out.push(`${name}: ${t.type} written in ${PARTS[p].say(w)} under a choice in ${PARTS[p].say(value)}; it will follow ${PARTS[p].say(value)}.`);
      }
    } else {
      const written = followers.map(PARTS[p].written).find((v) => v !== null);
      if (written !== undefined && written !== null && !same(written)) off.push(PART_WORD[p]);
    }
  }
  if (off.length) out.push(`${name}: the choice's option 1 should match the tools as written (its ${off.join(" and ")}).`);
}
