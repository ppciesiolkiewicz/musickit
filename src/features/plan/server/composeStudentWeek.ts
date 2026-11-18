import type { LibraryRepo } from "@/features/library/server/repo";
import { readEntries } from "@/features/userData/server/data";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { composeWeek, type ComposedDay } from "../model/compose";
import { solidRatedAt } from "../model/daySteps";
import { raisedAnswers } from "../model/topicLevels";
import type { PlanState } from "../model/types";
import { candidateOf } from "./composeToday";

/**
 * Seven days for a teacher's student from `start`, from the same inputs as `composeToday`: the library's blocks of the
 * student's areas, the steps their ratings made solid, and each topic paced by the answer, the teacher's score and the
 * ratings (`raisedAnswers` with `state.teacherScores`). Writes nothing. Every day kept, empty ones too, so day numbers
 * match dates; `short` when any day is short or empty, `no-blocks` only when every day is empty.
 */
export async function composeStudentWeek(
  d: { library: LibraryRepo; userData: UserDataRepo },
  studentId: string,
  body: { start: string; seed: string },
  state: PlanState,
): Promise<{ ok: true; days: ComposedDay[]; short: boolean } | { ok: false; code: "no-answers" | "no-blocks" }> {
  const answers = state.answers;
  if (!answers) return { ok: false, code: "no-answers" };
  const blocks = (await d.library.composeBlocks(studentId, answers.areas)).map(candidateOf);
  if (!blocks.length) return { ok: false, code: "no-blocks" };
  const entries = await readEntries(d.userData, studentId);
  const levelled = raisedAnswers(answers, entries, body.start, state.teacherScores);
  const days = composeWeek({ answers: levelled, solid: solidRatedAt(entries), blocks, date: body.start, seed: body.seed }, 7);
  if (days.every((day) => !day.exercises.length)) return { ok: false, code: "no-blocks" };
  return { ok: true, days, short: days.some((day) => day.short || !day.exercises.length) };
}
