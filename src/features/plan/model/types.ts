import type { Cell, Choice } from "./tools";
import type { Given, Moves } from "./moves";
import type { Area } from "./concepts";
import type { StarRating } from "@/features/progress/stars";
import type { PlanAnswers } from "../intake/answers";

export type { PlanAnswers } from "../intake/answers";

export type Level = "new" | "beginner" | "intermediate" | "advanced";

/**
 * A block: the content of a note or of a plan exercise. A title (hashtags already read out of it), an optional choice
 * that sets the key, scale, tempo, position or level of the tools under it, and cells in order (model/tools.ts).
 * The reader draws a block, the editor edits one, the browser AI reads and writes one; none of them sees `ExerciseMeta`.
 */
export interface Block {
  title: string;
  choice?: Choice;
  /** what may change about it from one play to the next (model/moves.ts): any key, a range of tempos. Part of the block and its id. */
  moves?: Moves;
  cells: Cell[];
}

/** What the plan knows about a block and the block itself does not: the prompt, the week report and the plan's card use it. */
export interface ExerciseMeta {
  minutes: number;
  /** why: what it improves */
  why?: string;
  /** who it is pitched at: the student's level in its area; shown as a hashtag after the title. With `steps`, the highest of their levels (set by the parser). */
  level?: Level;
  /** the path steps it practises, "trackId:n" (model/path.ts), each in one of its `concepts`' tracks */
  steps?: string[];
  /** the one area it practises; shown as a hashtag */
  area?: Area;
  /** what kind of practice it is, from EXERCISE_TAGS ("multi-octave", "ear", …); shown as hashtags */
  tags?: string[];
  /** the questionnaire topic it practises (intake/topics.ts), always one of its area */
  topic?: string;
  /** the fine concepts it practises (model/concepts.ts), all of its topic, at most 4 */
  concepts?: string[];
  /** attunr pages to read first (prerequisite lessons), shown at the top */
  learnBefore?: string[];
  /** attunr pages for going deeper, shown at the bottom */
  exploreMore?: string[];
  /**
   * The version this exercise is played in (`Given`, model/moves.ts), set by the composer: the keys it opens in and
   * the earlier ones to go back to, its tempo and the earlier tempos. The slot's, like the minutes: never part of the
   * block's id. The reader draws the block with it (`applyGiven`; `withKeys` for a block with its own Key selector).
   */
  given?: Given;
}

/** One exercise of a day, as the AI wrote it. `id` is set by the app when the plan starts, never by the AI; ratings in the progress log point at it. */
/**
 * `id` is the slot's id in this plan run; `blockId` is the hash of the block's content and tags (`withBlockIds`, always
 * recomputed); `parentBlockId` is the block this one was edited from in the day editor.
 */
export type PlanExercise = Block & ExerciseMeta & { id?: string; blockId?: string; parentBlockId?: string };

export interface PlanDay {
  theme: string;
  exercises: PlanExercise[];
}

/** The config the AI returns and the player pastes: always seven days. A composed plan (`startDay`) has one. */
export interface PlanConfig {
  title: string;
  summary?: string;
  /** the AI's own notes on the student's progress, sent back with the next prompt; never shown to the student */
  progress?: string;
  days: PlanDay[];
}

/** A pasted plan the player is (or was) following. Days count from `startedOn`, a local yyyy-mm-dd. */
export interface StoredPlan {
  id: string;
  config: PlanConfig;
  startedOn: string;
  /** exercises ticked off, keyed `${dayIndex}:${exerciseIndex}` */
  done: Record<string, true>;
  /** how each finished exercise went, same keys as `done`; a rated exercise is also in `done` (older plans only have `done`) */
  rated?: Record<string, StarRating>;
  /** how the week went, in the player's words, for the next prompt */
  feedback?: string;
  /** the id of the invite (a plan share) this copy was claimed from; absent for the player's own plans */
  from?: string;
  /** the name of the person who shared it, as their account had it when this copy was claimed; absent when unknown */
  sharedBy?: string;
  /** a shared plan the player took off "Plans shared with you"; kept, so its ratings still count for progress */
  hidden?: true;
  /**
   * Set on a composed one-day plan only (the player's own, `startDay`): which try of the day it is (from 0), the block ids
   * turned down today (never picked again that day) and whether the library had too little to fill the minutes.
   */
  composed?: { attempt: number; declined: string[]; short: boolean };
  /** Set on a week a teacher made for the student: when (ISO datetime) and the teacher's comment, for our team only (at most 2000 characters). */
  teacher?: { madeAt: string; comment?: string };
}

export interface ReminderSettings {
  enabled: boolean;
  /** local "HH:MM" */
  time: string;
  /** the local date a reminder last fired, so it fires once a day */
  lastShownOn?: string;
}

/** Everything the plan feature keeps. One document so a store can swap localStorage for an API without touching the UI. */
/** The questionnaire as finished once: its topic lines, with when. `at` is an ISO datetime, or a bare local yyyy-mm-dd for an entry moved over from stored answers. */
export interface AnswersEntry {
  at: string;
  topics: PlanAnswers["topics"];
}

/** A score (0 to 3, a tenth at a time) a teacher set for a topic, and when (ISO datetime). From then on it is the topic's score; see `topicOutcome`. */
export interface TeacherScore {
  topic: string;
  score: number;
  at: string;
  /** the teacher's local day (yyyy-mm-dd) when it was set; the entry counts from this day (old entries: the date of `at`) */
  day?: string;
}

export interface PlanState {
  answers: PlanAnswers | null;
  /** every finished questionnaire, oldest first (the first is the starting point) */
  answersHistory: AnswersEntry[];
  current: StoredPlan | null;
  /** earlier plans, newest first */
  history: StoredPlan[];
  /** plans the player was given (claimed from an invite, `from` set), newest first; never `current` */
  given: StoredPlan[];
  /** the scores a teacher set, oldest first (`teacherScores.ts`); `[]` when none */
  teacherScores: TeacherScore[];
  reminder: ReminderSettings;
}

/** How many days a parsed plan has (`parsePlanConfig`, the prompt). A stored plan's own length is `planDays`. */
export const PLAN_DAYS = 7;

/** How many days this plan has: one for a composed day, seven for a parsed or given plan. */
export const planDays = (p: StoredPlan): number => p.config.days.length;

export const EMPTY_STATE: PlanState = { answers: null, answersHistory: [], current: null, history: [], given: [], teacherScores: [], reminder: { enabled: false, time: "18:00" } };
