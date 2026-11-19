import { SEED_BLOCKS, SEED_PLANS, seedExercise, seedExercises, seedPlan, type SeedBlockFile } from "@/features/library/seed";
import type { BlockDetail } from "@/features/library/server/types";
import { blockIdOf, blockKeyOf } from "@/features/plan/model/blockId";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import { SHOWCASE_FEATURE } from "@/features/plan/model/prompt";

/** The versions an item was written to; null where it was not recorded. */
export interface ItemVersions {
  prompt: number | null;
  agents: number | null;
  teaching: number | null;
}

/** One plan or block as /dev/library draws it: plain data, so the server can hand it to the client view. */
export interface DrawnItem {
  /** the id in the address: a plan id or a block id */
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
  /** what the preview parses: the plan as the AI returns it, or one exercise */
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

/** A plan row's or block row's item from the seed files (by plan id, block id or block file id), or null when no seed file matches. */
export function seedItem(id: string): DrawnItem | null {
  const plan = SEED_PLANS.find((f) => f.id === id);
  if (plan) {
    return { id, kind: "plan", seedId: plan.id, versions: plan.versions, model: plan.model, note: plan.note, minutes: plan.answers.minutes, json: JSON.stringify(seedPlan(plan)) };
  }
  // a block row names the block id; a section note's link names the seed file's id
  const block = seedBlocksById().get(id) ?? SEED_BLOCKS.find((f) => f.id === id);
  if (block) {
    return { id, kind: "block", seedId: block.id, versions: block.versions, model: block.model, note: block.note, showcase: block.showcase, feature: block.showcase && SHOWCASE_FEATURE[block.showcase], json: JSON.stringify(seedExercise(block)) };
  }
  return null;
}

/** A block with no seed file, drawn from what the database holds: its content with its tags as exercise fields. */
export function databaseItem(b: BlockDetail): DrawnItem {
  const { provenance: p } = b;
  const exercise = {
    ...b.content,
    ...(b.area ? { area: b.area } : {}),
    ...(b.topic ? { topic: b.topic } : {}),
    ...(b.level ? { level: b.level } : {}),
    ...(b.concepts.length ? { concepts: b.concepts } : {}),
    ...(b.steps.length ? { steps: b.steps } : {}),
    ...(b.tags.length ? { tags: b.tags } : {}),
  };
  return { id: b.id, kind: "block", versions: { prompt: p.promptVersion, agents: p.docsAgents, teaching: p.docsTeaching }, model: p.model, json: JSON.stringify(exercise) };
}
