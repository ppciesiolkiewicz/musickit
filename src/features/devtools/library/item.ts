import { SEED_BLOCKS, SEED_PLANS, seedExercises, seedPlan, type SeedBlockFile } from "@/features/library/seed";
import { exerciseOf } from "@/features/library/seed/choices";
import type { BlockChoice, BlockDetail, BlockSummary } from "@/features/library/server/types";
import { blockIdOf, blockKeyOf, blockOfChoice, choiceIdOf } from "@/features/plan/model/blockId";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import type { Moves } from "@/features/plan/model/moves";
import { levelOfSteps } from "@/features/plan/model/path";
import { SHOWCASE_FEATURE } from "@/features/plan/model/prompt";
import { DEMO_PLANS } from "@/features/plan/demos";

/** The versions an item was written to; null where it was not recorded. */
export interface ItemVersions {
  prompt: number | null;
  agents: number | null;
  teaching: number | null;
}

/** One plan or block as /admin/content/library draws it: plain data, so the server can hand it to the client view. */
export interface DrawnItem {
  /** the id in the address: a plan id, a block id or a choice id */
  id: string;
  kind: "plan" | "block";
  /** the seed file's id when it comes from one: the key its section comments are kept under */
  seedId?: string;
  versions: ItemVersions;
  model: string | null;
  note?: string;
  showcase?: SeedBlockFile["showcase"];
  /** what the showcase shows, in the prompt's words */
  feature?: string;
  /** a plan's minutes a day */
  minutes?: number;
  /** a block's choices in order, inactive ones too (a seed `draft` is inactive); [] for a hashed block */
  choices?: BlockChoice[];
  /** the choice drawn: the one the address names, else the first */
  choiceId?: string;
  /** what the preview parses: the plan as the AI returns it, or one exercise (a block's: the drawn choice's) */
  json: string;
}

let seedBlockIds: Map<string, SeedBlockFile> | null = null;

/** Each seed block by the block id the library stores each of its choices under (`blockIdOf(blockKeyOf(parseExercise(...).block))`). */
export function seedBlocksById(): Map<string, SeedBlockFile> {
  if (!seedBlockIds) {
    const entries = catalogue();
    seedBlockIds = new Map();
    for (const f of SEED_BLOCKS) {
      for (const e of seedExercises(f)) {
        const block = parseExercise(e, f.id, entries).block;
        if (block) seedBlockIds.set(blockIdOf(blockKeyOf(block)), f);
      }
    }
  }
  return seedBlockIds;
}

/** A seed file's choices as the library lists them: level the choice's, else its steps' highest; a `draft` inactive. */
const seedChoices = (f: SeedBlockFile): BlockChoice[] =>
  f.choices.map((c) => ({ id: choiceIdOf(f.id, c.name), name: c.name, level: c.level ?? levelOfSteps(c.steps) ?? null, steps: c.steps, moves: (c.moves as Moves | undefined) ?? null, minutes: c.minutes, active: !c.draft }));

/** A seed block file drawn under `id`: the choice that `id` names (a choice id), else the first; null when `id` names a choice the file lacks. */
export function blockFileItem(f: SeedBlockFile, id: string): DrawnItem | null {
  const named = blockOfChoice(id) === f.id ? f.choices.find((c) => choiceIdOf(f.id, c.name) === id) : f.choices[0];
  if (!named) return null;
  return {
    id, kind: "block", seedId: f.id, versions: f.versions, model: f.model, note: f.note, showcase: f.showcase, feature: f.showcase && SHOWCASE_FEATURE[f.showcase],
    choices: seedChoices(f), choiceId: choiceIdOf(f.id, named.name), json: JSON.stringify(exerciseOf(f, named)),
  };
}

/** A plan row's or block row's item from the seed files (by plan id, block id, choice id or an old hashed block id), or null when no seed file matches. */
export function seedItem(id: string): DrawnItem | null {
  const plan = SEED_PLANS.find((f) => f.id === id);
  if (plan) {
    return { id, kind: "plan", seedId: plan.id, versions: plan.versions, model: plan.model, note: plan.note, minutes: plan.answers.minutes, json: JSON.stringify(seedPlan(plan)) };
  }
  const blockId = blockOfChoice(id) ?? id;
  // a curated block's id and its choices' ids are the seed file's id; an older row names the hash of its content
  const block = SEED_BLOCKS.find((f) => f.id === blockId) ?? seedBlocksById().get(id);
  return block ? blockFileItem(block, id) : null;
}

/**
 * A block with no seed file, drawn from what the database holds: its content with its tags as exercise fields. A curated
 * block draws the choice `choiceId` names (else its first listed one), with that choice's level, steps, moves and minutes.
 */
export function databaseItem(b: BlockDetail, choiceId?: string): DrawnItem {
  const { provenance: p } = b;
  const choice = b.choices.find((c) => c.id === choiceId) ?? b.choices[0];
  const level = choice ? choice.level : b.level;
  const steps = choice ? choice.steps : b.steps;
  const exercise = {
    ...b.content,
    ...(b.area ? { area: b.area } : {}),
    ...(b.topic ? { topic: b.topic } : {}),
    ...(level ? { level } : {}),
    ...(b.concepts.length ? { concepts: b.concepts } : {}),
    ...(steps.length ? { steps } : {}),
    ...(b.tags.length ? { tags: b.tags } : {}),
    ...(choice?.moves ? { moves: choice.moves } : {}),
    ...(choice ? { minutes: choice.minutes, blockId: b.id, choiceId: choice.id } : {}),
  };
  return {
    id: choiceId ?? b.id, kind: "block", versions: { prompt: p.promptVersion, agents: p.docsAgents, teaching: p.docsTeaching }, model: p.model,
    choices: b.choices, ...(choice ? { choiceId: choice.id } : {}), json: JSON.stringify(exercise),
  };
}

/**
 * How a row is labelled: where it comes from (exactly one of `seed`, `database`), whether players are offered it (`off`),
 * and, for a plan, whether `/demo` shows it (`demo`).
 */
export type LibraryTag = "seed" | "database" | "off" | "demo" | "riff";

/** The `/demo/<slug>` slug that shows a seed plan (`DEMO_PLANS`), or null when no demo uses it. */
export function demoSlugOf(planId: string): string | null {
  return Object.entries(DEMO_PLANS).find(([, d]) => d.plan === planId)?.[0] ?? null;
}

/**
 * A block's tags. A curated block with choices and no active one is `off`. A hashed block is `database` and never `off`:
 * it is not a seed item, and whether a player sees it is a matter of who owns it. A block in `riffEdited` (its riff saved
 * in the app and not yet pulled into its file) is `riff`.
 */
export function blockTags(b: BlockSummary, seedIds: { has(id: string): boolean }, riffEdited: { has(id: string): boolean } = new Set()): LibraryTag[] {
  const tags: LibraryTag[] = [seedIds.has(b.id) ? "seed" : "database"];
  if (b.choices.length > 0 && !b.choices.some((c) => c.active)) tags.push("off");
  if (riffEdited.has(b.id)) tags.push("riff");
  return tags;
}
