import { migrateAnswers, type PlanAnswers } from "../intake/answers";
import type { AnswersEntry, PlanState, StoredPlan } from "./types";

/** The most entries kept: the first (the starting point) and the newest 99. */
export const MAX_ANSWERS_HISTORY = 100;

const capped = (list: AnswersEntry[]): AnswersEntry[] =>
  list.length <= MAX_ANSWERS_HISTORY ? list : [list[0], ...list.slice(list.length - (MAX_ANSWERS_HISTORY - 1))];

/** A stored history made safe: broken entries are dropped, topics are read again (unknown topics and bad rungs go), and it is cut to `MAX_ANSWERS_HISTORY`. */
export function cleanAnswersHistory(raw: unknown): AnswersEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: AnswersEntry[] = [];
  for (const e of raw) {
    const r = (e ?? {}) as Record<string, unknown>;
    if (typeof r.at !== "string" || !r.at || r.at.length > 40) continue;
    out.push({ at: r.at, topics: migrateAnswers({ topics: r.topics }).topics });
  }
  return capped(out);
}

/** The answers stored before the history, as its first entry: dated the earliest plan's `startedOn`. Nothing without answers or without a plan. */
export function movedOver(answers: PlanAnswers | null, plans: StoredPlan[]): AnswersEntry[] {
  if (!answers || !plans.length) return [];
  const at = plans.map((p) => p.startedOn).reduce((a, b) => (b < a ? b : a));
  return [{ at, topics: answers.topics }];
}

/** The state with the finished answers added to the history, at `at` (an ISO datetime). */
export function recordAnswers(s: PlanState, answers: PlanAnswers, at: string): PlanState {
  return { ...s, answersHistory: capped([...s.answersHistory, { at, topics: answers.topics }]) };
}
