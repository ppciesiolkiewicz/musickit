import type { Section, StoredTool } from "./tools";
import type { Area } from "./concepts";
import type { StarRating } from "@/features/progress/stars";
import type { PlanAnswers } from "../intake/answers";

export type { PlanAnswers } from "../intake/answers";

export type Level = "new" | "beginner" | "intermediate" | "advanced";

/**
 * One exercise of a day, as the AI wrote it: a title, a focus, minutes, `sections` in order (text, steps, tools;
 * model/tools.ts) and two link slots. Plans stored before sections have `how`, `steps`, `tools` and `link` instead;
 * `sectionsOf` and `linkSlots` read both.
 */
export interface PlanExercise {
  title: string;
  minutes: number;
  /** exactly what to work on: "A minor pentatonic · boxes 1 & 2", "G–C–D at 70 bpm" */
  focus?: string;
  /** why: what it improves */
  why?: string;
  /** who it is pitched at: the student's level in its area; shown as a chip */
  level?: Level;
  /** the one area it practises; shown as a chip */
  area?: Area;
  /** what kind of practice it is, from EXERCISE_TAGS ("multi-octave", "ear", …) */
  tags?: string[];
  sections?: Section[];
  /** attunr pages to read first (prerequisite lessons), shown at the top */
  learnBefore?: string[];
  /** attunr pages for going deeper, shown at the bottom */
  exploreMore?: string[];
  /** before sections */
  how?: string;
  steps?: string[];
  tools?: StoredTool[];
  link?: string;
}

export interface PlanDay {
  theme: string;
  exercises: PlanExercise[];
}

/** The config the AI returns and the player pastes: always seven days. */
export interface PlanConfig {
  title: string;
  summary?: string;
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
  /** seconds of each day's countdown already used, keyed by day index; the floating timer saves it every few seconds */
  elapsed?: Record<string, number>;
  /** how the week went, in the player's words, for the next prompt */
  feedback?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  /** local "HH:MM" */
  time: string;
  /** the local date a reminder last fired, so it fires once a day */
  lastShownOn?: string;
}

/** Everything the plan feature keeps. One document so a store can swap localStorage for an API without touching the UI. */
export interface PlanState {
  answers: PlanAnswers | null;
  current: StoredPlan | null;
  /** earlier plans, newest first */
  history: StoredPlan[];
  reminder: ReminderSettings;
}

export const PLAN_DAYS = 7;

export const EMPTY_STATE: PlanState = { answers: null, current: null, history: [], reminder: { enabled: false, time: "18:00" } };
