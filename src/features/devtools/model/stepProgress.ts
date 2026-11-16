import { CONCEPTS, conceptIds } from "@/features/plan/model/concepts";
import { SOLID_STARS } from "@/features/plan/model/outcome";
import { addDays, dayOf } from "@/features/plan/model/schedule";
import { toolsOf } from "@/features/plan/model/tools";
import type { StoredPlan } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";
import type { Stars } from "@/features/progress/stars";
import { conceptSteps, stepOf, type ConceptSteps } from "./steps";

/*
 * Where one player is inside each concept, for the student view of /dev/path (the teacher's view of a student, tried
 * here first). A rating counts for a concept its exercise is tagged with; the step it counts for is read from the
 * exercise's own tools (`stepOf`), so nothing is tagged by hand. Pure: the page hands in the ratings.
 */

/** One rating of one concept: the step it was on (a ladder key), or null when the exercise's tools say none. */
export interface StepRating {
  concept: string;
  step: string | null;
  stars: Stars;
  /** the day it was given, yyyy-mm-dd */
  on: string;
}

export type StepState = "solid" | "working" | "none";

export interface StepProgress {
  /** "solid": its newest rating is Solid or better, or a harder step of the concept is solid */
  state: StepState;
  ratings: number;
  /** the newest rating on this step */
  stars: Stars | null;
  firstOn: string | null;
  lastOn: string | null;
}

export interface ConceptProgress {
  /** as the progress outcome has it: from the newest rating of the concept, whatever its step */
  state: "solid" | "working" | "not-yet";
  ratings: number;
  lastOn: string | null;
  /** one per step of the concept, in step order; a planned step is always "none" */
  steps: StepProgress[];
  /** the index of the step the player is on: the hardest one with a rating; null when no step has one */
  at: number | null;
  /** ratings of the concept whose exercise said no step */
  noStep: number;
}

/** The ratings of a player's log, one per concept of each entry, with the step read from the plan the entry rated. */
export function stepRatings(entries: ProgressEntry[], plans: StoredPlan[]): StepRating[] {
  return entries.flatMap((e) => {
    const exercises = plans.filter((p) => p.id === e.planId).flatMap((p) => p.config.days.flatMap((d) => d.exercises));
    // the slot the entry rated; a plan that is gone still gives the block when another plan has it
    const exercise = exercises.find((x) => x.id === e.exerciseId)
      ?? (e.blockId ? plans.flatMap((p) => p.config.days.flatMap((d) => d.exercises)).find((x) => x.blockId === e.blockId) : undefined);
    const tools = exercise ? toolsOf(exercise.cells) : [];
    // an id from before the path counts for its track
    return conceptIds(e.concepts ?? []).map((concept) => ({ concept, step: stepOf(concept, tools), stars: e.stars, on: dayOf(e.at) }));
  });
}

const newest = <T extends { on: string }>(list: T[]): T | null => list.reduce<T | null>((best, r) => (!best || r.on >= best.on ? r : best), null);

/** Every concept's progress as of a day, from the ratings up to it. */
export function stepProgress(ratings: StepRating[], asOf: string, steps: Record<string, ConceptSteps> = conceptSteps()): Record<string, ConceptProgress> {
  const out: Record<string, ConceptProgress> = {};
  const counted = ratings.filter((r) => r.on <= asOf);
  for (const { id } of CONCEPTS) {
    const mine = counted.filter((r) => r.concept === id);
    const last = newest(mine);
    const list = steps[id]?.steps ?? [];
    const per: StepProgress[] = list.map((s) => {
      const on = s.key ? mine.filter((r) => r.step === s.key) : [];
      const top = newest(on);
      return {
        state: !top ? "none" : top.stars >= SOLID_STARS ? "solid" : "working",
        ratings: on.length, stars: top?.stars ?? null,
        firstOn: on.length ? on.map((r) => r.on).sort()[0] : null, lastOn: top?.on ?? null,
      };
    });
    // a solid step carries the easier ones under it
    const topSolid = per.findLastIndex((s) => s.state === "solid");
    per.forEach((s, i) => { if (i < topSolid) s.state = "solid"; });
    const at = per.findLastIndex((s) => s.ratings > 0);
    out[id] = {
      state: !last ? "not-yet" : last.stars >= SOLID_STARS ? "solid" : "working",
      ratings: mine.length, lastOn: last?.on ?? null, steps: per, at: at < 0 ? null : at,
      noStep: mine.filter((r) => r.step === null || !list.some((s) => s.key === r.step)).length,
    };
  }
  return out;
}

