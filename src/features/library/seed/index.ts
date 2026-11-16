import type { PlanAnswers } from "@/features/plan/model/types";
import { FILES as BLOCK_FILES } from "./blocks/index.gen";
import { FILES as PLAN_FILES } from "./plans/index.gen";

/*
 * The library seed written by agents (NEW10 in tasks.txt): plans and single exercises written to the library's gaps,
 * one JSON file each (README.md), so an agent writing or reading one never loads the rest. `npm run db:seed-plans` and
 * `db:seed-blocks` put them in the database.
 */

/** The prompt's and the writing rules' versions a seed file was written to (`PROMPT_VERSION`, `DOC_VERSIONS`). */
export interface SeedVersions {
  prompt: number;
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
  /** the plan exactly as the AI returns it: { title, summary, progress, days } */
  plan: Record<string, unknown>;
}

/** `blocks/<id>.json`: one exercise, written for a step no block in the library practises. */
export interface SeedBlockFile {
  id: string;
  model: string;
  versions: SeedVersions;
  note: string;
  /** the exercise exactly as the AI returns it in a plan's day */
  exercise: Record<string, unknown>;
}

const sorted = <T>(files: Record<string, unknown>): T[] => Object.keys(files).sort().map((k) => files[k] as T);

export const SEED_PLANS: SeedPlanFile[] = sorted<SeedPlanFile>(PLAN_FILES);
export const SEED_BLOCKS: SeedBlockFile[] = sorted<SeedBlockFile>(BLOCK_FILES);
