import { topicById } from "../intake/topics";
import { conceptById } from "./concepts";
import type { ComposedDay } from "./compose";
import { anotherDay, doneKey, ownDay, startDay, teacherWeek, teacherWeekOn, upcomingTeacherWeek } from "./schedule";
import type { PlanExercise, PlanState, StoredPlan } from "./types";
import type { ComposeResult } from "../store/composeClient";

/*
 * The words and checks of today's composed plan (NEW7), pure: no AI writes them.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** An exercise's questionnaire topic: its own, else the topic of the first step's track that has one. */
function topicOf(e: PlanExercise): string | undefined {
  if (e.topic && topicById(e.topic)) return e.topic;
  for (const ref of e.steps ?? []) {
    const topic = conceptById(ref.slice(0, ref.lastIndexOf(":")))?.topic;
    if (topic && topicById(topic)) return topic;
  }
  return undefined;
}

/** A topic's name inside a sentence: lower case, unless it is written in capitals ("CAGED"). */
const inSentence = (label: string): string => (/^[A-Z]{2,}\b/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));

/** "a", "a and b", "a, b and c". */
const joined = (xs: string[]): string => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** How long a plan is: "1 day", "7 days". */
export const daysLabel = (n: number): string => `${n} day${n === 1 ? "" : "s"}`;

