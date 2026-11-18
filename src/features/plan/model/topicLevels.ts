import type { ProgressEntry } from "@/features/progress/log";
import type { Rung } from "../intake/topics";
import { outcome } from "./outcome";
import type { PlanAnswers } from "./types";

/*
 * The topic levels the composer paces new steps by (`reach()`'s cap per topic): the higher of the questionnaire answer
 * and the level the player has reached by ratings in that topic. The level by ratings is the progress tracker's own
 * (`outcome()`, a topic's `reached`), so `/plan`'s tracker, `/dev/path` and the composer read one thing. Pure.
 */

/**
 * `answers` with each topic's level raised to the one its ratings reach as of `asOf` (local yyyy-mm-dd). Ratings never
 * lower a level below the answer, and a topic never answered stays unanswered unless ratings take it above new. With
 * nothing raised, `answers` comes back as it is.
 */
export function raisedAnswers(answers: PlanAnswers, entries: ProgressEntry[], asOf: string): PlanAnswers {
  if (!entries.length) return answers;
  // only the ratings: no questionnaire rung (the answers are the floor here) and no timer records (time sets no level)
  const o = outcome({ plans: [], entries, times: [], answersHistory: [] }, asOf);
  let topics: Record<string, Rung> | null = null;
  for (const t of o.areas.flatMap((a) => a.topics)) {
    if (t.reached === null || t.reached <= (answers.topics[t.topic] ?? 0)) continue;
    topics ??= { ...answers.topics };
    topics[t.topic] = t.reached as Rung;
  }
  return topics ? { ...answers, topics } : answers;
}
