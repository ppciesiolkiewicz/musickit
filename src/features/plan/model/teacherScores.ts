import { topicById } from "../intake/topics";
import { dayOf } from "./schedule";
import type { PlanState, TeacherScore } from "./types";

/*
 * What a teacher set for a student's topics: one entry each time a slider moved, oldest first. From the entry's time the
 * value is the topic's score, and only later ratings can raise it (`topicOutcome`, outcome.ts). Pure.
 */

/** The most entries kept: the newest ones. */
export const MAX_TEACHER_SCORES = 500;

/** A slider moves a tenth at a time; a value that differs from the current one by less than half a step is not a move. */
const MOVED = 0.05;

/** A score as stored: 0 to 3, a tenth at a time. */
const cleanScore = (n: number): number => Math.round(Math.min(3, Math.max(0, n)) * 10) / 10;

/** A real calendar date written yyyy-mm-dd. */
const isDay = (s: string): boolean => {
  if (!/^\d{4}-\d\d-\d\d$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
};

/** The local day an entry counts from: the teacher's own day when it was recorded, else the date of its time. */
export const entryDay = (e: TeacherScore): string => e.day ?? dayOf(e.at);

/** A stored list made safe: unknown topics and broken entries are dropped, scores clamped to 0..3 and rounded to 0.1, a `day` that is not a date dropped, and it is cut to the newest `MAX_TEACHER_SCORES`. */
export function cleanTeacherScores(raw: unknown): TeacherScore[] {
  if (!Array.isArray(raw)) return [];
  const out: TeacherScore[] = [];
  for (const e of raw) {
    const r = (e ?? {}) as Record<string, unknown>;
    if (typeof r.topic !== "string" || !topicById(r.topic)) continue;
    if (typeof r.score !== "number" || !Number.isFinite(r.score)) continue;
    if (typeof r.at !== "string" || !r.at || r.at.length > 40 || Number.isNaN(Date.parse(r.at))) continue;
    const day = typeof r.day === "string" && isDay(r.day) ? r.day : undefined;
    out.push({ topic: r.topic, score: cleanScore(r.score), at: r.at, ...(day ? { day } : {}) });
  }
  return out.slice(-MAX_TEACHER_SCORES);
}

/**
 * The state with an entry added, at `at` on the teacher's local day `day` (yyyy-mm-dd), for each topic of `scores` whose
 * value differs from `now[topic]` (the score shown now, or null) by 0.05 or more. The day is the teacher's, not the
 * server's: an evening west of UTC is already the next day by `at`.
 */
export function setScores(s: PlanState, scores: Record<string, number>, at: string, now: Record<string, number | null>, day: string): PlanState {
  const added: TeacherScore[] = [];
  for (const [topic, value] of Object.entries(scores)) {
    if (!topicById(topic) || !Number.isFinite(value)) continue;
    const was = now[topic];
    if (typeof was === "number" && Math.abs(value - was) < MOVED) continue;
    added.push({ topic, score: cleanScore(value), at, day });
  }
  if (!added.length) return s;
  return { ...s, teacherScores: [...s.teacherScores, ...added].slice(-MAX_TEACHER_SCORES) };
}

/** The newest entry for the topic whose day (`entryDay`) is on or before the local day `asOf` (yyyy-mm-dd), or null. */
export function scoreAt(scores: TeacherScore[], topic: string, asOf: string): TeacherScore | null {
  let best: TeacherScore | null = null;
  for (const e of scores) {
    if (e.topic !== topic || entryDay(e) > asOf) continue;
    if (!best || Date.parse(e.at) >= Date.parse(best.at)) best = e;
  }
  return best;
}
