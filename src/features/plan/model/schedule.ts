import { PLAN_DAYS, type StoredPlan } from "./types";
import type { Stars } from "@/features/progress/stars";

/** A date as local yyyy-mm-dd. */
export const localDate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Which day of the plan today is, from 0. Past the last day it keeps counting, so callers can tell the week is over. */
export const dayIndex = (startedOn: string, today: string): number => Math.max(0, dayNumber(today) - dayNumber(startedOn));

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

/** How much of one day is ticked off, 0..1. */
export function dayProgress(plan: StoredPlan, day: number): number {
  const n = plan.config.days[day]?.exercises.length ?? 0;
  if (!n) return 0;
  let done = 0;
  for (let i = 0; i < n; i++) if (plan.done[doneKey(day, i)]) done++;
  return done / n;
}

/** The week is over the day after the last one, or as soon as the last day is all done. */
export const weekOver = (plan: StoredPlan, today: string): boolean =>
  dayIndex(plan.startedOn, today) >= PLAN_DAYS || (dayIndex(plan.startedOn, today) === PLAN_DAYS - 1 && dayProgress(plan, PLAN_DAYS - 1) === 1);
