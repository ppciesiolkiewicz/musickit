import { mixesSingAndPlay, tempoWithoutMetronome } from "./checks";
import { choiceWarnings } from "./choice";
import { hashtagLine, readTitle } from "./hashtags";
import { exerciseTags, toolsOf, type Cell } from "./tools";
import type { Block, PlanExercise, StoredPlan } from "./types";

/**
 * A day of the running plan, edited as a draft and applied on Done. Ratings, ticks and time spent are keyed `day:index`, so they
 * move with their exercise; an exercise that changed is a new one (new id, its state cleared; the progress log keeps its old
 * row under the old id); the day's elapsed time stays.
 */

/** The day's exercises in their new order; `from` is each one's index before the edit, null for a new one. */
export interface DayDraft { exercises: { from: number | null; exercise: PlanExercise }[] }

export const MIN_EXERCISES = 2;
export const MAX_EXERCISES = 5;

/** The day as it stands, as a draft to edit. */
export function draftOf(plan: StoredPlan, day: number): DayDraft {
  return { exercises: (plan.config.days[day]?.exercises ?? []).map((exercise, from) => ({ from, exercise })) };
}

const noIds = (cells: Cell[]): unknown =>
  cells.map((c) => {
    const { id: _id, ...rest } = c as Cell & { id?: string };
    void _id;
    return rest.type === "section" ? { ...rest, cells: noIds(rest.cells) } : rest;
  });

/** The same exercise, cell ids aside (the editor gives cells ids; they say nothing about what the exercise is). */
export function sameExercise(a: PlanExercise, b: PlanExercise): boolean {
  const flat = (e: PlanExercise) => JSON.stringify({ ...e, cells: noIds(e.cells) });
  return flat(a) === flat(b);
}

/** A `day:index` keyed record with the day's entries moved to their new places (`to[old]`, absent: dropped). */
function rekey<V>(rec: Record<string, V> | undefined, day: number, to: Map<number, number>): Record<string, V> | undefined {
  if (!rec) return rec;
  const out: Record<string, V> = {};
  for (const [k, v] of Object.entries(rec)) {
    const [d, i] = k.split(":").map(Number);
    if (d !== day) out[k] = v;
    else if (to.has(i)) out[`${day}:${to.get(i)}`] = v;
  }
  return out;
}

/** The plan with day `day` replaced by the draft, or why not (the 2–5 rule). The same plan when nothing changed. */
export function editDay(plan: StoredPlan, day: number, draft: DayDraft, newId: () => string): StoredPlan | { refused: string } {
  const n = draft.exercises.length;
  if (n < MIN_EXERCISES || n > MAX_EXERCISES) return { refused: `A day has ${MIN_EXERCISES} to ${MAX_EXERCISES} exercises.` };
  const before = plan.config.days[day]?.exercises ?? [];
  // an exercise keeps its id and its state only where it is untouched
  const to = new Map<number, number>();
  const exercises = draft.exercises.map(({ from, exercise }, i) => {
    const old = from === null ? undefined : before[from];
    if (old && sameExercise(old, exercise)) {
      to.set(from!, i);
      return old;
    }
    return { ...exercise, id: newId() };
  });
  const untouched = exercises.length === before.length && exercises.every((e, i) => e === before[i]);
  if (untouched) return plan;
  const days = plan.config.days.map((d, i) => (i === day ? { ...d, exercises } : d));
  return {
    ...plan,
    config: { ...plan.config, days },
    done: rekey(plan.done, day, to) ?? {},
    ...(plan.rated ? { rated: rekey(plan.rated, day, to) } : {}),
    ...(plan.spent ? { spent: rekey(plan.spent, day, to) } : {}),
  };
}

/** What the day editor's meta form shows of an exercise: the title with its hashtags, minutes, why, the two link slots. */
export interface ExerciseMeta { titleText: string; minutes: number; why: string; learnBefore: string[]; exploreMore: string[] }

export const metaOf = (e: PlanExercise): ExerciseMeta => ({
  titleText: [e.title, hashtagLine(e)].filter(Boolean).join(" "),
  minutes: e.minutes, why: e.why ?? "", learnBefore: e.learnBefore ?? [], exploreMore: e.exploreMore ?? [],
});

/** The exercise the editor's draft makes: the old one's other fields (topic, concepts) kept, the form's and the block's put in. */
export function exerciseFromDraft(old: PlanExercise | null, meta: ExerciseMeta, block: Pick<Block, "choice" | "cells">): PlanExercise {
  const read = readTitle(meta.titleText);
  const { area: _a, level: _l, tags: _t, why: _w, learnBefore: _lb, exploreMore: _em, choice: _c, ...rest } = old ?? ({} as PlanExercise);
  void _a; void _l; void _t; void _w; void _lb; void _em; void _c;
  const tags = exerciseTags(read.tags, block.cells);
  return {
    ...rest,
    title: read.title || "Untitled exercise",
    minutes: Math.min(120, Math.max(1, Math.round(meta.minutes) || 1)),
    ...(read.area ? { area: read.area } : {}),
    ...(read.level ? { level: read.level } : {}),
    ...(tags.length ? { tags } : {}),
    ...(meta.why.trim() ? { why: meta.why.trim() } : {}),
    ...(meta.learnBefore.length ? { learnBefore: meta.learnBefore } : {}),
    ...(meta.exploreMore.length ? { exploreMore: meta.exploreMore } : {}),
    ...(block.choice ? { choice: block.choice } : {}),
    cells: block.cells,
  };
}

/** The paste step's checks on an exercise being edited, worded for the player's AI; the tools are not read again (they are stored parsed). */
export function draftWarnings(e: PlanExercise): string[] {
  const out: string[] = [];
  const tools = toolsOf(e.cells).length;
  if (!e.cells.length) out.push("no instructions.");
  if (tools > 6) out.push(`${tools} tools; keep it to 6.`);
  if (mixesSingAndPlay(e.cells)) out.push("asks to both sing and play; keep it to one.");
  if (tempoWithoutMetronome(e.cells)) out.push("asks for a tempo but shows no metronome; add one.");
  out.push(...choiceWarnings(e));
  const untagged = [!e.level && "level", !e.area && "area", !e.tags?.length && "kind"].filter(Boolean);
  if (untagged.length) out.push(`no ${untagged.join(", ")} tag.`);
  if (!e.learnBefore?.length) out.push("no learnBefore link; add an attunr page to learn first.");
  return out.map((w) => `"${e.title}": ${w}`);
}
