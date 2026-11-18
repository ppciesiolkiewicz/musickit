import { CONCEPTS, conceptIds } from "@/features/plan/model/concepts";
import type { Rung } from "@/features/plan/intake/topics";
import { solidRatedAt } from "@/features/plan/model/daySteps";
import { SOLID_STARS, reachIndex } from "@/features/plan/model/outcome";
import { stepAt } from "@/features/plan/model/path";
import { reach, type StepReach } from "@/features/plan/model/reach";
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
export interface ExampleStudent {
  id: string; label: string;
  /** their questionnaire answers: the line picked per topic (0 to 3), for `reach` */
  topics: Record<string, Rung>;
  ratings: [concept: string, step: string | null, stars: Stars, days: number][];
}

export const EXAMPLE_STUDENTS: ExampleStudent[] = [
  {
    id: "guitar-slow", label: "Example: guitar, slow and steady",
    topics: { "guitar-scales": 1, "guitar-basic-chords": 1, "guitar-techniques": 1 },
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
    topics: { "guitar-scales": 2, "guitar-basic-chords": 2, "guitar-barre-chords": 1, "guitar-caged": 1, "guitar-techniques": 2 },
    ratings: [
      ["notes-on-neck", "note-finder:beginner", 5, 60], ["notes-on-neck", "note-finder:intermediate", 4, 20], ["notes-on-neck", "note-finder:advanced", 3, 4],
      ["spider", "finger-pattern:advanced", 5, 45], ["legato", "legato-trill:new", 5, 50], ["legato", "legato-trill:beginner", 5, 36], ["legato", "legato-trill:intermediate", 4, 22], ["legato", "legato-trill:advanced", 3, 6],
      ["pentatonic-positions", null, 5, 55], ["pentatonic-positions", null, 4, 18], ["triads", null, 4, 25], ["caged", null, 3, 8],
      ["open-chords", null, 5, 70], ["barre", null, 4, 48], ["power-chords", null, 5, 52],
    ],
  },
  {
    id: "voice", label: "Example: voice with some ear training",
    topics: { "voice-pitch": 1, "voice-intervals": 1, "voice-melodies": 1, "voice-breath-range": 1, "theory-ear": 1 },
    ratings: [
      ["pitch", null, 4, 44], ["breath", "farinelli:new", 4, 41], ["breath", "farinelli:beginner", 3, 10],
      ["steps-to-leaps", "melody-stages:do-re", 5, 43], ["steps-to-leaps", "melody-stages:mi", 5, 36], ["steps-to-leaps", "melody-stages:fa", 4, 30], ["steps-to-leaps", "melody-stages:sol", 4, 24],
      ["steps-to-leaps", "melody-stages:skips", 4, 20], ["steps-to-leaps", "melody-stages:arpeggio", 3, 11],
      ["singing-intervals", "interval-singer:new", 5, 22], ["singing-intervals", "interval-singer:beginner", 4, 15], ["singing-intervals", "interval-singer:intermediate", 3, 13], ["singing-intervals", "interval-singer:intermediate", 3, 1],
      ["runs", "run-stages:five", 3, 6],
      ["intervals", "interval-ears:1", 5, 19], ["intervals", "interval-ears:2", 4, 12], ["intervals", "interval-ears:3", 2, 4], ["home-and-colour", null, 4, 27],
    ],
  },
  {
    id: "guitar-lead", label: "Example: guitar, advanced lead player",
    topics: { "guitar-scales": 3, "guitar-basic-chords": 3, "guitar-barre-chords": 3, "guitar-extended-chords": 1, "guitar-caged": 2, "guitar-techniques": 3, "theory-ear": 2, "theory-scales-keys": 2, "theory-modes": 1 },
    ratings: [
      ["notes-on-neck", "note-finder:intermediate", 5, 120], ["notes-on-neck", "note-finder:advanced", 4, 60], ["notes-on-neck", "note-finder:advanced", 5, 14],
      ["spider", "finger-pattern:advanced", 5, 130], ["legato", "legato-trill:intermediate", 5, 110], ["legato", "legato-trill:advanced", 4, 40], ["legato", "legato-trill:advanced", 5, 9],
      ["picking", "picking-drill:intermediate", 5, 100], ["picking", "picking-drill:advanced", 2, 35], ["picking", "picking-drill:advanced", 3, 18], ["picking", "picking-drill:advanced", 3, 3],
      ["pentatonic-positions", null, 5, 140], ["pentatonic-positions", null, 5, 30], ["major-on-neck", null, 4, 70], ["major-on-neck", null, 4, 12],
      ["arpeggios", null, 3, 25], ["arpeggios", null, 4, 6], ["bends-slides", null, 5, 90], ["bends-slides", null, 5, 20],
      ["caged", null, 4, 80], ["triads", null, 4, 85], ["guitar-melodies", null, 4, 45],
      ["open-chords", null, 5, 200], ["barre", null, 5, 160], ["power-chords", null, 5, 180], ["strumming", null, 4, 150],
      ["scales", null, 4, 95], ["modes", null, 3, 22], ["modes", null, 3, 5], ["intervals", "interval-ears:3", 4, 50],
    ],
  },
  {
    id: "guitar-chords", label: "Example: guitar, advanced chord player",
    topics: { "guitar-scales": 1, "guitar-basic-chords": 3, "guitar-barre-chords": 3, "guitar-extended-chords": 2, "guitar-caged": 2, "guitar-techniques": 1, "theory-ear": 2, "theory-scales-keys": 2, "theory-building-chords": 2, "theory-progressions": 2 },
    ratings: [
      ["open-chords", null, 5, 300], ["strumming", null, 5, 260], ["barre", null, 5, 210], ["power-chords", null, 5, 220],
      ["seventh-shapes", null, 5, 150], ["sus-add9", null, 4, 110], ["sus-add9", null, 5, 40], ["shells", null, 4, 70], ["shells", null, 3, 10],
      ["triads", null, 5, 120], ["caged", null, 4, 90], ["caged", null, 4, 15], ["arpeggios", null, 3, 20], ["arpeggios", null, 3, 4],
      ["notes-on-neck", "note-finder:beginner", 5, 140], ["notes-on-neck", "note-finder:intermediate", 3, 30],
      ["picking", "picking-drill:new", 4, 100], ["picking", "picking-drill:beginner", 3, 25], ["pentatonic-positions", null, 3, 60],
      ["chords-of-a-key", null, 5, 130], ["keys", null, 4, 100], ["sevenths-up", null, 4, 80], ["ii-v-i", null, 4, 45], ["ii-v-i", null, 3, 7],
      ["hearing-changes", null, 4, 50], ["dim-aug", null, 3, 12], ["styles", null, 4, 65],
    ],
  },
  {
    id: "voice-advanced", label: "Example: voice, advanced singer",
    topics: { "voice-pitch": 3, "voice-intervals": 3, "voice-melodies": 3, "voice-breath-range": 3, "voice-runs": 3, "voice-harmony": 2, "theory-ear": 2, "theory-scales-keys": 2 },
    ratings: [
      ["pitch", null, 5, 200], ["breath", "farinelli:intermediate", 5, 120], ["breath", "farinelli:advanced", 4, 30],
      ["steps-to-leaps", "melody-stages:arpeggio", 5, 150], ["steps-to-leaps", "melody-stages:fifths", 5, 90], ["steps-to-leaps", "melody-stages:sixths", 4, 60],
      ["steps-to-leaps", "melody-stages:sevenths", 4, 35], ["steps-to-leaps", "melody-stages:octave", 3, 14], ["steps-to-leaps", "melody-stages:octave", 4, 2],
      ["singing-intervals", "interval-singer:intermediate", 5, 100], ["singing-intervals", "interval-singer:advanced", 4, 25],
      ["tunes", "melody-difficulty:Hard", 5, 80], ["tunes", "melody-difficulty:Expert", 3, 16], ["tunes", "melody-difficulty:Expert", 3, 3],
      ["runs", "run-stages:pentatonic-run", 5, 70], ["runs", "run-stages:nine", 4, 28], ["runs", "run-stages:octave-run", 2, 6],
      ["range", null, 4, 110], ["range", null, 4, 20], ["sight-singing", null, 4, 75], ["sight-singing", null, 3, 9],
      ["harmony-line", null, 5, 95], ["singing-modes", null, 4, 40], ["improvise", null, 3, 18],
      ["intervals", "interval-ears:4", 4, 55], ["home-and-colour", null, 5, 130], ["keys", null, 4, 85],
    ],
  },
  {
    id: "theory-advanced", label: "Example: theory and ear, far along",
    topics: { "theory-basics": 3, "theory-ear": 3, "theory-scales-keys": 3, "theory-building-chords": 3, "theory-progressions": 3, "theory-modes": 2 },
    ratings: [
      ["beat", null, 5, 250], ["note-names", null, 5, 240], ["home-and-colour", null, 5, 220],
      ["intervals", "interval-ears:1", 5, 230], ["intervals", "interval-ears:2", 5, 200], ["intervals", "interval-ears:3", 5, 170], ["intervals", "interval-ears:4", 4, 110], ["intervals", "interval-ears:5", 3, 30], ["intervals", "interval-ears:5", 3, 4],
      ["scales", null, 5, 180], ["keys", null, 5, 150], ["chords-of-a-key", null, 5, 140], ["sus", null, 4, 120], ["sevenths-up", null, 4, 100],
      ["hearing-changes", null, 4, 90], ["hearing-changes", null, 3, 15], ["dim-aug", null, 4, 70], ["ii-v-i", null, 4, 60], ["ii-v-i", null, 5, 20],
      ["modes", null, 4, 50], ["modes", null, 4, 8], ["minor-colours", null, 3, 26], ["minor-colours", null, 3, 2], ["styles", null, 4, 45],
    ],
  },
  {
    id: "guitar-returning", label: "Example: guitar, advanced but back after a break",
    topics: { "guitar-scales": 3, "guitar-basic-chords": 3, "guitar-barre-chords": 3, "guitar-caged": 3, "guitar-techniques": 3 },
    ratings: [
      ["notes-on-neck", "note-finder:advanced", 5, 400], ["spider", "finger-pattern:advanced", 5, 420], ["legato", "legato-trill:advanced", 4, 380],
      ["picking", "picking-drill:advanced", 4, 390], ["pentatonic-positions", null, 5, 410], ["caged", null, 5, 370], ["triads", null, 4, 375],
      ["barre", null, 5, 450], ["open-chords", null, 5, 460], ["major-on-neck", null, 4, 360],
      ["spider", "finger-pattern:intermediate", 3, 6], ["picking", "picking-drill:intermediate", 3, 4], ["barre", null, 4, 2], ["pentatonic-positions", null, 3, 1],
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

/** The steps a student has solid, as path refs ("trackId:n"), from their progress. */
export const solidRefs = (progress: Record<string, ConceptProgress>): string[] =>
  Object.entries(progress).flatMap(([id, p]) => p.steps.flatMap((st, i) => (st.state === "solid" ? [`${id}:${i + 1}`] : [])));

/** Each step marked known, within reach or ahead for a student (plan/model/reach.ts): their answers and their solid steps. */
export const studentReach = (topics: Record<string, Rung>, progress: Record<string, ConceptProgress>): Map<string, StepReach> =>
  reach({ topics, solid: solidRefs(progress) });

/** An entry's day, null when its `at` is not a time. */
const entryDay = (e: ProgressEntry): string | null => (typeof e.at === "string" && !Number.isNaN(Date.parse(e.at)) ? dayOf(e.at) : null);
const entryMs = (e: ProgressEntry): number => { const t = Date.parse(e.at ?? ""); return Number.isNaN(t) ? -Infinity : t; };

/**
 * The player in this browser, read by the rule the composer uses (NEW7): a rating counts for the steps its exercise
 * names (`steps`) and every step before them on that track (`reachIndex`), and a step is solid exactly when
 * `solidRatedAt` has it (its newest counting rating is 4 or 5 stars), so a newer low rating on an easier step is never
 * covered by a harder solid one. A rating that names no step of the concept's track counts in `noStep` only.
 */
export function entryProgress(entries: ProgressEntry[], steps: Record<string, ConceptSteps> = conceptSteps()): Record<string, ConceptProgress> {
  const solid = solidRatedAt(entries);
  const out: Record<string, ConceptProgress> = {};
  for (const { id } of CONCEPTS) {
    const list = steps[id]?.steps ?? [];
    const per: ProgressEntry[][] = list.map(() => []);
    const counted: ProgressEntry[] = [];
    let noStep = 0;
    for (const e of entries) {
      const named = (e.steps ?? []).filter((r) => stepAt(r)?.track.id === id);
      if (!named.length) {
        if (conceptIds(e.concepts ?? []).includes(id)) noStep++;
        continue;
      }
      counted.push(e);
      const upTo = reachIndex(id, { steps: named, entry: e });
      for (let i = 0; i <= upTo && i < per.length; i++) per[i].push(e);
    }
    const newestOf = (xs: ProgressEntry[]) => xs.reduce<ProgressEntry | null>((b, e) => (!b || entryMs(e) >= entryMs(b) ? e : b), null);
    const stepList: StepProgress[] = per.map((on, i) => {
      const top = newestOf(on);
      const days = on.map(entryDay).filter((d): d is string => !!d).sort();
      return {
        state: solid.has(`${id}:${i + 1}`) ? "solid" : on.length ? "working" : "none",
        ratings: on.length, stars: top?.stars ?? null, firstOn: days[0] ?? null, lastOn: top ? entryDay(top) : null,
      };
    });
    const last = newestOf(counted);
    const at = stepList.findLastIndex((st) => st.ratings > 0);
    out[id] = {
      state: !last ? "not-yet" : last.stars >= SOLID_STARS ? "solid" : "working",
      ratings: counted.length, lastOn: last ? entryDay(last) : null, steps: stepList, at: at < 0 ? null : at, noStep,
    };
  }
  return out;
}

/** The reach marks the composer works from for a player: their answers' topics and `solidRatedAt(entries)`. */
export const playerReach = (topics: Record<string, Rung>, entries: ProgressEntry[]): Map<string, StepReach> =>
  reach({ topics, solid: solidRatedAt(entries).keys() });
