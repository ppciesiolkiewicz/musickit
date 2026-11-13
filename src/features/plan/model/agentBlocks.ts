import type { CatalogueEntry } from "./catalogue";
import { parseBlock, parseExercise } from "./config";
import { draftOf, editDay } from "./editPlan";
import { DEFAULT_ANSWERS } from "../intake/answers";
import { promptParts } from "./prompt";
import { doneKey } from "./schedule";
import type { Cell } from "./tools";
import type { Block, PlanExercise, StoredPlan } from "./types";

/**
 * What the browser's AI reads back from the block tools (`ui/useBlockAgentTools.ts`): the authoring guide, a note or the running
 * week as JSON, and the result of writing, inserting or removing a block, worded for the AI. Every change to the plan goes
 * through `editDay`, so a changed exercise is a new one and a day keeps 2 to 5 exercises.
 */

/** A place on the running plan, 1-based as the week shows it. */
export type Where = { day: number; exercise: number };

/** The prompt parts that are about the student or the plan's own answer: not in the guide. */
const NOT_IN_GUIDE = new Set(["intro", "student", "week", "progress", "history", "course", "how-to-plan", "answer-format"]);

const NOTE_PART = [
  "### Notes",
  "A note is one block: a title, an optional choice, and cells. It has no days and needs no minutes; why, links and tags are optional on a note. On the notes creator, write the whole note with write_block (no \"where\").",
  "On the running plan, an exercise is a block with its metadata, as the exercise format says; write_block replaces one, insert_block adds one, remove_block takes one away. A day keeps 2 to 5 exercises.",
].join("\n");

/** The definitions, rules and examples of the plan prompt without the student, plus what a note is. */
export function authoringGuide(entries: CatalogueEntry[]): string {
  // the whole example week is left out too: it is about a week's answer, and it is most of the prompt's length
  const parts = promptParts(DEFAULT_ANSWERS, entries).filter((p) => !NOT_IN_GUIDE.has(p.id) && p.kind !== "plan-example");
  return [...parts.map((p) => p.text), NOTE_PART].join("\n\n");
}

/** A cell without the editor's id (a section's cells too); a tool's own fields, a video's `ref.id` among them, are kept. */
const cellNoId = (c: Cell): unknown => {
  const { id: _id, ...rest } = c;
  void _id;
  return rest.type === "section" ? { ...rest, cells: rest.cells.map(cellNoId) } : rest;
};
/** A block or exercise as the AI reads it: its JSON without its own id and its cells' ids. */
const json = (x: Block | PlanExercise) => {
  const { id: _id, ...rest } = x as Block & { id?: string };
  void _id;
  return JSON.stringify({ ...rest, cells: x.cells.map(cellNoId) }, null, 2);
};

const asObject = (raw: unknown): unknown => {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const warningsText = (warnings: string[]) => (warnings.length ? ["The page changed or left out:", ...warnings.map((w) => `- ${w}`)].join("\n") : "Nothing to fix.");

export function readNoteReply(block: Block): string {
  return `The note:\n${json(block)}`;
}

/** The note the AI sent, read by the one parser; refused when it can't be read or has no cells. */
export function writeNote(raw: unknown): { block: Block | null; reply: string } {
  const obj = asObject(raw);
  if (!obj || typeof obj !== "object") return { block: null, reply: "The page could not read this as a note. Send the whole note as one JSON object: { \"title\", \"cells\": [...] }." };
  const { block, warnings } = parseBlock(obj);
  if (!block.cells.length) return { block: null, reply: `Refused: the note has no cells it could show.${warnings.length ? `\n${warningsText(warnings)}` : ""}` };
  return { block, reply: `The note "${block.title}" is on the page.\n${warningsText(warnings)}` };
}

const starsOf = (plan: StoredPlan, d: number, e: number): string => {
  const r = plan.rated?.[doneKey(d, e)];
  return r ? `rated ${r.stars} stars` : plan.done[doneKey(d, e)] ? "done" : "not rated";
};

/** The whole running week: each exercise's JSON and how it went. */
export function readPlanReply(plan: StoredPlan): string {
  return plan.config.days
    .map((d, di) => [`## Day ${di + 1}: ${d.theme}`, ...d.exercises.map((e, ei) => `### Exercise ${ei + 1} (${starsOf(plan, di, ei)})\n${json(e)}`)].join("\n\n"))
    .join("\n\n");
}

/**
 * A `where` read and checked: 0-based indexes, or why not. `insert`: one past the last exercise is allowed. `editing`: the day
 * (0-based) the player has open in the day editor, which the AI leaves alone until they press Done.
 */
function placeOf(plan: StoredPlan, where: unknown, insert = false, editing: number | null = null): { day: number; ex: number } | { why: string } {
  const w = (asObject(where) ?? {}) as Partial<Where>;
  const days = plan.config.days.length;
  const day = Number(w.day);
  if (!Number.isInteger(day) || day < 1 || day > days) return { why: `"where" needs a day 1 to ${days} and an exercise number.` };
  const n = plan.config.days[day - 1].exercises.length + (insert ? 1 : 0);
  const ex = Number(w.exercise);
  if (!Number.isInteger(ex) || ex < 1 || ex > n) return { why: `Day ${day} takes exercise 1 to ${n}.` };
  if (editing === day - 1) return { why: `the player is editing day ${day} on the page; try again once they press Done.` };
  return { day: day - 1, ex: ex - 1 };
}

export function readExerciseReply(plan: StoredPlan, where: unknown): string {
  const at = placeOf(plan, where);
  if ("why" in at) return `Refused: ${at.why}`;
  return `Day ${at.day + 1}, exercise ${at.ex + 1} (${starsOf(plan, at.day, at.ex)}):\n${json(plan.config.days[at.day].exercises[at.ex])}`;
}

/** An exercise the AI sent, read as a paste reads it; refused with no cells or no learnBefore. */
function readExercise(raw: unknown, where: string, entries: CatalogueEntry[]): { exercise: PlanExercise; warnings: string[] } | { why: string } {
  const obj = asObject(raw) as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== "object") return { why: "the page could not read this as an exercise; send one JSON object." };
  if (!Array.isArray(obj.cells) || !obj.cells.length) return { why: "the exercise has no cells." };
  const { block, warnings } = parseExercise(obj, where, entries);
  const said = warnings.length ? `\n${warningsText(warnings)}` : "";
  if (!block) return { why: "the exercise has no title." };
  // every cell sent was left out: the parser put the title in as a text, which is no exercise
  if (warnings.some((w) => /no instructions/.test(w))) return { why: `every cell was left out.${said}` };
  if (!block.learnBefore?.length) return { why: `the exercise has no learnBefore link; add an attunr page to learn first.${said}` };
  return { exercise: block, warnings: warnings.filter((w) => !/no instructions/.test(w)) };
}

