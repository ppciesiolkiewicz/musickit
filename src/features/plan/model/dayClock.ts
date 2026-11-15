import { PLAN_DAYS, type PlanState } from "./types";

/** Where a day's countdown stands: the whole day's time, what's left, and which exercise that time falls in. */
export interface DayClock {
  /** the day's seconds: every exercise's minutes */
  total: number;
  left: number;
  /** the exercise the elapsed time falls in, null once the day's time is up */
  exercise: number | null;
  /** seconds left in that exercise */
  leftInExercise: number;
}

/** The day's clock after `elapsed` seconds, the exercises laid end to end in order. */
export function dayClock(minutes: number[], elapsed: number): DayClock {
  const total = minutes.reduce((n, m) => n + m * 60, 0);
  const at = Math.min(Math.max(0, Math.floor(elapsed)), total);
  let end = 0;
  for (let i = 0; i < minutes.length; i++) {
    end += minutes[i] * 60;
    if (at < end) return { total, left: total - at, exercise: i, leftInExercise: end - at };
  }
  return { total, left: 0, exercise: null, leftInExercise: 0 };
}

/** The stored seconds of a day, made safe: a whole number of seconds, never below 0. */
export const elapsedOf = (elapsed: Record<string, number> | undefined, day: number): number => {
  const v = elapsed?.[String(day)];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
};

/** The seconds spent on each of a day's `count` exercises, from `StoredPlan.spent`, made safe like `elapsedOf`. */
export const spentOf = (spent: Record<string, number> | undefined, day: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => elapsedOf(spent && { [String(day)]: spent[`${day}:${i}`] }, day));

/** `StoredPlan.spent` with a day's seconds per exercise written in (keys `${day}:${exercise}`; zeros are left out). */
export function withSpent(spent: Record<string, number> | undefined, day: number, seconds: number[]): Record<string, number> {
  const next = Object.fromEntries(Object.entries(spent ?? {}).filter(([k]) => !k.startsWith(`${day}:`)));
  seconds.forEach((s, i) => {
    if (s > 0) next[`${day}:${i}`] = Math.floor(s);
  });
  return next;
}

/** True when two `StoredPlan.spent` maps hold the same seconds (key order aside). */
export const sameSeconds = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/**
 * What the day timer saves: the used seconds of one day of one plan and the seconds spent on each of its exercises. On the
 * server it is sent alone (`PUT /api/me/plan/time`), a few bytes, never the whole plan.
 */
export interface DayTime {
  planId: string;
  day: number;
  elapsed: number;
  spent: number[];
}

/** The most exercises a day's `spent` may list; a day has 2 to 5. */
const MAX_DAY_EXERCISES = 20;
const seconds = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

/** A sent `DayTime` made safe, or null when it is broken. */
export function parseDayTime(raw: unknown): DayTime | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const day = seconds(r.day);
  const elapsed = seconds(r.elapsed);
  if (typeof r.planId !== "string" || !r.planId || r.planId.length > 200) return null;
  if (day === null || day !== r.day || day >= PLAN_DAYS || elapsed === null) return null;
  if (!Array.isArray(r.spent) || r.spent.length > MAX_DAY_EXERCISES) return null;
  const spent = r.spent.map(seconds);
  if (spent.some((s) => s === null)) return null;
  return { planId: r.planId, day, elapsed, spent: spent as number[] };
}

/** The state with the timer's seconds written into the current plan; the same state when it changes nothing or `planId` is no longer the current plan. */
export function withDayTime(s: PlanState, t: DayTime): PlanState {
  const c = s.current;
  if (c?.id !== t.planId) return s;
  const spent = withSpent(c.spent, t.day, t.spent);
  if (c.elapsed?.[String(t.day)] === t.elapsed && sameSeconds(spent, c.spent ?? {})) return s;
  return { ...s, current: { ...c, elapsed: { ...c.elapsed, [String(t.day)]: t.elapsed }, spent } };
}
