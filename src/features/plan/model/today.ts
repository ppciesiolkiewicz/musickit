import { topicById } from "../intake/topics";
import { conceptById } from "./concepts";
import type { ComposedDay } from "./compose";
import { doneKey } from "./schedule";
import type { PlanExercise, StoredPlan } from "./types";

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

/**
 * The words a composed day is stored with: the title is its date ("Wednesday 18 November"), the theme the questionnaire
 * topics its exercises practise, each once, in the order they come ("Scales, basic chords and pitch"); "" with none.
 */
export function dayWords(date: string, exercises: PlanExercise[]): { title: string; theme: string } {
  const [y, m, d] = date.split("-").map(Number);
  const at = new Date(y, m - 1, d);
  const title = `${WEEKDAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}`;
  const labels = [...new Set(exercises.map(topicOf).filter((t): t is string => !!t))].map((id) => topicById(id)!.label);
  const words = labels.map((l, i) => (i === 0 ? l : inSentence(l)));
  return { title, theme: joined(words) };
}

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

/** The composed days of the history, newest first, the last `PAST_DAYS`. A given or seven-day plan is not a past day. */
export const pastDays = (history: StoredPlan[]): StoredPlan[] =>
  history.filter((p) => !!p.composed).sort((a, b) => (a.startedOn < b.startedOn ? 1 : a.startedOn > b.startedOn ? -1 : 0)).slice(0, PAST_DAYS);