/** Whole weeks from a day to another, never under 0. */
export function weeksBetween(from: string, to: string): number {
  return Math.max(0, Math.floor((Date.parse(to) - Date.parse(from)) / (7 * 86400000)));
}

/** A made-up student, to see the view with something on it. A step is named by the ladder step it is (`ladders.ts`), null for no step; `days` is how long before today a rating was given. */
export interface ExampleStudent { id: string; label: string; ratings: [concept: string, step: string | null, stars: Stars, days: number][] }

export const EXAMPLE_STUDENTS: ExampleStudent[] = [
  {
    id: "guitar-slow", label: "Example: guitar, slow and steady",
    ratings: [
      ["notes-on-neck", "note-finder:new", 5, 40], ["notes-on-neck", "note-finder:beginner", 4, 26],
      ["spider", "finger-pattern:new", 5, 38], ["spider", "finger-pattern:beginner", 2, 30], ["spider", "finger-pattern:beginner", 3, 16], ["spider", "finger-pattern:beginner", 3, 2],
      ["legato", "legato-trill:new", 2, 9], ["legato", "legato-trill:new", 3, 3],
      ["pentatonic-positions", null, 3, 28], ["pentatonic-positions", null, 3, 5],
      ["open-chords", null, 4, 33], ["open-chords", null, 3, 12],
    ],
  },
  {
    id: "guitar-fast", label: "Example: guitar, moving fast",
    ratings: [
      ["notes-on-neck", "note-finder:beginner", 5, 60], ["notes-on-neck", "note-finder:intermediate", 4, 20], ["notes-on-neck", "note-finder:advanced", 3, 4],
      ["spider", "finger-pattern:advanced", 5, 45], ["legato", "legato-trill:new", 5, 50], ["legato", "legato-trill:beginner", 5, 36], ["legato", "legato-trill:intermediate", 4, 22], ["legato", "legato-trill:advanced", 3, 6],
      ["pentatonic-positions", null, 5, 55], ["pentatonic-positions", null, 4, 18], ["triads", null, 4, 25], ["caged", null, 3, 8],
      ["open-chords", null, 5, 70], ["barre", null, 4, 48], ["power-chords", null, 5, 52],
    ],
  },
  {
    id: "voice", label: "Example: voice with some ear training",
    ratings: [
      ["pitch", null, 4, 44], ["breath", "farinelli:new", 4, 41], ["breath", "farinelli:beginner", 3, 10],
      ["steps-to-leaps", "melody-stages:do-re", 5, 43], ["steps-to-leaps", "melody-stages:mi", 5, 36], ["steps-to-leaps", "melody-stages:fa", 4, 30], ["steps-to-leaps", "melody-stages:sol", 4, 24],
      ["steps-to-leaps", "melody-stages:skips", 4, 20], ["steps-to-leaps", "melody-stages:arpeggio", 3, 11],
      ["singing-intervals", "interval-singer:new", 5, 22], ["singing-intervals", "interval-singer:beginner", 4, 15], ["singing-intervals", "interval-singer:intermediate", 3, 13], ["singing-intervals", "interval-singer:intermediate", 3, 1],
      ["runs", "run-stages:five", 3, 6],
      ["intervals", "interval-ears:1", 5, 19], ["intervals", "interval-ears:2", 4, 12], ["intervals", "interval-ears:3", 2, 4], ["home-and-colour", null, 4, 27],
    ],
  },
];

/** A ladder ref as the key of the concept's step it stands for; null when no step of the concept is that ladder step. */
const keyOf = (concept: string, ref: string | null): string | null => {
  if (ref === null) return null;
  const at = CONCEPTS.find((c) => c.id === concept)?.steps.findIndex((s) => s.ladder === ref) ?? -1;
  return at < 0 ? null : String(at);
};

export const exampleRatings = (s: ExampleStudent, today: string): StepRating[] =>
  s.ratings.map(([concept, step, stars, days]) => ({ concept, step: keyOf(concept, step), stars, on: addDays(today, -days) }));
