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
  area?: string;
  level?: string;
  /** the questionnaire topic the exercise practised */
  topic?: string;
  concepts?: string[];
  /** the path steps the exercise practised, "trackId:n" (plan/model/path.ts) */
  steps?: string[];
  /** the block rated, when the plan had one; a row stays one per slot (progress knows nothing of the id's shape) */
  blockId?: string;
  /** the choice rated, when the block is a curated one and the plan named a choice of it (`<blockId>/<name>`); kept like `blockId` */
  choiceId?: string;
  /**
   * The version the exercise was played in, when the plan gave it one: the keys it opened in and the earlier ones, its
   * tempo and the earlier ones, and how many moves that is from a first play. Progress only keeps it; the plan reads it.
   */
  given?: EntryGiven;
  stars: Stars;
  /** when it was rated, ISO datetime */
  at: string;
}

/** The version a rated exercise was played in, as the plan stores it on the slot (plan/model/moves.ts `Given`). */
export interface EntryGiven {
  keys?: { now: number[]; back: number[] };
  bpm?: { now: number; back: number[] };
  moved?: number;
}

const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

const numbers = (v: unknown): number[] | null => (Array.isArray(v) && v.length <= 12 && v.every((n) => typeof n === "number" && Number.isFinite(n)) ? (v as number[]) : null);

/** A stored version kept only where it has the shape; a broken part is dropped, the row stays. Null when nothing is left. */
function cleanGiven(raw: unknown): EntryGiven | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const out: EntryGiven = {};
  const k = (g.keys && typeof g.keys === "object" ? g.keys : {}) as Record<string, unknown>;
  const now = numbers(k.now), back = numbers(k.back);
  if (now?.length && back) out.keys = { now, back };
  const b = (g.bpm && typeof g.bpm === "object" ? g.bpm : {}) as Record<string, unknown>;
  const earlier = numbers(b.back);
  if (typeof b.now === "number" && Number.isFinite(b.now) && earlier) out.bpm = { now: b.now, back: earlier };
  if (!out.keys && !out.bpm) return null;
  if (count(g.moved) && g.moved > 0) out.moved = g.moved;
  return out;
}

function cleanEntry(raw: unknown): ProgressEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!text(r.id) || !text(r.planId) || !text(r.exerciseId) || !count(r.day) || !count(r.exercise) || !text(r.title) || !isStars(r.stars) || !text(r.at)) return null;
  const concepts = Array.isArray(r.concepts) ? r.concepts.filter(text) : [];
  const steps = Array.isArray(r.steps) ? r.steps.filter(text) : [];
  const given = cleanGiven(r.given);
  return {
    id: r.id, planId: r.planId, exerciseId: r.exerciseId, day: r.day, exercise: r.exercise, title: r.title,
    ...(text(r.area) ? { area: r.area } : {}),
    ...(text(r.level) ? { level: r.level } : {}),
    ...(text(r.topic) ? { topic: r.topic } : {}),
    ...(concepts.length ? { concepts } : {}),
    ...(steps.length ? { steps } : {}),
    ...(text(r.blockId) && r.blockId.length <= 200 ? { blockId: r.blockId } : {}),
    ...(text(r.choiceId) && r.choiceId.length <= 200 ? { choiceId: r.choiceId } : {}),
    ...(given ? { given } : {}),
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
