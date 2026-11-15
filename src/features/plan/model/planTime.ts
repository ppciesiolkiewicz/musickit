import { PLAN_DAYS, type PlanExercise } from "./types";

/**
 * The day timer's record of one day of one plan, kept apart from the plan document (on the server, a `plan_day_times`
 * row): the day's used seconds and the seconds the timer ran while each exercise was the card in view, by exercise id.
 * An exercise changed in the day editor gets a new id, so its old seconds stop counting for it.
 */
export interface DayTime {
  planId: string;
  /** 0-based */
  day: number;
  elapsed: number;
  /** seconds per exercise id; zeros are left out */
  spent: Record<string, number>;
}

/** The most exercises a day's `spent` may list; a day has 2 to 5. */
const MAX_DAY_EXERCISES = 20;
const MAX_ID = 200;
const whole = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_ID;

/** A sent or stored `DayTime` made safe, or null when it is broken. */
export function parseDayTime(raw: unknown): DayTime | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const elapsed = whole(r.elapsed);
  if (!isId(r.planId) || !Number.isInteger(r.day) || (r.day as number) < 0 || (r.day as number) >= PLAN_DAYS || elapsed === null) return null;
  if (typeof r.spent !== "object" || r.spent === null || Array.isArray(r.spent)) return null;
  const entries = Object.entries(r.spent as Record<string, unknown>);
  if (entries.length > MAX_DAY_EXERCISES) return null;
  const spent: Record<string, number> = {};
  for (const [id, v] of entries) {
    const s = whole(v);
    if (!isId(id) || s === null) return null;
    if (s > 0) spent[id] = s;
  }
  return { planId: r.planId, day: r.day as number, elapsed, spent };
}

/** A day's used seconds; 0 when it has no record. */
export const elapsedOn = (times: DayTime[], day: number): number => times.find((t) => t.day === day)?.elapsed ?? 0;

/** The seconds spent on each of a day's exercises, in their order. */
export const spentOn = (times: DayTime[], day: number, exercises: PlanExercise[]): number[] => {
  const t = times.find((x) => x.day === day);
  return exercises.map((e) => (e.id && t?.spent[e.id]) || 0);
};

/** The timer's seconds per exercise (in the day's order) as a `DayTime`. */
export function dayTime(planId: string, day: number, exercises: PlanExercise[], elapsed: number, seconds: number[]): DayTime {
  const spent: Record<string, number> = {};
  exercises.forEach((e, i) => {
    const s = Math.floor(seconds[i] ?? 0);
    if (e.id && s > 0) spent[e.id] = s;
  });
  return { planId, day, elapsed: Math.floor(elapsed), spent };
}

const sameSpent = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** The records with `t` in place of its day's; the same array when it changes nothing. */
export function withDayTime(times: DayTime[], t: DayTime): DayTime[] {
  const old = times.find((x) => x.planId === t.planId && x.day === t.day);
  if (old && old.elapsed === t.elapsed && sameSpent(old.spent, t.spent)) return times;
  return [...times.filter((x) => x !== old), t].sort((a, b) => a.day - b.day);
}
