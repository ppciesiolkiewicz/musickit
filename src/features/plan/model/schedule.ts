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

/**
 * Start `config` on `today`: a new plan id and a new id on every exercise (so a plan used again from the history never
 * shares ids with its earlier run). Its cells are cleaned as a stored plan's are (`cleanExercise`) before the block ids
 * are made, so a reload keeps them. The running plan, if any, moves to the front of the history, which keeps `HISTORY_CAP`.
 */
export const startPlan = (s: PlanState, config: PlanConfig, newId: () => string, today: string): PlanState => ({
  ...s,
  current: { id: newId(), config: storedConfig(config, newId), startedOn: today, done: {} },
  history: s.current ? [s.current, ...s.history].slice(0, HISTORY_CAP) : s.history,
});

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
 * twice) must not replace or double it, and another try is `anotherDay`'s.
 */
export function startDay(s: PlanState, day: ComposedDay, meta: DayMeta, newId: () => string): PlanState {
  if (ownDay(s, meta.date)) return s;
  const plan: StoredPlan = { id: newId(), config: dayConfig(day, meta, newId), startedOn: meta.date, done: {}, composed: { attempt: meta.attempt, declined: [], short: day.short } };
  return { ...s, current: plan, history: s.current ? [s.current, ...s.history].slice(0, HISTORY_CAP) : s.history };
}

/**
 * Today's plan replaced by another try (`meta.attempt`). An exercise of today's plan that is in the new day (by block id)
 * keeps its slot id, its tick and its rating, re-keyed to its new place; the day timer's seconds follow it by slot id. Every
 * block id of today's plan that is not in the new one joins `composed.declined`. The plan keeps its id and `startedOn`.
 * Without today's own plan, or for the try it already holds, `s` comes back as it is.
 */
export function anotherDay(s: PlanState, day: ComposedDay, meta: DayMeta, newId: () => string): PlanState {
  const today = ownDay(s, meta.date);
  if (!today?.composed || today.composed.attempt === meta.attempt) return s;
  const before = today.config.days[0]?.exercises ?? [];
  const config = dayConfig(day, meta, newId);
  const used = new Set<number>();
  const done: Record<string, true> = {};
  const rated: Record<string, StarRating> = {};
  const exercises = config.days[0].exercises.map((e, i) => {
    const j = before.findIndex((old, k) => !used.has(k) && !!old.blockId && old.blockId === e.blockId);
    if (j < 0) return e;
    used.add(j);
    const from = doneKey(0, j), to = doneKey(0, i);
    if (today.done[from]) done[to] = true;
    const r = today.rated?.[from];
    if (r) rated[to] = r;
    return before[j].id ? { ...e, id: before[j].id } : e;
  });
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

/** A plan the player was given, by id; never the player's own. */
export const givenPlan = (s: PlanState, id: string): StoredPlan | undefined => s.given.find((p) => p.id === id);

/**
 * Use an earlier plan again. Like `startPlan`, but the plan takes the running plan's progress summary (the AI's newest
 * notes on the student) in place of the old one it was written with, so the next prompt does not send stale notes.
 */
export const restartPlan = (s: PlanState, config: PlanConfig, newId: () => string, today: string): PlanState => {
  const progress = s.current?.config.progress;
  return startPlan(s, progress ? { ...config, progress } : config, newId, today);
};

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

/** The plan is over the day after its last day (`planDays`: one for a composed day), or as soon as the last day is all done. */
export const weekOver = (plan: StoredPlan, today: string): boolean => {
  const days = planDays(plan);
  const i = dayIndex(plan.startedOn, today);
  return i >= days || (i === days - 1 && dayProgress(plan, days - 1) === 1);
};
