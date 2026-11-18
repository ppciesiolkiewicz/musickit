import { dayWords } from "@/features/plan/model/today";
import { moved, tenth } from "./sliders";
import type { MadePlan, StudentView } from "./types";

/**
 * Making a plan on a student's page, pure: what the page sends, what it does with the answer, and the line after.
 * The page (`ui/StudentPage.tsx`) only holds the state these return.
 */

/** The student's page as the page has it: loading, failed (a 404 is the not-found state), or the student. */
export type ViewState = { kind: "loading" } | { kind: "error"; code: string; error: string } | { kind: "view"; view: StudentView };

/** Making a plan: nothing asked yet, going out (and the page loading again after), what was made, or why not. */
export type Sent = { kind: "idle" } | { kind: "busy" } | { kind: "made"; line: string; /** a next week was made (not a rotation): the line already says when it starts */ next: boolean } | { kind: "failed"; error: string; code: string };

/** What the teacher has set: where each slider opened (`start`), where it is now (`values`), the comment, and the comment already saved on this week (what the box opened with). */
export interface MakeForm {
  start: Record<string, number>;
  values: Record<string, number>;
  comment: string;
  savedComment: string;
}

type Failure = { ok: false; code: string; error: string };

/** A local `yyyy-mm-dd` as the app writes a day: "Monday 23 November". */
const dayName = (date: string): string => dayWords(date, []).title;

/** The line after a plan was made: what attunr made and from which date, a short week, and what became of the comment. */
export function madeLine(name: string, made: Pick<MadePlan, "start" | "short" | "comment">, rotate: boolean, today: string): string {
  const when = made.start === today ? `today, ${dayName(made.start)}` : `on ${dayName(made.start)}`;
  const plan = rotate
    ? `attunr rotated ${name}'s plan for this week. The new plan keeps the same dates, from ${dayName(made.start)}.`
    : `attunr made ${name}'s next plan. It starts ${when}.`;
  const short = made.short ? ` Some days are shorter than the minutes you picked, because few exercises in the library fit ${name}'s answers.` : "";
  const comment = {
    stored: " Your words about this week are saved.",
    none: "",
    "no-week": ` Your words about this week weren't kept, because ${name} had no plan this week to keep them with.`,
  }[made.comment];
  return `${plan}${short}${comment}`;
}

/** The line at the top of a student's page while a next week is made and hasn't started: that it is made, and when it starts. */
export function waitingLine(name: string, start: string): string {
  return `${name}'s next plan is made. It starts on ${dayName(start)}.`;
}

/** The same line under "Next plan", with what pressing Make next week's plan does to the waiting week. */
export function upcomingLine(name: string, start: string): string {
  return `${waitingLine(name, start)} Press Make next week's plan below to make a new one in its place.`;
}

/**
 * What the page sends to make a plan: only the sliders the teacher moved, and the comment only when there is a week to
 * put it on and the teacher changed it (the box opens with the saved one; sending it again changes nothing).
 */
export function planInput(today: string, rotate: boolean, form: MakeForm, hasWeek: boolean) {
  const changed = form.comment.trim() !== form.savedComment.trim();
  return { today, rotate, scores: moved(form.start, form.values), comment: hasWeek && changed ? form.comment : "" };
}

/**
 * The page's answer to `postStudentPlan`. Made: the comment empties, the sliders count as unmoved where they stand (so
 * nothing is sent twice before the page loads the student again), the line says what was made, and the page reloads.
 * Failed: the route's line, and the sliders and the comment stay as the teacher left them.
 */
export function afterMake(result: ({ ok: true } & MadePlan) | Failure, form: MakeForm, name: string, rotate: boolean, today: string): { form: MakeForm; sent: Sent; reload: boolean } {
  if (!result.ok) return { form, sent: { kind: "failed", error: result.error, code: result.code }, reload: false };
  return { form: { start: form.values, values: form.values, comment: "", savedComment: "" }, sent: { kind: "made", line: madeLine(name, result, rotate, today), next: !rotate }, reload: true };
}

/**
 * A loaded student as the page's state, with every slider opening at the score today (at a tenth) and the comment box
 * at the comment already saved on the current week ("" with none); a failure as the error state.
 */
export function viewOf(r: ({ ok: true } & StudentView) | Failure): { state: ViewState; opening: Record<string, number> | null; comment: string | null } {
  if (!r.ok) return { state: { kind: "error", code: r.code, error: r.error }, opening: null, comment: null };
  const view: StudentView = { student: r.student, plan: r.plan, topics: r.topics, upcoming: r.upcoming };
  return { state: { kind: "view", view }, opening: Object.fromEntries(view.topics.map((t) => [t.topic, tenth(t.now)])), comment: view.plan?.teacher?.comment ?? "" };
}
