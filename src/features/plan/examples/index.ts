/**
 * The example library: hand-tuned exercises and 7-day plans, standalone JSON (README.md) that the prompt shows the AI
 * and that other apps can import. The only TypeScript here: it loads the files.
 */
import type { Area } from "../model/concepts";
import type { Level } from "../model/types";

import guitarNewEmAmChanges from "./exercises/guitar-new-em-am-changes.json";
import guitarBeginnerPentatonicBox1 from "./exercises/guitar-beginner-pentatonic-box1.json";
import guitarIntermediateJoiningBoxes from "./exercises/guitar-intermediate-joining-boxes.json";
import guitarAdvancedDorianOnTheNeck from "./exercises/guitar-advanced-dorian-on-the-neck.json";
import voiceNewMatchingAPitch from "./exercises/voice-new-matching-a-pitch.json";
import voiceBeginnerDoMiSol from "./exercises/voice-beginner-do-mi-sol.json";
import voiceIntermediateLeaps from "./exercises/voice-intermediate-leaps.json";
import voiceAdvancedGuideTones from "./exercises/voice-advanced-guide-tones.json";
import theoryNewMajorOrMinor from "./exercises/theory-new-major-or-minor.json";
import theoryBeginnerOneFourFive from "./exercises/theory-beginner-one-four-five.json";
import theoryIntermediateSeventhChords from "./exercises/theory-intermediate-seventh-chords.json";
import theoryAdvancedModesByEar from "./exercises/theory-advanced-modes-by-ear.json";
import showcaseBlocksDoMiSol from "./exercises/showcase-blocks-do-mi-sol.json";
import showcasePickStepTunes from "./exercises/showcase-pick-step-tunes.json";
import showcaseProgressionFourWays from "./exercises/showcase-progression-four-ways.json";
import guitarBeginnerPlan from "./plans/guitar-beginner.json";
import guitarIntermediatePlan from "./plans/guitar-intermediate.json";
import voiceBeginnerPlan from "./plans/voice-beginner.json";
import guitarTheoryIntermediatePlan from "./plans/guitar-theory-intermediate.json";

export interface ExampleMeta {
  id: string;
  /** the areas it practises; an exercise has one */
  areas: Area[];
  level: Level;
  /** concept ids (model/concepts.ts) it works on */
  concepts: string[];
  /** why it is a good example, in one or two sentences */
  note: string;
}

export interface ExerciseExample extends ExampleMeta {
  kind: "exercise";
  /** set on the three that show one rule: blocks with a chart per step, a melody by `pick`, a progression worked several ways */
  showcase?: "blocks" | "pick" | "progression";
  /** one exercise exactly as the AI returns it */
  exercise: unknown;
}

export interface PlanExample extends ExampleMeta {
  kind: "plan";
  /** minutes a day the plan is written for */
  minutes: number;
  /** the whole plan exactly as the AI returns it: { title, summary, days } */
  plan: unknown;
}

export const EXERCISE_EXAMPLES: ExerciseExample[] = [
  guitarNewEmAmChanges,
  guitarBeginnerPentatonicBox1,
  guitarIntermediateJoiningBoxes,
  guitarAdvancedDorianOnTheNeck,
  voiceNewMatchingAPitch,
  voiceBeginnerDoMiSol,
  voiceIntermediateLeaps,
  voiceAdvancedGuideTones,
  theoryNewMajorOrMinor,
  theoryBeginnerOneFourFive,
  theoryIntermediateSeventhChords,
  theoryAdvancedModesByEar,
  showcaseBlocksDoMiSol,
  showcasePickStepTunes,
  showcaseProgressionFourWays,
] as ExerciseExample[];

export const PLAN_EXAMPLES: PlanExample[] = [
  guitarBeginnerPlan,
  guitarIntermediatePlan,
  voiceBeginnerPlan,
  guitarTheoryIntermediatePlan,
] as PlanExample[];
