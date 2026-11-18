import type { Account } from "@/features/account/model";
import type { LibraryRepo } from "@/features/library/server/repo";
import { topicsFor } from "@/features/plan/intake/topics";
import type { Area } from "@/features/plan/model/concepts";
import { outcome } from "@/features/plan/model/outcome";
import { addDays, giveWeek, givenToday, storedPlans, teacherWeek, teacherWeekOn, updateGiven } from "@/features/plan/model/schedule";
import { MAX_TEACHER_COMMENT } from "@/features/plan/model/state";
import { setScores } from "@/features/plan/model/teacherScores";
import { planDays, type PlanState, type StoredPlan } from "@/features/plan/model/types";
import { composeStudentWeek } from "@/features/plan/server/composeStudentWeek";
import { readAllPlanTimes, readDocVersioned, readEntries, writeDoc } from "@/features/userData/server/data";
import { studentRow, type StudentRow, type StudentsDeps } from "./students";

/**
 * A teacher's view of a student's plan and the next week they make for them, as rules over the repos. The week is made
 * on the server and written into the student's own plan document with a version check, so nothing the student saved
 * in between is lost: a stale write reads the document again and starts over. Nothing is written when no week could
 * be made. The teacher's comment is read back here (the teacher wrote it); it never goes to the composer.
 */

export interface PlansDeps extends StudentsDeps {
  library: LibraryRepo;
}

/** How many times a week is made over a document the student keeps changing before giving up. */
const TRIES = 3;

export interface TopicSlider {
  topic: string;
  label: string;
  area: Area;
  /** the score today, 0 when nothing is known */
  now: number;
  /** the score the day before the current week started; null with no week */
  atStart: number | null;
}

/** The student's row, when the teacher has them; null for anyone else's student or an unknown id. */
async function studentOf(d: StudentsDeps, teacher: Account, studentId: string): Promise<StudentRow | null> {
  const link = await d.auth.repo.studentLink(teacher.id, studentId);
  const user = link && (await d.auth.repo.userById(studentId));
  return link && user ? studentRow(user, link.createdAt, link.claimedAt) : null;
}

/** The topics of the student's areas, in questionnaire order, with each one's score as of each date (null: nothing known). */
async function scoresOf(d: StudentsDeps, studentId: string, s: PlanState, dates: string[]): Promise<{ topic: string; label: string; area: Area; scores: (number | null)[] }[]> {
  const input = {
    plans: storedPlans(s),
    entries: await readEntries(d.userData, studentId),
    times: await readAllPlanTimes(d.userData, studentId),
    answersHistory: s.answersHistory,
    teacherScores: s.teacherScores,
  };
  const outcomes = dates.map((date) => outcome(input, date).areas.flatMap((a) => a.topics));
  return (s.answers?.areas ?? []).flatMap((area) =>
    topicsFor(area).map((t) => ({ topic: t.id, label: t.label, area, scores: outcomes.map((o) => o.find((x) => x.topic === t.id)?.score ?? null) })),
  );
}

/** The week a teacher made that is current on `today`: the one running, else the newest that has started. */
const currentWeek = (s: PlanState, today: string): StoredPlan | null => teacherWeekOn(s, today) ?? teacherWeek(s, today);

/**
 * What the teacher sees of their student: the account row, the current week (with the teacher's own comment) and a
 * slider per topic of the student's areas, opening at the score today, with the score at the start of the current week.
 */
export async function studentView(
  d: StudentsDeps,
  teacher: Account,
  studentId: string,
  today: string,
): Promise<{ ok: true; student: StudentRow; plan: StoredPlan | null; topics: TopicSlider[] } | { ok: false; error: "not-found" }> {
  const student = await studentOf(d, teacher, studentId);
  if (!student) return { ok: false, error: "not-found" };
  const s = (await readDocVersioned(d.userData, studentId, "plan")).data as PlanState;
  const plan = currentWeek(s, today);
  const dates = plan ? [today, addDays(plan.startedOn, -1)] : [today];
  const topics = (await scoresOf(d, studentId, s, dates)).map(({ scores, ...t }) => ({ ...t, now: scores[0] ?? 0, atStart: plan ? scores[1] ?? 0 : null }));
  return { ok: true, student, plan, topics };
}

/**
 * The next week for the teacher's student, written into the student's plan document:
 * 1. the moved sliders (`scores`, topics of the student's areas only, clamped to 0..3) are recorded against the scores
 *    the teacher saw (`studentView`'s `now`), so a value sent unchanged records nothing;
 * 2. the comment (trimmed, at most 2000 characters; empty changes nothing) goes on the current week, never the new one;
 * 3. the start: rotate takes the running week's start and replaces it; next starts the day after the running week's
 *    last day; with no running week either starts today;
 * 4. seven days are composed and put first in `given`.
 * The write expects the version read; when the student saved in between, it all starts again from a fresh read, up to
 * three tries, then `busy`. When no week could be made nothing is written, not the scores and not the comment.
 */
export async function makeWeek(
  d: PlansDeps,
  teacher: Account,
  studentId: string,
  input: { today: string; rotate: boolean; scores?: Record<string, number>; comment?: string },
  now: Date,
  newId: () => string,
): Promise<{ ok: true; planId: string; start: string; short: boolean } | { ok: false; error: "not-found" | "no-answers" | "no-blocks" | "busy" }> {
  if (!(await studentOf(d, teacher, studentId))) return { ok: false, error: "not-found" };
  const { today } = input;
  const madeAt = now.toISOString();
  const comment = typeof input.comment === "string" ? input.comment.trim().slice(0, MAX_TEACHER_COMMENT) : "";

  for (let i = 0; i < TRIES; i++) {
    const read = await readDocVersioned(d.userData, studentId, "plan");
    let s = read.data as PlanState;
    if (!s.answers) return { ok: false, error: "no-answers" };

    const shown = new Map((await scoresOf(d, studentId, s, [today])).map((t) => [t.topic, t.scores[0] ?? 0]));
    const moved: Record<string, number> = {};
    for (const [topic, value] of Object.entries(input.scores ?? {})) {
      if (shown.has(topic) && typeof value === "number" && Number.isFinite(value)) moved[topic] = Math.min(3, Math.max(0, value));
    }
    s = setScores(s, moved, madeAt, Object.fromEntries(shown));

    const current = currentWeek(s, today);
    if (current && comment) s = updateGiven(s, current.id, (p) => ({ ...p, teacher: { ...p.teacher!, comment } }));
    const running = current && !givenToday(current, today).over ? current : null;
    const start = !running ? today : input.rotate ? running.startedOn : addDays(running.startedOn, planDays(running));

    const week = await composeStudentWeek(d, studentId, { start, seed: `${studentId}:${start}:${madeAt}` }, s);
    if (!week.ok) return { ok: false, error: week.code };
    s = giveWeek(s, week.days, { start, madeAt, title: "", ...(input.rotate && running ? { replace: running.id } : {}) }, newId);

    const wrote = await writeDoc(d.userData, studentId, "plan", s, now, read.version);
    if (wrote.ok) return { ok: true, planId: s.given[0].id, start, short: week.short };
    if (wrote.error !== "stale") throw new Error(`the student's plan document was not written: ${wrote.error}`);
  }
  return { ok: false, error: "busy" };
}
