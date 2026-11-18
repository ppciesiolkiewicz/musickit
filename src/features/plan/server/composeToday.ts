import type { LibraryRepo } from "@/features/library/server/repo";
import type { ComposeBlock } from "@/features/library/server/types";
import { readDoc, readEntries } from "@/features/userData/server/data";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { composeDay, type Candidate, type ComposedDay } from "../model/compose";
import { solidRatedAt } from "../model/daySteps";
import { addDays, doneKey, localDate, ownDay } from "../model/schedule";
import type { PlanExercise, PlanState, StoredPlan } from "../model/types";

export type ComposeAnswer =
  | { ok: true; day: ComposedDay; date: string; attempt: number }
  | { ok: false; code: "no-answers" | "bad-date" | "no-blocks" };

/** A library block as a plan stores it: its content with the slot and the tags that say what it practises. */
function candidateOf(b: ComposeBlock): Candidate {
  const exercise: PlanExercise = {
    ...b.content,
    minutes: b.slot.minutes,
    ...(b.slot.why ? { why: b.slot.why } : {}),
    ...(b.slot.learnBefore ? { learnBefore: b.slot.learnBefore } : {}),
    ...(b.slot.exploreMore ? { exploreMore: b.slot.exploreMore } : {}),
    area: b.area as PlanExercise["area"],
    ...(b.topic ? { topic: b.topic } : {}),
    concepts: b.concepts,
    steps: b.steps,
    ...(b.level ? { level: b.level as PlanExercise["level"] } : {}),
    tags: b.tags,
    blockId: b.id,
  };
  return { blockId: b.id, steps: b.steps, minutes: b.slot.minutes, use: b.use, mine: b.mine, exercise };
}

const isRealDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

const blockIds = (p: StoredPlan | undefined): string[] =>
  (p?.config.days[0]?.exercises ?? []).flatMap((e) => (e.blockId ? [e.blockId] : []));

/** The block ids of the newest own composed day before `date`. A given plan is never read. */
function yesterdayOf(state: PlanState, date: string): string[] {
  const days = [state.current, ...state.history].filter((p): p is StoredPlan => !!p?.composed && p.startedOn < date);
  const newest = days.reduce<StoredPlan | undefined>((best, p) => (!best || p.startedOn > best.startedOn ? p : best), undefined);
  return blockIds(newest);
}

/**
 * Today's plan from the player's answers, ratings and the library's blocks. Writes nothing: the page stores the day.
 * `another` throws away today's unrated exercises (they are never picked again today) and keeps the rated ones.
 */
export async function composeToday(
  d: { library: LibraryRepo; userData: UserDataRepo; today?: () => string },
  player: string,
  body: { date: string; another: boolean },
): Promise<ComposeAnswer> {
  const state = (await readDoc(d.userData, player, "plan")) as PlanState;
  const answers = state.answers;
  if (!answers) return { ok: false, code: "no-answers" };
  const today = (d.today ?? (() => localDate()))();
  const { date } = body;
  if (!isRealDate(date) || (date !== today && date !== addDays(today, 1) && date !== addDays(today, -1))) return { ok: false, code: "bad-date" };

  const blocks = (await d.library.composeBlocks(player, answers.areas)).map(candidateOf);
  if (!blocks.length) return { ok: false, code: "no-blocks" };

  const own = body.another ? ownDay(state, date) : null;
  const before = own?.config.days[0]?.exercises ?? [];
  const keep = own ? before.filter((_, i) => own.rated?.[doneKey(0, i)]) : [];
  const unrated = own ? before.filter((_, i) => !own.rated?.[doneKey(0, i)]) : [];
  const attempt = own?.composed ? own.composed.attempt + 1 : 0;
  const declined = own?.composed ? [...own.composed.declined, ...unrated.flatMap((e) => (e.blockId ? [e.blockId] : []))] : [];
  const solid = solidRatedAt(await readEntries(d.userData, player));

  const day = composeDay({ answers, solid, blocks, date, yesterday: yesterdayOf(state, date), keep, declined, seed: `${player}:${date}:${attempt}` });
  if (!day.exercises.length) return { ok: false, code: "no-blocks" };
  return { ok: true, day, date, attempt };
}
