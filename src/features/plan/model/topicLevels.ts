import type { ProgressEntry } from "@/features/progress/log";
import type { Rung } from "../intake/topics";
import { LEVEL_ORDER, floorOf, isAfter, levelReached, outcome } from "./outcome";
import { scoreAt } from "./teacherScores";
import type { PlanAnswers, TeacherScore } from "./types";

/*
 * The topic levels the composer paces new steps by (`reach()`'s cap per topic, and where `reach()` places the topic's
 * tracks). A level goes up one at a time from the questionnaire answer (an unanswered topic starts at new): to the next
 * level only when the progress tracker's rule counts that level itself as reached (`levelReached`, `outcome.ts`: every
 * concept with a step there solid there), then the one after only if that is reached too. A level reached higher up with
 * a gap below raises nothing, so one rating on an advanced track can't make a topic's unrated steps known. Used by
 * `composeToday` and `/dev/path`. Pure.
 */

/**
 * `answers` with each topic raised level by level as far as its ratings reach as of `asOf` (local yyyy-mm-dd). Never
 * lower than the answer; a topic never answered stays unanswered unless it goes above new. With nothing raised,
 * `answers` comes back as it is. A topic with a teacher's score (`teacherScores`) starts at its whole part instead of the
 * answer (so it can be lower), and only ratings after the score was set raise it.
 */
export function raisedAnswers(answers: PlanAnswers, entries: ProgressEntry[], asOf: string, teacherScores: TeacherScore[] = []): PlanAnswers {
  if (!entries.length && !teacherScores.length) return answers;
  // only the ratings: no questionnaire rung (the answers are the floor here) and no timer records (time sets no level)
  const o = outcome({ plans: [], entries, times: [], answersHistory: [] }, asOf);
  const afterTeacher = new Map<string, ReturnType<typeof outcome>>(); // by the time a teacher's score was set
  let topics: Record<string, Rung> | null = null;
  for (const t of o.areas.flatMap((a) => a.topics)) {
    const teacher = scoreAt(teacherScores, t.topic, asOf);
    const was = answers.topics[t.topic] ?? 0;
    const from = teacher ? floorOf(teacher.score) : was;
    let concepts = t.concepts;
    if (teacher) {
      if (!afterTeacher.has(teacher.at)) {
        afterTeacher.set(teacher.at, outcome({ plans: [], entries: entries.filter((e) => isAfter(e.at, teacher.at)), times: [], answersHistory: [] }, asOf));
      }
      concepts = afterTeacher.get(teacher.at)!.areas.flatMap((a) => a.topics).find((x) => x.topic === t.topic)!.concepts;
    }
    let level: number = from;
    while (level < LEVEL_ORDER.length - 1 && levelReached(concepts, level + 1)) level++;
    if (level === was) continue;
    topics ??= { ...answers.topics };
    topics[t.topic] = level as Rung;
  }
  return topics ? { ...answers, topics } : answers;
}
