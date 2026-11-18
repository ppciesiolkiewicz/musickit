import { cleanCells } from "./cleanExercise";
import { withBlockIds, withExerciseIds } from "./exerciseIds";
import { HISTORY_CAP, cleanReview } from "./state";
import { planDays, type PlanConfig, type PlanState, type StoredPlan } from "./types";
import type { ComposedDay } from "./compose";
import type { StarRating, Stars } from "@/features/progress/stars";

/** A date as local yyyy-mm-dd. */
export const localDate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** The local date of a stored moment: a bare yyyy-mm-dd as it is, an ISO datetime as the date it falls on here. */
export const dayOf = (at: string): string => (/^\d{4}-\d\d-\d\d$/.test(at) ? at : localDate(new Date(at)));

/** A local yyyy-mm-dd plus `n` days (negative goes back). */
export const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + n));
};

/** Which day of the plan today is, from 0. Past the last day it keeps counting, so callers can tell the week is over. */
export const dayIndex = (startedOn: string, today: string): number => Math.max(0, dayNumber(today) - dayNumber(startedOn));

/** A config as a started plan stores it: a new id on every exercise, cells cleaned, then the block ids worked out. */
const storedConfig = (config: PlanConfig, newId: () => string): PlanConfig => withBlockIds(cleanCells(withExerciseIds(config, newId, true)));

/** Who a composed day is for: its date, which try of the day, and its words (`config.title`, the day's `theme`; "" when left out). */
export interface DayMeta {
  date: string;
  attempt: number;
  title?: string;
  theme?: string;
}

const dayConfig = (day: ComposedDay, meta: DayMeta, newId: () => string): PlanConfig =>
  storedConfig({ title: meta.title ?? "", days: [{ theme: meta.theme ?? "", exercises: day.exercises }] }, newId);

/** Today's own plan when `current` is a composed day started on `date`, else null. A given plan is never `current`. */
export function ownDay(s: PlanState, date: string): StoredPlan | null {
  return s.current?.composed && s.current.startedOn === date ? s.current : null;
}

/**
 * Puts a composed day in as `current`; the plan before it moves to the front of `history` (which keeps `HISTORY_CAP`).
 * When today already has its own plan, `s` comes back as it is: the same try asked twice (two tabs, an answer arriving
 * twice) must not replace or double it, and another try is `anotherDay`'s. A date before the running composed day's (a
 * stale answer) also changes nothing.
 */
export function startDay(s: PlanState, day: ComposedDay, meta: DayMeta, newId: () => string): PlanState {
  if (ownDay(s, meta.date) || (s.current?.composed && meta.date < s.current.startedOn)) return s;
  const plan: StoredPlan = { id: newId(), config: dayConfig(day, meta, newId), startedOn: meta.date, done: {}, composed: { attempt: meta.attempt, declined: [], short: day.short } };
  return { ...s, current: plan, history: s.current ? [s.current, ...s.history].slice(0, HISTORY_CAP) : s.history };
}

/**
 * Today's plan replaced by another try (`meta.attempt`). An exercise of today's plan that is in the new day (by block id)
 * keeps its slot id, its tick and its rating, re-keyed to its new place; the day timer's seconds follow it by slot id. An
 * exercise rated in `s` that the answer left out (rated while the request was out, so the server didn't know) is kept
 * anyway, as it is: then the kept ones go first in their old order, before the new picks. Every block id of today's plan
 * that is not in the new day joins `composed.declined`. The plan keeps its id and `startedOn`. Without today's own plan,
 * or for the try it already holds or an earlier one (a late answer), `s` comes back as it is.
 */
