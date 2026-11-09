import { isStars, type Stars } from "./stars";

/**
 * One rated exercise in the progress log: which exercise of which plan, what it practised, and how it went. It carries
 * the exercise's title and tags so it can be read without the plan, which may be long gone from the plan history.
 */
export interface ProgressEntry {
  id: string;
  planId: string;
  exerciseId: string;
  /** day of the plan, from 0, and the exercise's place in that day */
  day: number;
  exercise: number;
  title: string;
  focus?: string;
  area?: string;
  level?: string;
  /** the questionnaire topic the exercise practised */
  topic?: string;
  concepts?: string[];
  stars: Stars;
  /** when it was rated, ISO datetime */
  at: string;
}

const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

function cleanEntry(raw: unknown): ProgressEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!text(r.id) || !text(r.planId) || !text(r.exerciseId) || !count(r.day) || !count(r.exercise) || !text(r.title) || !isStars(r.stars) || !text(r.at)) return null;
  const concepts = Array.isArray(r.concepts) ? r.concepts.filter(text) : [];
  return {
    id: r.id, planId: r.planId, exerciseId: r.exerciseId, day: r.day, exercise: r.exercise, title: r.title,
    ...(text(r.focus) ? { focus: r.focus } : {}),
    ...(text(r.area) ? { area: r.area } : {}),
    ...(text(r.level) ? { level: r.level } : {}),
    ...(text(r.topic) ? { topic: r.topic } : {}),
    ...(concepts.length ? { concepts } : {}),
    stars: r.stars, at: r.at,
  };
}

/** A stored log made safe: not a list gives an empty log, broken rows are dropped one by one, and an exercise keeps only its last row. */
export function cleanEntries(raw: unknown): ProgressEntry[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.flatMap((r) => cleanEntry(r) ?? []);
  return rows.filter((r, i) => rows.findLastIndex((x) => x.exerciseId === r.exerciseId) === i);
}

/** The log with `e` in it: an exercise has one row, so a second rating replaces the first in place and keeps its id. */
export function upsert(list: ProgressEntry[], e: ProgressEntry): ProgressEntry[] {
  const i = list.findIndex((x) => x.exerciseId === e.exerciseId);
  return i < 0 ? [...list, e] : list.map((x, k) => (k === i ? { ...e, id: x.id } : x));
}

/** The log without the exercise's row; the same list when it has none. */
export function without(list: ProgressEntry[], exerciseId: string): ProgressEntry[] {
  return list.some((x) => x.exerciseId === exerciseId) ? list.filter((x) => x.exerciseId !== exerciseId) : list;
}
