import type { Section, StoredTool } from "./tools";
import type { Voice } from "@/features/theory/singing";
import type { Area } from "./concepts";

/** How well the player knows a concept: 1 = not at all, 5 = solid. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** What the player told the questionnaire. Feeds the prompt; never sent anywhere by the app itself. */
export interface PlanAnswers {
  /** self-rated level per area; an area left out is not practised */
  levels: Partial<Record<Area, Level>>;
  /** concept id (model/concepts.ts) to how well they know it */
  ratings: Record<string, Rating>;
  voice?: { type?: Voice; range?: { low: number; high: number } };
  /** concept ids to work on first, at most 3 */
  focus: string[];
  /** minutes a day they can practise */
  minutes: number;
  /** styles they love, free text ("blues, indie") */
  styles: string;
  /** anything else for the AI */
  notes: string;
}

export type Level = "new" | "beginner" | "intermediate" | "advanced";

/**
 * One exercise of a day, as the AI wrote it: a title, a focus, minutes, and `sections` in order (text, steps, tools, links;
 * model/tools.ts). Plans stored before sections have `how`, `steps`, `tools` and `link` instead; `sectionsOf` reads both.
 */
export interface PlanExercise {
  title: string;
  minutes: number;
  /** exactly what to work on: "A minor pentatonic · boxes 1 & 2", "G–C–D at 70 bpm" */
  focus?: string;
  /** why: what it improves */
  why?: string;
  /** what kind of practice it is, from EXERCISE_TAGS ("multi-octave", "ear", …) */
  tags?: string[];
  sections?: Section[];
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
