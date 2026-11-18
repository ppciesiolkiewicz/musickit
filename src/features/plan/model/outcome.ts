import type { PlanAnswers } from "../intake/answers";
import { topicById, topicsFor, type Rung } from "../intake/topics";
import type { ProgressEntry } from "@/features/progress/log";
import { AREAS, conceptById, conceptIds, conceptsOf, type Area } from "./concepts";
import { stepAt } from "./path";
import type { DayTime } from "./planTime";
import { addDays, dayOf } from "./schedule";
import { scoreAt } from "./teacherScores";
import type { AnswersEntry, Level, StoredPlan, TeacherScore } from "./types";

/*
 * What the questionnaire says about where a student starts, shaped for the outcome view.
 * `outcome()` is the ratings-based view of where the student is, as of a date (spec: the progress tracker).
 */

/** One topic and the rung the student picked for it (0 to 3), or null when it was not answered. */
export type TopicScore = { topic: string; label: string; score: number | null };

/** Every area in AREAS order, its topics in questionnaire order, each with its starting score. */
export function startOutcome(topics: PlanAnswers["topics"]): { area: Area; topics: TopicScore[] }[] {
  return AREAS.map(({ id }) => ({
    area: id,
    topics: topicsFor(id).map((t) => ({ topic: t.id, label: t.label, score: Object.hasOwn(topics, t.id) ? topics[t.id] : null })),
  }));
}

/** A concept is solid from this many stars on its newest rating. */
export const SOLID_STARS = 4;
/** Seconds of practice that make a day count for the streak. */
export const STREAK_SECONDS = 300;
/** The four levels, lowest first; the index is a topic's score step (0 to 3). */
export const LEVEL_ORDER: readonly Level[] = ["new", "beginner", "intermediate", "advanced"];

export interface OutcomeInput {
  plans: StoredPlan[];
  entries: ProgressEntry[];
  times: DayTime[];
  answersHistory: AnswersEntry[];
  /** what a teacher set for topics (`PlanState.teacherScores`); from then on a topic's score is that value plus what ratings after it add */
  teacherScores?: TeacherScore[];
}

export type ConceptState = "solid" | "working" | "not-yet";

export interface ConceptOutcome {
  id: string;
  label: string;
  /** the level of its first step */
  level: Level;
  /** every level its steps reach, lowest first */
  levels: Level[];
  /** from the newest rating, whatever its level */
  state: ConceptState;
  /** per level of `levels`: the state of its last step at that level or under it (`steps`) */
  at: Partial<Record<Level, ConceptState>>;
  /** per step of its track, in order: from the newest rating that reaches that step or a later one (`reachIndex`) */
  steps: StepOutcome[];
  /** counted ratings tagged with this concept */
  ratings: number;
  /** the day of the newest counted rating, or null */
  lastOn: string | null;
  seconds: number;
}

export interface StepOutcome {
  /** "trackId:n", n from 1 */
  ref: string;
  level: Level;
  state: ConceptState;
}

export interface TopicOutcome extends TopicScore {
  area: Area;
  /** the rung of the last counted questionnaire, or null */
  rung: Rung | null;
  /** the highest level the topic stands on (0 to 3), or null when nothing is known */
  reached: number | null;
  ratings: number;
  seconds: number;
  concepts: ConceptOutcome[];
}

export interface AreaOutcome {
  area: Area;
  label: string;
  topics: TopicOutcome[];
  ratings: number;
  seconds: number;
}

export interface Streak {
  days: number;
  through: string | null;
  practised: string[];
}

export interface Outcome {
  asOf: string;
  areas: AreaOutcome[];
  streak: Streak;
  seconds: { total: number; sorted: number };
}

/** The day an `at` falls on, when it is a real date no later than `asOf`; a broken `at` is never counted. */
const countedOn = (at: string, asOf: string): string | null => {
  const day = dayOf(at);
  return /^\d{4}-\d\d-\d\d$/.test(day) && day <= asOf ? day : null;
};

/** A counted rating with what it is about, as far as the app knows these ids. */
interface Rated extends Tags {
  entry: ProgressEntry;
  /** the path steps its block named that point at a step, "trackId:n" */
  steps: string[];
}

/** What a tagged thing (an entry, an exercise) is about, as far as the app knows these ids. */
interface Tags {
  concepts: string[];
  topic: string | null;
  area: Area | null;
}

