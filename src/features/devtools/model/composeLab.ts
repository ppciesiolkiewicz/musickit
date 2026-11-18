import { SEED_BLOCKS } from "@/features/library/seed";
import type { Area } from "@/features/plan/model/concepts";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { explainDay, type Candidate, type ComposeTrace, type ComposedDay } from "@/features/plan/model/compose";
import { parseExercise } from "@/features/plan/model/config";
import { solidRatedAt } from "@/features/plan/model/daySteps";
import { addDays } from "@/features/plan/model/schedule";
import { raisedAnswers } from "@/features/plan/model/topicLevels";
import type { PlanAnswers } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";
import type { Stars } from "@/features/progress/stars";

/*
 * /dev/compose: the plan composer (plan/model/compose.ts) run for a made-up player over the seed blocks in the code,
 * day after day, with every decision it made (`ComposeTrace`). The composer is the real one; only the library (the
 * seed files, not the database) and the ratings (one rule for every exercise) are stood in. Pure.
 */

/** The seed blocks as the composer's candidates, for these areas: never used and never rated. The block id is the file's id. */
export function seedCandidates(areas: Area[], entries: CatalogueEntry[] = catalogue()): Candidate[] {
  return SEED_BLOCKS.flatMap((f): Candidate[] => {
    const { block } = parseExercise(f.exercise, f.id, entries);
    if (!block || !block.area || !areas.includes(block.area as Area)) return [];
    const steps = block.steps ?? [];
    return [{ blockId: f.id, steps, minutes: block.minutes, use: { times: 0, seconds: 0 }, mine: null, exercise: { ...block, blockId: f.id } }];
  });
}

/** How the made-up player rates every exercise of a day: not at all, Solid (4 stars: the steps count as solid), or Hard (2 stars). */
export type LabRating = "none" | "solid" | "hard";
const STARS: Record<Exclude<LabRating, "none">, Stars> = { solid: 4, hard: 2 };

export interface LabDay {
  date: string;
  day: ComposedDay;
  trace: ComposeTrace;
  /** the answers the day was composed from: the player's, each topic raised to the level their ratings reach */
  answers: PlanAnswers;
  /** how many steps were solid before the day */
  solid: number;
}

/**
 * `days` days in a row, as `composeToday` makes them: each day gets the day before as `yesterday`, the ratings made so
 * far as solid steps and as each block's own rating, and the topics raised by them. `seed` stands for the player.
 */
export function simulate(opts: { answers: PlanAnswers; date: string; days: number; seed: string; rating: LabRating }, blocks: Candidate[] = seedCandidates(opts.answers.areas)): LabDay[] {
  const out: LabDay[] = [];
  const entries: ProgressEntry[] = [];
  const mine = new Map<string, { stars: Stars; ratedAt: string }>();
  for (let i = 0; i < opts.days; i++) {
    const date = addDays(opts.date, i);
    const solid = solidRatedAt(entries);
    const answers = raisedAnswers(opts.answers, entries, date);
    const yesterday = i ? out[i - 1].day.exercises.flatMap((e) => (e.blockId ? [e.blockId] : [])) : [];
    const rated = blocks.map((b) => ({ ...b, mine: mine.get(b.blockId) ?? null }));
    const { day, trace } = explainDay({ answers, solid, blocks: rated, date, yesterday, keep: [], declined: [], seed: `${opts.seed}:${date}:0`, history: [...entries], player: opts.seed });
    out.push({ date, day, trace, answers, solid: solid.size });
    if (opts.rating === "none") continue;
    const stars = STARS[opts.rating];
    const at = `${date}T18:00:00.000Z`;
    day.exercises.forEach((e, j) => {
      entries.push({ id: `${date}:${j}`, planId: date, exerciseId: `${date}:${j}`, day: 0, exercise: j, title: e.title, area: e.area, level: e.level, topic: e.topic, concepts: e.concepts, steps: e.steps, blockId: e.blockId, ...(e.given ? { given: e.given } : {}), stars, at });
      if (e.blockId) mine.set(e.blockId, { stars, ratedAt: at });
    });
  }
  return out;
}
