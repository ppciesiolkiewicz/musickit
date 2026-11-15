import { addDays, localDate } from "./schedule";
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
  /** slot id -> block id, for the slots in `spent`, so time finds its block without the plan */
  blocks?: Record<string, string>;
  /** local yyyy-mm-dd -> seconds the timer counted on that date (it runs on whichever day tab is open, so a plan day is not the date practised); the 31 latest dates */
  on?: Record<string, number>;
}

/** The most exercises a day's `spent` may list; a day has 2 to 5. */
const MAX_DAY_EXERCISES = 20;
const MAX_ID = 200;
const whole = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
const MAX_DATES = 31;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
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
  const blocks = parseBlocks(r.blocks, spent);
  const on = parseOn(r.on);
  return { planId: r.planId, day: r.day as number, elapsed, spent, ...(blocks ? { blocks } : {}), ...(on ? { on } : {}) };
}

/** The block ids of slots that have seconds; stray entries dropped, nothing left gives undefined. */
function parseBlocks(raw: unknown, spent: Record<string, number>): Record<string, string> | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const blocks = Object.fromEntries(Object.entries(raw).filter(([id, v]) => id in spent && isId(v)));
  return Object.keys(blocks).length ? (blocks as Record<string, string>) : undefined;
}

/** The latest `MAX_DATES` entries of a date -> seconds record, by date. */
const latestDates = (on: Record<string, number>): Record<string, number> =>
  Object.fromEntries(Object.entries(on).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).slice(-MAX_DATES));

/** The dates with whole seconds above 0; stray entries dropped, nothing left gives undefined. */
function parseOn(raw: unknown): Record<string, number> | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const on: Record<string, number> = {};
  for (const [date, v] of Object.entries(raw)) {
    const s = whole(v);
    if (DATE.test(date) && s) on[date] = s;
  }
  return Object.keys(on).length ? latestDates(on) : undefined;
}

/** A day's used seconds; 0 when it has no record. */
export const elapsedOn = (times: DayTime[], day: number): number => times.find((t) => t.day === day)?.elapsed ?? 0;

/** The seconds spent on each of a day's exercises, in their order. */
export const spentOn = (times: DayTime[], day: number, exercises: PlanExercise[]): number[] => {
  const t = times.find((x) => x.day === day);
  return exercises.map((e) => (e.id && t?.spent[e.id]) || 0);
};

/**
 * The timer's seconds per exercise (in the day's order) as a `DayTime`. `on` is `prev`'s dates plus the seconds added since
 * `prev` on `today`. A `prev` saved before dates (seconds, no `on`) first has its seconds put on the day's plan date, from
 * `startedOn`; without it they are left out rather than put on today.
 */
export function dayTime(
  planId: string, day: number, exercises: PlanExercise[], elapsed: number, seconds: number[],
  prev?: DayTime, today: string = localDate(), startedOn?: string,
): DayTime {
  const spent: Record<string, number> = {};
  const blocks: Record<string, string> = {};
  exercises.forEach((e, i) => {
    const s = Math.floor(seconds[i] ?? 0);
    if (!e.id || s <= 0) return;
    spent[e.id] = s;
    if (e.blockId) blocks[e.id] = e.blockId;
  });
  const total = Math.floor(elapsed);
  const on: Record<string, number> = { ...prev?.on };
  if (prev && prev.elapsed > 0 && !prev.on && startedOn) on[addDays(startedOn, day)] = prev.elapsed;
  const added = Math.max(0, total - (prev?.elapsed ?? 0));
  if (added > 0) on[today] = (on[today] ?? 0) + added;
  const kept = latestDates(on);
  return { planId, day, elapsed: total, spent, ...(Object.keys(blocks).length ? { blocks } : {}), ...(Object.keys(kept).length ? { on: kept } : {}) };
}

const same = <T,>(a: Record<string, T> = {}, b: Record<string, T> = {}) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** The records with `t` in place of its day's; the same array when it changes nothing. */
export function withDayTime(times: DayTime[], t: DayTime): DayTime[] {
  const old = times.find((x) => x.planId === t.planId && x.day === t.day);
  if (old && old.elapsed === t.elapsed && same(old.spent, t.spent) && same(old.blocks, t.blocks) && same(old.on, t.on)) return times;
  return [...times.filter((x) => x !== old), t].sort((a, b) => a.day - b.day);
}