/** Known concepts only, an id from before the path as its track; the topic as named, else the first concept's; the area from the topic, else as named. */
function tagsOf(t: { concepts?: string[]; topic?: string; area?: string }): Tags {
  const concepts = conceptIds(t.concepts ?? []);
  const topic = t.topic && topicById(t.topic) ? t.topic : concepts.length ? conceptById(concepts[0])!.topic : null;
  const area = topic ? topicById(topic)?.area ?? null : AREAS.some((a) => a.id === t.area) ? (t.area as Area) : null;
  return { concepts, topic, area };
}

function ratedEntries(entries: ProgressEntry[], asOf: string): Rated[] {
  const out: Rated[] = [];
  for (const entry of entries) {
    if (countedOn(entry.at, asOf) === null) continue;
    out.push({ entry, ...tagsOf(entry), steps: (entry.steps ?? []).filter((r) => stepAt(r)) });
  }
  return out;
}

/** The rung of the last questionnaire (array order) counted as of the day. */
function rungOf(history: AnswersEntry[], topic: string, asOf: string): Rung | null {
  const last = history.findLast((h) => countedOn(h.at, asOf) !== null);
  return last && Object.hasOwn(last.topics, topic) ? last.topics[topic] : null;
}

/**
 * The level a rating counts at for a concept: the block's own level tag inside the concept's span, the nearest end when
 * it is outside, the concept's first level when there is none. A rating counts for that level and every level of the
 * span below it, never above.
 */
export function ratingLevel(levels: readonly Level[], tag: string | undefined): Level {
  const i = LEVEL_ORDER.indexOf(tag as Level);
  if (i < 0) return levels[0];
  if (i < LEVEL_ORDER.indexOf(levels[0])) return levels[0];
  if (i > LEVEL_ORDER.indexOf(levels[levels.length - 1])) return levels[levels.length - 1];
  return LEVEL_ORDER[i];
}

/**
 * How far along a concept's track a rating reaches (a step index, from 0): the highest of the steps its block named on
 * that track; for a block that named none there (one rated before blocks named steps), the last step at its level
 * (`ratingLevel`). A rating counts for that step and every step before it in the track, never after.
 */
export function reachIndex(conceptId: string, r: { steps: readonly string[]; entry: Pick<ProgressEntry, "level"> }): number {
  const c = conceptById(conceptId)!;
  const named = r.steps.flatMap((ref) => { const at = stepAt(ref); return at && at.track.id === conceptId ? [at.index] : []; });
  if (named.length) return Math.max(...named);
  const level = ratingLevel(c.levels, r.entry.level);
  return c.steps.findLastIndex((st) => LEVEL_ORDER.indexOf(st.level) <= LEVEL_ORDER.indexOf(level));
}

const stateOf = (list: ProgressEntry[]): { state: ConceptState; newest: ProgressEntry | null } => {
  let newest: ProgressEntry | null = null;
  for (const entry of list) if (!newest || Date.parse(entry.at) >= Date.parse(newest.at)) newest = entry;
  return { newest, state: !newest ? "not-yet" : newest.stars >= SOLID_STARS ? "solid" : "working" };
};

function conceptOutcome(id: string, rated: Rated[]): ConceptOutcome {
  const c = conceptById(id)!;
  const mine = rated.filter((r) => r.concepts.includes(id)).map((r) => ({ entry: r.entry, reach: reachIndex(id, r) }));
  const { state, newest } = stateOf(mine.map((m) => m.entry));
  const steps: StepOutcome[] = c.steps.map((st, i) => ({
    ref: `${id}:${i + 1}`, level: st.level, state: stateOf(mine.filter((m) => m.reach >= i).map((m) => m.entry)).state,
  }));
  const at: ConceptOutcome["at"] = {};
  // a level is judged by its last step; one the span crosses with no step of its own, by the last step under it
  for (const level of c.levels) at[level] = steps[c.steps.findLastIndex((st) => LEVEL_ORDER.indexOf(st.level) <= LEVEL_ORDER.indexOf(level))].state;
  return { id, label: c.label, level: c.level, levels: c.levels, state, at, steps, ratings: mine.length, lastOn: newest ? dayOf(newest.at) : null, seconds: 0 };
}

