/** What the player told the questionnaire. Feeds the prompt; never sent anywhere by the app itself. */
export interface PlanAnswers {
  instrument: Instrument;
  level: Level;
  /** where they want to go: play songs, improvise, ... (GOALS ids) */
  goals: string[];
  /** what they find hard (STRUGGLES ids) */
  struggles: string[];
  /** styles they love, free text ("blues, indie") */
  styles: string;
  /** minutes a day they can practise */
  minutes: number;
  /** anything else for the AI */
  notes: string;
}

export type Instrument = "guitar" | "piano" | "voice";
export type Level = "new" | "beginner" | "intermediate" | "advanced";

/** One exercise of a day, as the AI wrote it. `link` is an attunr path (checked against the catalogue) or absent. */
export interface PlanExercise {
  title: string;
  minutes: number;
  /** exactly what to work on: "A minor pentatonic · boxes 1 & 2", "G–C–D at 70 bpm" */
  focus?: string;
  /** how to do it, one short paragraph */
  how: string;
  /** the instructions as numbered steps, when the AI gives them */
  steps?: string[];
  /** why: what it improves */
  why?: string;
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