/** A local `yyyy-mm-dd` as its day and month: "16 November". */
export function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const at = new Date(y, m - 1, d);
  return `${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

/**
 * The words a composed day is stored with: the title is its date ("Wednesday 18 November"), the theme the questionnaire
 * topics its exercises practise, each once, in the order they come ("Scales, basic chords and pitch"); "" with none.
 */
export function dayWords(date: string, exercises: PlanExercise[]): { title: string; theme: string } {
  const [y, m, d] = date.split("-").map(Number);
  const at = new Date(y, m - 1, d);
  const title = `${WEEKDAYS[at.getDay()]} ${dateLabel(date)}`;
  const labels = [...new Set(exercises.map(topicOf).filter((t): t is string => !!t))].map((id) => topicById(id)!.label);
  const words = labels.map((l, i) => (i === 0 ? l : inSentence(l)));
  return { title, theme: joined(words) };
}

/** Whether a title is a composed day's date title (`dayWords`: "Wednesday 18 November"), which names the sharer's day once shared. */
export const isDayTitle = (title: string): boolean =>
  new RegExp(`^(${WEEKDAYS.join("|")}) \\d{1,2} (${MONTHS.join("|")})$`).test(title);

/**
 * Whether another try of today brought anything new: an exercise that is not one of today's rated ones (the server keeps
 * those). When it brought nothing, today's plan stays as it is and the page says there are no other exercises.
 */
export function hasNewPicks(today: StoredPlan | null, day: ComposedDay): boolean {
  const before = today?.config.days[0]?.exercises ?? [];
  const rated = new Set(before.flatMap((e, i) => (today?.rated?.[doneKey(0, i)] && e.blockId ? [e.blockId] : [])));
  return day.exercises.some((e) => !e.blockId || !rated.has(e.blockId));
}

/** How many past days `/plan` lists. Every day is kept (`history`, up to its cap); the page shows the newest. */
export const PAST_DAYS = 14;

/**
 * The past days, newest first, the last `PAST_DAYS`: the composed days of the history, and the composed `current` when it is
 * from before `date` (today's plan didn't come yet, so yesterday's is still current). A given or seven-day plan is not one.
 */
export function pastDays(history: StoredPlan[], current: StoredPlan | null, date: string): StoredPlan[] {
  const days = [...(current?.composed && current.startedOn < date ? [current] : []), ...history.filter((p) => !!p.composed)];
  return days.sort((a, b) => (a.startedOn < b.startedOn ? 1 : a.startedOn > b.startedOn ? -1 : 0)).slice(0, PAST_DAYS);
}

/**
 * Why today's plan, or another one, isn't there: a route code (`taught`: the account became a teacher's student, whose
 * plans are the teacher's; a page loaded before that), the request itself (`offline`, `logged-out`, `account-changed`, `failed`), or `later`, a plan for a later date already running (another tab or device): this
 * device's date is behind the plan's.
 */
export type TodayFailure = "no-blocks" | "bad-date" | "later" | "offline" | "logged-out" | "account-changed" | "taught" | "failed";

type Failed = Extract<ComposeResult, { ok: false }>["code"];
/** `no-answers` can't happen after the flush (the page has answers): it is said as a failed request, with the retry. */
const failureOf = (code: Failed): TodayFailure => (code === "no-answers" ? "failed" : code);

/** What `/plan` shows for today: the plan is being made only while a request is out (or about to go out), never otherwise. */
export type TodayView =
  | { kind: "loading" }
  | { kind: "intro" }
  | { kind: "plan"; plan: StoredPlan }
  | { kind: "making" }
  | { kind: "failed"; failure: TodayFailure };

export interface TodayInput {
  loaded: boolean;
  answers: boolean;
  /** today's own plan (`ownDay`) */
  own: StoredPlan | null;
  /** this date was asked for in this page view */
  asked: boolean;
  /** a request is out */
  inFlight: boolean;
  failure: TodayFailure | null;
  /** nothing is composed: the account is a teacher's student (their plans are the teacher's weeks), or not known yet */
  off?: boolean;
}

export function todayView(i: TodayInput): TodayView {
  if (!i.loaded || i.off) return { kind: "loading" };
  if (!i.answers) return { kind: "intro" };
  if (i.own) return { kind: "plan", plan: i.own };
  if (i.inFlight) return { kind: "making" };
  if (i.failure) return { kind: "failed", failure: i.failure };
  // asked, nothing out, no answer kept (the plan went away after it came): a failed request, with Try again
  if (i.asked) return { kind: "failed", failure: "failed" };
  // not asked yet: the request goes out in the same commit (`shouldAsk`)
  return { kind: "making" };
}

/**
 * The date the page shows today's plan for: the clock's (`localDate`, read every minute and when the page is shown again),
 * so a page left open past midnight moves to the new day like a fresh visit. While an edit is open or a request is out
 * (`busy`) it stays, and moves when that ends.
 */
export const pageDate = (shown: string, clock: string, busy: boolean): string => (busy ? shown : clock);

/** Whether the page asks for today's plan now: once per page view and date, with answers and no plan for today. */
export const shouldAsk = (i: Pick<TodayInput, "loaded" | "answers" | "own" | "asked" | "off">): boolean => !i.off && i.loaded && i.answers && !i.own && !i.asked;

/**
 * What `/plan` draws for a teacher's student (`Account.taught`), whose plans are the weeks their teacher makes, never a
 * composed day: the week covering `date` (`teacherWeekOn`); else a week still to come, with the day it starts in words
 * ("Monday 23 November"); else the newest week that has ended; else none. `older`: the other weeks the teacher made that
 * have started, newest first, each listed as a link to its own page. A plan shared with the student is not one of them.
 */
export type TaughtView =
  | { kind: "week"; plan: StoredPlan; older: StoredPlan[] }
  | { kind: "upcoming"; plan: StoredPlan; starts: string; older: StoredPlan[] }
  | { kind: "ended"; plan: StoredPlan; older: StoredPlan[] }
  | { kind: "none"; older: StoredPlan[] };

export function taughtView(s: PlanState, date: string): TaughtView {
  const started = (shown: StoredPlan | null) =>
    s.given
      .filter((p) => p.teacher && p.startedOn <= date && p !== shown)
      .sort((a, b) => (a.startedOn !== b.startedOn ? (a.startedOn < b.startedOn ? 1 : -1) : Date.parse(b.teacher!.madeAt) - Date.parse(a.teacher!.madeAt)));
  const on = teacherWeekOn(s, date);
  if (on) return { kind: "week", plan: on, older: started(on) };
  const next = upcomingTeacherWeek(s, date);
  if (next) return { kind: "upcoming", plan: next, starts: dayWords(next.startedOn, []).title, older: started(null) };
  const last = teacherWeek(s, date);
  if (last) return { kind: "ended", plan: last, older: started(last) };
  return { kind: "none", older: [] };
}

/** The first plan of the day's answer applied: the day stored with its words, or what the page says instead. */
export function applyFirst(s: PlanState, date: string, r: ComposeResult, newId: () => string): { state: PlanState; failure: TodayFailure | null } {
  if (!r.ok) return { state: s, failure: failureOf(r.code) };
  const next = startDay(s, r.day, { date: r.date, attempt: r.attempt, ...dayWords(r.date, r.day.exercises) }, newId);
  // a plan of a later date running (another tab, past midnight): this page's date is behind
  return ownDay(next, date) ? { state: next, failure: null } : { state: s, failure: "later" };
}

/**
 * Another plan's answer applied. `none`: no other exercise for today's steps (only today's rated ones came back, or a 409
 * `no-blocks`), the plan stays. A failure, or an answer for a try already stored (late or twice), also leaves it.
 */
export function applyAnother(s: PlanState, date: string, r: ComposeResult, newId: () => string): { state: PlanState; outcome: "changed" | "none" | TodayFailure } {
  if (!r.ok) return { state: s, outcome: r.code === "no-blocks" ? "none" : failureOf(r.code) };
  if (!hasNewPicks(ownDay(s, date), r.day)) return { state: s, outcome: "none" };
  const next = anotherDay(s, r.day, { date: r.date, attempt: r.attempt, ...dayWords(r.date, r.day.exercises) }, newId);
  return next === s ? { state: s, outcome: "failed" } : { state: next, outcome: "changed" };
}
