import { SEED_BLOCKS, seedExercises } from "@/features/library/seed";
import type { Area } from "@/features/plan/model/concepts";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { explainDay, versionFor, type Candidate, type ComposeTrace, type ComposedDay } from "@/features/plan/model/compose";
import { parseExercise } from "@/features/plan/model/config";
import { solidRatedAt } from "@/features/plan/model/daySteps";
import { addDays } from "@/features/plan/model/schedule";
import { raisedAnswers } from "@/features/plan/model/topicLevels";
import type { Given } from "@/features/plan/model/moves";
import type { RollTrace } from "@/features/plan/model/roll";
import type { PlanAnswers, PlanExercise } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";
import type { Stars } from "@/features/progress/stars";

/*
 * /admin/dev/compose: the plan composer (plan/model/compose.ts) run for a made-up player over the seed blocks in the code,
 * day after day, with every decision it made (`ComposeTrace`). The composer is the real one; only the library (the
 * seed files, not the database) and the ratings (one rule for every exercise) are stood in. Pure.
 */

/** Every choice of the seed blocks as the composer's candidates, for these areas: never used and never rated. The block id is the file's id, the choice id `<file id>/<choice name>`. */
export function seedCandidates(areas: Area[], entries: CatalogueEntry[] = catalogue()): Candidate[] {
  return SEED_BLOCKS.flatMap((f) => seedExercises(f).flatMap((e): Candidate[] => {
    const { block } = parseExercise(e, f.id, entries);
    if (!block || !block.area || !areas.includes(block.area as Area)) return [];
    const steps = block.steps ?? [];
    const choiceId = String(e.choiceId);
    return [{ blockId: f.id, choiceId, steps, minutes: block.minutes, use: { times: 0, seconds: 0 }, mine: null, exercise: { ...block, blockId: f.id, choiceId } }];
  }));
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
  /** the ratings made before the day: what its versions were rolled from */
  history: ProgressEntry[];
}

/**
 * What the next roll of an exercise would give if the player rated the version it has now with `stars`: the composer's
 * own roll (`versionFor`) over the day's history plus that one rating. Null for an exercise with no moves.
 */
export function nextVersion(e: PlanExercise, d: Pick<LabDay, "answers" | "history" | "date">, player: string, stars: Stars): { given: Given; roll?: RollTrace } | null {
  if (!e.moves || !e.choiceId) return null;
  const row: ProgressEntry = { id: `if-${stars}`, planId: "lab", exerciseId: `if-${e.choiceId}`, day: 0, exercise: 0, title: e.title, steps: e.steps, ...(e.blockId ? { blockId: e.blockId } : {}), choiceId: e.choiceId, ...(e.given ? { given: e.given } : {}), stars, at: `${d.date}T23:59:59.000Z` };
  return versionFor(e, { answers: d.answers, history: [...d.history, row], player, seed: player });
}

/**
 * `days` days in a row, as `composeToday` makes them: each day gets the day before as `yesterday`, the ratings made so
 * far as solid steps and as each choice's own rating, and the topics raised by them. `seed` stands for the player.
 */
export function simulate(opts: { answers: PlanAnswers; date: string; days: number; seed: string; rating: LabRating }, blocks: Candidate[] = seedCandidates(opts.answers.areas)): LabDay[] {
  const out: LabDay[] = [];
  const entries: ProgressEntry[] = [];
  const mine = new Map<string, { stars: Stars; ratedAt: string }>();
  for (let i = 0; i < opts.days; i++) {
    const date = addDays(opts.date, i);
    const solid = solidRatedAt(entries);
    const answers = raisedAnswers(opts.answers, entries, date);
    const yesterday = i ? out[i - 1].day.exercises.flatMap((e) => (e.choiceId ? [e.choiceId] : [])) : [];
    const rated = blocks.map((b) => ({ ...b, mine: mine.get(b.choiceId) ?? null }));
    const { day, trace } = explainDay({ answers, solid, blocks: rated, date, yesterday, keep: [], declined: [], seed: `${opts.seed}:${date}:0`, history: [...entries], player: opts.seed });
    const history = [...entries];
    out.push({ date, day, trace, answers, solid: solid.size, history });
    if (opts.rating === "none") continue;
    const stars = STARS[opts.rating];
    const at = `${date}T18:00:00.000Z`;
    day.exercises.forEach((e, j) => {
      entries.push({ id: `${date}:${j}`, planId: date, exerciseId: `${date}:${j}`, day: 0, exercise: j, title: e.title, area: e.area, level: e.level, topic: e.topic, concepts: e.concepts, steps: e.steps, blockId: e.blockId, choiceId: e.choiceId, ...(e.given ? { given: e.given } : {}), stars, at });
      if (e.choiceId) mine.set(e.choiceId, { stars, ratedAt: at });
    });
  }
  return out;
}