export function anotherDay(s: PlanState, day: ComposedDay, meta: DayMeta, newId: () => string): PlanState {
  const today = ownDay(s, meta.date);
  if (!today?.composed || meta.attempt <= today.composed.attempt) return s;
  const before = today.config.days[0]?.exercises ?? [];
  const config = dayConfig(day, meta, newId);
  const used = new Set<number>();
  // each exercise of the answer, with the index in today's plan it was kept from (-1: a new pick)
  const placed = config.days[0].exercises.map((e) => {
    const j = before.findIndex((old, k) => !used.has(k) && !!old.blockId && old.blockId === e.blockId);
    if (j < 0) return { e, from: -1 };
    used.add(j);
    return { e: before[j].id ? { ...e, id: before[j].id } : e, from: j };
  });
  const late = before.flatMap((e, j) => (!used.has(j) && today.rated?.[doneKey(0, j)] ? [{ e, from: j }] : []));
  const order = late.length
    ? [...[...placed.filter((x) => x.from >= 0), ...late].sort((a, b) => a.from - b.from), ...placed.filter((x) => x.from < 0)]
    : placed;
  const done: Record<string, true> = {};
  const rated: Record<string, StarRating> = {};
  order.forEach(({ from }, i) => {
    if (from < 0) return;
    const at = doneKey(0, from), to = doneKey(0, i);
    if (today.done[at]) done[to] = true;
    const r = today.rated?.[at];
    if (r) rated[to] = r;
  });
  const exercises = order.map((x) => x.e);
  const now = new Set(exercises.map((e) => e.blockId));
  const declined = [...today.composed.declined];
  for (const e of before) if (e.blockId && !now.has(e.blockId) && !declined.includes(e.blockId)) declined.push(e.blockId);
  const plan: StoredPlan = {
    ...today,
    config: { ...config, days: [{ ...config.days[0], exercises }] },
    done,
    rated,
    composed: { attempt: meta.attempt, declined, short: day.short },
  };
  return { ...s, current: plan };
}

/**
 * A week a teacher made for the student, put first in `given`: seven days from `meta.start` (an empty composed day stays,
 * so day numbers match dates), each day's theme "", the exercises stored as `startDay` stores them (new ids, block ids
 * computed). `current` and `history` are left as they are. With `replace` (a plan id in `given`: the week being rotated,
 * or the upcoming week made again), that plan leaves `given` and goes first in `history` (which keeps `HISTORY_CAP`), its
 * ratings and comment kept on it; with `dropUntouched` a replaced week nobody touched (no tick, no rating, no comment) is
 * dropped instead.
 */
export function giveWeek(s: PlanState, days: ComposedDay[], meta: { start: string; madeAt: string; title: string; replace?: string; dropUntouched?: boolean }, newId: () => string): PlanState {
  const id = newId();
  const config = storedConfig({ title: meta.title, days: days.map((d) => ({ theme: "", exercises: d.exercises })) }, newId);
  const plan: StoredPlan = { id, config, startedOn: meta.start, done: {}, teacher: { madeAt: meta.madeAt } };
  const old = meta.replace === undefined ? undefined : givenPlan(s, meta.replace);
  if (!old) return { ...s, given: [plan, ...s.given] };
  const given = [plan, ...s.given.filter((p) => p !== old)];
  if (meta.dropUntouched && !touched(old)) return { ...s, given };
  return { ...s, given, history: [old, ...s.history].slice(0, HISTORY_CAP) };
}

/** A plan someone did something with: a tick, a rating or a teacher's comment on it. */
const touched = (p: StoredPlan): boolean => Object.keys(p.done).length > 0 || Object.keys(p.rated ?? {}).length > 0 || !!p.teacher?.comment;

/** The week a teacher made that starts after `date` (there is at most one: making the next week again replaces it), else null. */
export const upcomingTeacherWeek = (s: PlanState, date: string): StoredPlan | null =>
  s.given.filter((p) => p.teacher && p.startedOn > date).sort((a, b) => (a.startedOn < b.startedOn ? 1 : a.startedOn > b.startedOn ? -1 : 0))[0] ?? null;

/** The block ids of the last day of a week a teacher made that ends the day before `start` (given or history), else []. */
export function dayBeforeWeek(s: PlanState, start: string): string[] {
  const before = [...s.given, ...s.history].find((p) => p.teacher && addDays(p.startedOn, planDays(p)) === start);
  return (before?.config.days[planDays(before) - 1]?.exercises ?? []).flatMap((e) => (e.blockId ? [e.blockId] : []));
}