// a concept stands at every level its steps reach, and is judged at each by the ratings there or above
const conceptsAt = (concepts: ConceptOutcome[], i: number) => concepts.filter((c) => c.levels.includes(LEVEL_ORDER[i]));
const solidAt = (i: number) => (c: ConceptOutcome) => c.at[LEVEL_ORDER[i]] === "solid";

/**
 * Whether a topic's level `i` (an index of `LEVEL_ORDER`) is reached from practice: it has concepts in the topic and every
 * one is solid there. Each level is judged on its own: a level below need not be solid.
 */
export const levelReached = (concepts: ConceptOutcome[], i: number): boolean => {
  const at = conceptsAt(concepts, i);
  return at.length > 0 && at.every(solidAt(i));
};

/** The level reached and the score between levels, from the rung and the concepts' states at each level. */
function scoreOf(concepts: ConceptOutcome[], rung: Rung | null, rated: boolean): { reached: number | null; score: number | null } {
  const at = (i: number) => conceptsAt(concepts, i);
  // levels are judged one by one: an empty level is never the one checked, so it doesn't block
  const practised = [0, 1, 2, 3].filter((i) => levelReached(concepts, i));
  const fromPractice = practised.length ? Math.max(...practised) : null;
  const floor = rung ?? (rated ? 0 : null); // no answer: "new" once the topic has any rating
  if (floor === null && fromPractice === null) return { reached: null, score: null };
  const reached = Math.max(floor ?? 0, fromPractice ?? 0);
  if (reached >= 3) return { reached, score: 3 }; // advanced: no fraction
  const up = at(reached + 1);
  return { reached, score: reached + (up.length ? up.filter(solidAt(reached + 1)).length / up.length : 0) }; // no concepts one level up: stays at reached
}

/**
 * Whether a rating's `at` is after a teacher's `t` (ISO datetime). A rating with only a date (an old entry) is after it
 * when its date is later than the teacher's day (`day`, the entry's own, else the local date of `t`): with no time, one
 * on the teacher's own day is not counted.
 */
export const isAfter = (at: string, t: string, day?: string): boolean =>
  /^\d{4}-\d\d-\d\d$/.test(at) ? at > (day ?? dayOf(t)) : Date.parse(at) > Date.parse(t);

/** A teacher's value as the level it stands on: its whole part, 0 to 3. */
export const floorOf = (score: number): Rung => Math.min(3, Math.max(0, Math.floor(score))) as Rung;

function topicOutcome(id: string, area: Area, label: string, rated: Rated[], history: AnswersEntry[], asOf: string, teacher: TeacherScore | null): TopicOutcome {
  const mine = rated.filter((r) => r.topic === id);
  const concepts = conceptsOf(id).map((c) => conceptOutcome(c.id, rated));
  const rung = rungOf(history, id, asOf);
  if (!teacher) {
    const { reached, score } = scoreOf(concepts, rung, mine.length > 0);
    return { topic: id, label, score, area, rung, reached, ratings: mine.length, seconds: 0, concepts };
  }
  // the teacher's value is the start: the rung is its whole part, and only ratings after it count toward the rest
  const after = rated.filter((r) => isAfter(r.entry.at, teacher.at, teacher.day));
  const fromTeacher = scoreOf(conceptsOf(id).map((c) => conceptOutcome(c.id, after)), floorOf(teacher.score), true);
  const score = Math.min(3, Math.max(teacher.score, fromTeacher.score ?? 0));
  return { topic: id, label, score, area, rung, reached: Math.max(floorOf(teacher.score), fromTeacher.reached ?? 0), ratings: mine.length, seconds: 0, concepts };
}

/** The tags of a slot of a time record: its exercise in the record's plan, else its block id found on any plan exercise or entry, else none. */
function slotTags(record: DayTime, slot: string, input: OutcomeInput): Tags | null {
  const exercises = (planId: string | null) =>
    input.plans.filter((p) => planId === null || p.id === planId).flatMap((p) => p.config.days.flatMap((d) => d.exercises));
  const own = exercises(record.planId).find((e) => e.id === slot);
  if (own) return tagsOf(own);
  const blockId = record.blocks?.[slot];
  if (!blockId) return null;
  const byBlock = exercises(null).find((e) => e.blockId === blockId) ?? input.entries.find((e) => e.blockId === blockId);
  return byBlock ? tagsOf(byBlock) : null;
}