type Change = { plan: StoredPlan | null; reply: string };

function applied(plan: StoredPlan, day: number, exercises: { from: number | null; exercise: PlanExercise }[], newId: () => string, said: string, warnings: string[] = []): Change {
  const next = editDay(plan, day, { exercises }, newId);
  if ("refused" in next) return { plan: null, reply: `Refused: ${next.refused}` };
  return { plan: next, reply: `${said} The page shows it now.\n${warningsText(warnings)}` };
}

/** write_block on the plan: the exercise replaced, saved at once under a new id (its stars and tick cleared). */
export function writeExercise(plan: StoredPlan, where: unknown, raw: unknown, entries: CatalogueEntry[], newId: () => string, editing: number | null = null): Change {
  const at = placeOf(plan, where, false, editing);
  if ("why" in at) return { plan: null, reply: `Refused: ${at.why}` };
  const r = readExercise(raw, `day ${at.day + 1} exercise ${at.ex + 1}`, entries);
  if ("why" in r) return { plan: null, reply: `Refused: ${r.why}` };
  const ex = draftOf(plan, at.day).exercises;
  ex[at.ex] = { from: at.ex, exercise: r.exercise };
  return applied(plan, at.day, ex, newId, `Day ${at.day + 1}, exercise ${at.ex + 1} is now "${r.exercise.title}".`, r.warnings);
}

/** insert_block: a new exercise before `exercise` (one past the last: at the end). */
export function insertExercise(plan: StoredPlan, where: unknown, raw: unknown, entries: CatalogueEntry[], newId: () => string, editing: number | null = null): Change {
  const at = placeOf(plan, where, true, editing);
  if ("why" in at) return { plan: null, reply: `Refused: ${at.why}` };
  const r = readExercise(raw, `day ${at.day + 1} new exercise`, entries);
  if ("why" in r) return { plan: null, reply: `Refused: ${r.why}` };
  const ex = draftOf(plan, at.day).exercises;
  ex.splice(at.ex, 0, { from: null, exercise: r.exercise });
  return applied(plan, at.day, ex, newId, `Day ${at.day + 1} has a new exercise ${at.ex + 1}, "${r.exercise.title}".`, r.warnings);
}

/** remove_block: the exercise taken out (its rating goes with it). */
export function removeExercise(plan: StoredPlan, where: unknown, newId: () => string, editing: number | null = null): Change {
  const at = placeOf(plan, where, false, editing);
  if ("why" in at) return { plan: null, reply: `Refused: ${at.why}` };
  const ex = draftOf(plan, at.day).exercises.filter((_, i) => i !== at.ex);
  return applied(plan, at.day, ex, newId, `Day ${at.day + 1}, exercise ${at.ex + 1} is gone.`);
}