/** The one order of a teacher's weeks, newest first: by start, then by when the teacher made it. */
export const newestWeekFirst = (a: StoredPlan, b: StoredPlan): number =>
  a.startedOn !== b.startedOn ? (a.startedOn < b.startedOn ? 1 : -1) : Date.parse(b.teacher?.madeAt ?? "") - Date.parse(a.teacher?.madeAt ?? "") || 0;

/** The given weeks a teacher made that have started by `date`, newest first (`newestWeekFirst`). */
export const teacherWeeks = (s: PlanState, date: string): StoredPlan[] => s.given.filter((p) => p.teacher && p.startedOn <= date).sort(newestWeekFirst);

/** The newest week a teacher made that has started by `date` (yyyy-mm-dd), or null. */
export const teacherWeek = (s: PlanState, date: string): StoredPlan | null => teacherWeeks(s, date)[0] ?? null;

/** The newest week a teacher made whose days cover `date`, or null (none has started, or the newest has ended). */
export const teacherWeekOn = (s: PlanState, date: string): StoredPlan | null => teacherWeeks(s, date).find((p) => !givenToday(p, date).over) ?? null;

/** A plan the player was given, by id; never the player's own. */
export const givenPlan = (s: PlanState, id: string): StoredPlan | undefined => s.given.find((p) => p.id === id);

/**
 * A change to one given plan (a rating, a tick, an edit), stored on that plan in `given`; `current`, the history and the
 * other given plans are left as they are. An id not in `given` changes nothing (`s` returned as it is).
 */
export function updateGiven(s: PlanState, id: string, change: (p: StoredPlan) => StoredPlan): PlanState {
  const i = s.given.findIndex((p) => p.id === id);
  if (i < 0) return s;
  const given = [...s.given];
  given[i] = change(given[i]);
  return { ...s, given };
}

/** Takes a shared plan off the list on `/plan` (`hidden`) or puts it back; the plan stays, so its ratings still count. An id not in `given`: `s` unchanged. */
export function hideGiven(s: PlanState, id: string, hidden: boolean): PlanState {
  return updateGiven(s, id, (p) => {
    const next = { ...p };
    delete next.hidden;
    return hidden ? { ...next, hidden: true } : next;
  });
}

/** Every plan the player has, for progress and the outcome: the current plan, then the history, then the given plans. */
export const storedPlans = (s: PlanState): StoredPlan[] => [...(s.current ? [s.current] : []), ...s.history, ...s.given];

/**
 * Which day of a given plan is today (`today`, from 0, never past its last day) and whether its days are over: only once
 * its last day's date has passed (a fully rated last day stays the open day until then). Over, `today`
 * is the last day, so every day can be opened.
 */
export function givenToday(plan: StoredPlan, date: string): { today: number; over: boolean } {
  const last = planDays(plan) - 1;
  const over = dayIndex(plan.startedOn, date) > last;
  return { today: over ? last : Math.min(dayIndex(plan.startedOn, date), last), over };
}

export const doneKey = (day: number, exercise: number) => `${day}:${exercise}`;

/** Rate one exercise, which also marks it done; `null` clears the rating and un-does it. */
export function ratePlan(plan: StoredPlan, day: number, exercise: number, stars: Stars | null, at: string): StoredPlan {
  const k = doneKey(day, exercise);
  const done = { ...plan.done };
  const rated = { ...plan.rated };
  if (stars === null) { delete done[k]; delete rated[k]; }
  else { done[k] = true; rated[k] = { stars, at }; }
  return { ...plan, done, rated };
}

/** Review the whole plan, or take the review away with `null`. The why goes through `cleanReview`: kept only for 1 or 2 stars. */
export function reviewPlan(plan: StoredPlan, review: { stars: Stars; why?: string } | null, at: string): StoredPlan {
  const next = { ...plan };
  delete next.review;
  const clean = review ? cleanReview({ ...review, at }) : null;
  return clean ? { ...next, review: clean } : next;
}

/** How much of one day is ticked off, 0..1. */
export function dayProgress(plan: StoredPlan, day: number): number {
  const n = plan.config.days[day]?.exercises.length ?? 0;
  if (!n) return 0;
  let done = 0;
  for (let i = 0; i < n; i++) if (plan.done[doneKey(day, i)]) done++;
  return done / n;
}