/** A record's dates with their seconds: those in `on` when they add up to something, else its one fallback date, else null (undated). */
function datesOf(record: DayTime, plans: StoredPlan[]): { dates: Record<string, number> | null; fromOn: boolean } {
  const on = Object.entries(record.on ?? {}).filter(([d, s]) => /^\d{4}-\d\d-\d\d$/.test(d) && s > 0);
  if (on.length) return { dates: Object.fromEntries(on), fromOn: true };
  const plan = plans.find((p) => p.id === record.planId);
  return { dates: plan ? { [addDays(plan.startedOn, record.day)]: record.elapsed } : null, fromOn: false };
}

/** Every slot's seconds counted as of the day with its tags, and the seconds of each counted date, for the streak. */
function timeAsOf(input: OutcomeInput, asOf: string): { slots: { tags: Tags | null; seconds: number }[]; byDate: Record<string, number> } {
  const slots: { tags: Tags | null; seconds: number }[] = [];
  const byDate: Record<string, number> = {};
  for (const record of input.times) {
    const { dates, fromOn } = datesOf(record, input.plans);
    let share = 1; // an undated record counts in every run
    if (dates) {
      let all = 0, upTo = 0;
      for (const [d, s] of Object.entries(dates)) {
        all += s;
        if (countedOn(d, asOf) === null) continue;
        upTo += s;
        byDate[d] = (byDate[d] ?? 0) + s;
      }
      // with `on`, the share of its seconds dated up to asOf; without it, the one date is all or nothing
      share = fromOn ? upTo / all : countedOn(Object.keys(dates)[0], asOf) !== null ? 1 : 0;
    }
    for (const [slot, seconds] of Object.entries(record.spent)) {
      slots.push({ tags: slotTags(record, slot, input), seconds: share === 1 ? seconds : Math.floor(seconds * share) });
    }
  }
  return { slots, byDate };
}

/** The streak: consecutive practised days ending at `asOf`, or at the day before when `asOf` isn't practised yet. */
function streakOf(rated: Rated[], byDate: Record<string, number>, asOf: string): Streak {
  const days = new Set<string>();
  for (const r of rated) days.add(dayOf(r.entry.at));
  for (const [d, s] of Object.entries(byDate)) if (s >= STREAK_SECONDS) days.add(d);
  const practised = [...days].sort().reverse();
  let from = days.has(asOf) ? asOf : addDays(asOf, -1);
  if (!days.has(from)) return { days: 0, through: null, practised };
  const through = from;
  let n = 0;
  for (; days.has(from); from = addDays(from, -1)) n++;
  return { days: n, through, practised };
}

/**
 * Where the student is as of a day (local yyyy-mm-dd): per concept, topic and area, from the ratings and the
 * questionnaires up to then. Time and the streak come from the day timer's records.
 */
export function outcome(input: OutcomeInput, asOf: string): Outcome {
  const rated = ratedEntries(input.entries, asOf);
  const { slots, byDate } = timeAsOf(input, asOf);
  const areas: AreaOutcome[] = AREAS.map(({ id, label }) => ({
    area: id,
    label,
    topics: topicsFor(id).map((t) => topicOutcome(t.id, id, t.label, rated, input.answersHistory, asOf, scoreAt(input.teacherScores ?? [], t.id, asOf))),
    ratings: rated.filter((r) => r.area === id).length,
    seconds: 0,
  }));
  const topics = areas.flatMap((a) => a.topics);
  const concepts = topics.flatMap((t) => t.concepts);
  let total = 0, sorted = 0;
  for (const { tags, seconds } of slots) {
    total += seconds;
    if (!tags || seconds === 0) continue;
    const topic = tags.topic && topics.find((t) => t.topic === tags.topic);
    const area = tags.area && areas.find((a) => a.area === tags.area);
    for (const id of new Set(tags.concepts)) concepts.find((c) => c.id === id)!.seconds += seconds;
    if (topic) topic.seconds += seconds;
    if (area) area.seconds += seconds;
    if (topic || area) sorted += seconds;
  }
  return { asOf, areas, streak: streakOf(rated, byDate, asOf), seconds: { total, sorted } };
}

/** The step refs rated solid, for `reach({ solid })` (reach.ts): the composer's input for what a player knows. */
export const solidSteps = (o: Outcome): string[] =>
  o.areas.flatMap((a) => a.topics.flatMap((t) => t.concepts.flatMap((c) => c.steps.filter((st) => st.state === "solid").map((st) => st.ref))));
