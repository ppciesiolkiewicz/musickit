import type { LibraryRepo } from "@/features/library/server/repo";
import { readEntries } from "@/features/userData/server/data";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { composeWeek, type ComposedDay } from "../model/compose";
import { solidRatedAt } from "../model/daySteps";
import { addDays, weekdayOf } from "../model/schedule";
import { raisedAnswers } from "../model/topicLevels";
import type { PlanState } from "../model/types";
import { candidateOf } from "./composeToday";

/**
 * Seven days for a teacher's student from `start`, from the same inputs as `composeToday`: the library's blocks of the
 * student's areas, the steps their ratings made solid, and each topic paced by the answer, the teacher's score and the
 * ratings (`raisedAnswers` with `state.teacherScores`), as of the later of `start` and `today` (a rotated week starts in
 * the past; a slider moved today and the ratings since its start still count). `yesterday`: the choice ids of the day
 * before `start`, never picked on its first practice day. With `state.practiceDays` (weekdays, Monday 0) only the days of
 * the week that fall on them are composed; the others are rest days, kept empty. Writes nothing. Every day kept, empty
 * ones too, so day numbers match dates; `short` when a practice day is short or empty, `no-blocks` only when every
 * practice day is empty.
 */
export async function composeStudentWeek(
  d: { library: LibraryRepo; userData: UserDataRepo },
  studentId: string,
  body: { start: string; seed: string; today?: string; yesterday?: string[] },
  state: PlanState,
): Promise<{ ok: true; days: ComposedDay[]; short: boolean } | { ok: false; code: "no-answers" | "no-blocks" }> {
  const answers = state.answers;
  if (!answers) return { ok: false, code: "no-answers" };
  const blocks = (await d.library.composeBlocks(studentId, answers.areas)).map(candidateOf);
  if (!blocks.length) return { ok: false, code: "no-blocks" };
  const entries = await readEntries(d.userData, studentId);
  const asOf = body.today && body.today > body.start ? body.today : body.start;
  const levelled = raisedAnswers(answers, entries, asOf, state.teacherScores);
  const practice = state.practiceDays;
  const rest = (i: number) => !!practice && !practice.includes(weekdayOf(addDays(body.start, i)));
  const days = composeWeek({ answers: levelled, solid: solidRatedAt(entries), blocks, date: body.start, seed: body.seed, yesterday: body.yesterday ?? [], history: entries, player: studentId }, 7, undefined, rest);
  if (days.every((day) => !day.exercises.length)) return { ok: false, code: "no-blocks" };
  return { ok: true, days, short: days.some((day, i) => !rest(i) && (day.short || !day.exercises.length)) };
}
