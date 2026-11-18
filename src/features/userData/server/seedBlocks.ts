import { SEED_BLOCKS, type SeedBlockFile } from "@/features/library/seed";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise, parsePlanConfig } from "@/features/plan/model/config";
import { blockIdOf, blockKeyOf } from "@/features/plan/model/blockId";
import { libraryBlocksOf } from "@/features/plan/model/libraryBlocks";
import { sanitiseState } from "@/features/plan/model/state";
import type { PlanConfig, StoredPlan } from "@/features/plan/model/types";
import { exercisesOf } from "@/features/plan/model/libraryBlocks";
import type { BlockSlot, NewBlock, PlanBlockRow, Provenance, UserDataRepo } from "./repo";

/** A `practice_plans` row as the seed needs it: its id, its reply and how it was written. */
export interface SeedPlan {
  id: string;
  reply: string;
  provenance: Provenance;
}

/** The config as a player's stored plan would hold it, so a block id is the one that plan's exercise gets. */
function storedPlanOf(config: PlanConfig): StoredPlan[] {
  const cur = sanitiseState({ current: { id: "seed", startedOn: "2026-01-01", done: {}, config } }).current;
  return cur ? [cur] : [];
}

/** The config's blocks as library blocks the app owns, `seed`, enabled for reuse. */
function toNew(config: PlanConfig, provenance: Provenance): NewBlock[] {
  const stored = storedPlanOf(config);
  // the slot is the first exercise's with that block id
  const slots = new Map<string, BlockSlot>();
  for (const e of exercisesOf(stored)) {
    const id = blockIdOf(blockKeyOf(e));
    if (!slots.has(id)) slots.set(id, { minutes: e.minutes, ...(e.why ? { why: e.why } : {}), ...(e.learnBefore?.length ? { learnBefore: [...e.learnBefore] } : {}), ...(e.exploreMore?.length ? { exploreMore: [...e.exploreMore] } : {}) });
  }
  return libraryBlocksOf(stored).map((b) => ({ id: b.id, key: b.key, parentId: null, source: "seed" as const, enabledForReuse: true, provenance: { ...provenance }, slot: slots.get(b.id) }));
}

/** The blocks of the `practice_plans` replies, owned by the app and enabled for reuse, each with its plan's provenance (a block in two plans keeps the first's). A reply that doesn't parse is left out; see `unparsedReplies`. */
export function libraryPlanBlocks(plans: SeedPlan[]): NewBlock[] {
  const entries = catalogue();
  const out: NewBlock[] = [];
  for (const p of plans) {
    const r = parsePlanConfig(p.reply, entries);
    if (r.ok) out.push(...toNew(r.config, p.provenance));
  }
  return dedupe(out);
}

/** The single seed exercises (src/features/library/seed/blocks, the former exercise examples among them) as library blocks the app owns, enabled for reuse, each with its file's model and versions. One that doesn't parse is left out. */
export function seedFileBlocks(files: SeedBlockFile[] = SEED_BLOCKS): NewBlock[] {
  const entries = catalogue();
  const out: NewBlock[] = [];
  for (const f of files) {
    const { block } = parseExercise(f.exercise, f.id, entries);
    const provenance: Provenance = { model: f.model, promptVersion: f.versions.prompt, docsAgents: f.versions.agents, docsTeaching: f.versions.teaching };
    if (block) out.push(...toNew({ title: f.id, days: [{ theme: f.id, exercises: [block] }] }, provenance));
  }
  return dedupe(out);
}

/** One row per exercise slot of a reply, in order, with `day` and `place` from 0; the same block id may repeat. `[]` when the reply doesn't parse. */
export function planBlockRows(reply: string): PlanBlockRow[] {
  const r = parsePlanConfig(reply, catalogue());
  if (!r.ok) return [];
  return r.config.days.flatMap((d, day) => d.exercises.map((e, place) => ({ day, place, blockId: blockIdOf(blockKeyOf(e)), minutes: e.minutes })));
}

/** The positions of the replies that don't parse, for the script to name. */
export function unparsedReplies(replies: string[]): number[] {
  const entries = catalogue();
  return replies.flatMap((r, i) => (parsePlanConfig(r, entries).ok ? [] : [i]));
}

function dedupe(list: NewBlock[]): NewBlock[] {
  const seen = new Map<string, NewBlock>();
  for (const b of list) if (!seen.has(b.id)) seen.set(b.id, b);
  return [...seen.values()];
}

/**
 * Puts the seed files' single blocks, then the library plans' blocks (plans in id order), in the library as the app's, then
 * each plan's blocks in `practice_plan_blocks`. The first writer of a block sets its provenance and its default slot
 * (minutes, why, lessons), so a seed file's slot wins over a plan's. Insert-only, so a second run adds no block; the plan rows are replaced with the same ones,
 * and a plan whose reply doesn't parse is left with none. A library block an earlier run stored as an example's (not
 * enabled) is promoted to `seed`, enabled; `promoted` counts those.
 */
export async function seedBlocks(repo: UserDataRepo, plans: SeedPlan[], now: Date, files: SeedBlockFile[] = SEED_BLOCKS): Promise<{ library: number; planBlocks: number; promoted: number }> {
  // the first writer of a block keeps its slot and provenance: block files first, then the plans in the order given (by id)
  const library = dedupe([...seedFileBlocks(files), ...libraryPlanBlocks(plans)]);
  await repo.addBlocks(null, library, now);
  const promoted = await repo.promoteExampleBlocks(library.map((b) => b.id));
  let planBlocks = 0;
  for (const p of plans) {
    // a reply that no longer parses clears the plan's rows, so none point at blocks it doesn't hold
    const rows = planBlockRows(p.reply);
    await repo.setPlanBlocks(p.id, rows);
    planBlocks += rows.length;
  }
  return { library: library.length, planBlocks, promoted };
}
