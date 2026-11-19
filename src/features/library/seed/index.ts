import type { PlanAnswers, Level } from "@/features/plan/model/types";
import { FILES as BLOCK_FILES } from "./blocks/index.gen";
import { FILES as PLAN_FILES } from "./plans/index.gen";

/*
 * The library seed written by agents (NEW10 in tasks.txt): plans and single exercises written to the library's gaps,
 * one JSON file each (README.md), so an agent writing or reading one never loads the rest. `npm run db:seed-plans` and
 * `db:seed-blocks` put them in the database.
 */

/** The prompt's and the writing rules' versions a seed file was written to (`PROMPT_VERSION`, `DOC_VERSIONS`). */
export interface SeedVersions {
  prompt: number | null;
  agents: number;
  teaching: number;
}

/** `plans/<id>.json`: a 7-day plan for the player its answers describe. */
export interface SeedPlanFile {
  id: string;
  /** the player the plan is for, as the questionnaire would record them */
  answers: PlanAnswers;
  /** the API id of the model that wrote it */
  model: string;
  versions: SeedVersions;
  /** the gap it was written for, in one line */
  note: string;
  /** the plan as the AI returns it ({ title, summary, progress, days }), but each day's `exercises` is a `SeedBlockRef[]` (`expandPlan` fills them in) */
  plan: Record<string, unknown>;
}

/** One way to do a block: what sits on a step or level, at its own tempo and length. Its id is `<block id>/<name>`. */
export interface SeedChoice {
  /** lowercase words joined by hyphens; unique in its file, and with the block's id it makes the choice's id */
  name: string;
  level?: Level;
  /** the path steps this choice practises (`["barre:2"]`) */
  steps: string[];
  moves?: unknown;
  minutes: number;
  draft?: boolean;
}

/** A plan day's exercise: a block of the seed and one of its choices, with the minutes it gets in this day. */
export interface SeedBlockRef {
  block: string;
  choice: string;
  minutes?: number;
}

/** `blocks/<id>.json`: one exercise, written for a step no block in the library practises. */
export interface SeedBlockFile {
  id: string;
  model: string;
  versions: SeedVersions;
  note: string;
  /** set on the exercises that show one rule: blocks with a chart per step, a melody by `pick`, a progression worked several ways */
  showcase?: "blocks" | "pick" | "progression" | "stages" | "variants";
  /** the exercise as the AI returns it in a plan's day, without `level`, `steps`, `moves` and `minutes`: they sit in each choice */
  exercise: Record<string, unknown>;
  /** one or more ways to do it; `exerciseOf` makes the exercise of one */
  choices: SeedChoice[];
}

const sorted = <T>(files: Record<string, unknown>): T[] => Object.keys(files).sort().map((k) => files[k] as T);

export const SEED_PLANS: SeedPlanFile[] = sorted<SeedPlanFile>(PLAN_FILES);
export const SEED_BLOCKS: SeedBlockFile[] = sorted<SeedBlockFile>(BLOCK_FILES);
