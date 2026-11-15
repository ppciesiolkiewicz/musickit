import { EXERCISE_EXAMPLES, PLAN_EXAMPLES, type ExampleMeta } from "@/features/plan/examples";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise, parsePlanConfig } from "@/features/plan/model/config";
import { blockIdOf, blockKeyOf } from "@/features/plan/model/blockId";
import { libraryBlocksOf } from "@/features/plan/model/libraryBlocks";
import { sanitiseState } from "@/features/plan/model/state";
import type { PlanConfig, StoredPlan } from "@/features/plan/model/types";
import type { NewBlock, PlanBlockRow, Provenance, UserDataRepo } from "./repo";

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

function toNew(config: PlanConfig, source: "seed" | "example", enabledForReuse: boolean, provenance: Provenance): NewBlock[] {
  return libraryBlocksOf(storedPlanOf(config)).map((b) => ({ id: b.id, key: b.key, parentId: null, source, enabledForReuse, provenance: { ...provenance } }));
}

/** An example's provenance: its model, and the document versions it was written to; the prompt's version is not recorded. */
const exampleProvenance = (e: ExampleMeta): Provenance => ({ model: e.model ?? null, promptVersion: null, docsAgents: e.docs.agents, docsTeaching: e.docs.teaching });

/** Every exercise example and every plan example's exercises, as library blocks the app owns and does not offer for reuse. */
export function exampleBlocks(): NewBlock[] {
  const entries = catalogue();
  const out: NewBlock[] = [];
  for (const e of EXERCISE_EXAMPLES) {
    const { block } = parseExercise(e.exercise, e.id, entries);
    if (block) out.push(...toNew({ title: e.id, days: [{ theme: e.id, exercises: [block] }] }, "example", false, exampleProvenance(e)));
  }
  for (const p of PLAN_EXAMPLES) {
    const r = parsePlanConfig(JSON.stringify(p.plan), entries);
    if (r.ok) out.push(...toNew(r.config, "example", false, exampleProvenance(p)));
  }
  return dedupe(out);
}

/** The blocks of the `practice_plans` replies, owned by the app and enabled for reuse, each with its plan's provenance (a block in two plans keeps the first's). A reply that doesn't parse is left out; see `unparsedReplies`. */
export function libraryPlanBlocks(plans: SeedPlan[]): NewBlock[] {
  const entries = catalogue();
  const out: NewBlock[] = [];
  for (const p of plans) {
    const r = parsePlanConfig(p.reply, entries);
    if (r.ok) out.push(...toNew(r.config, "seed", true, p.provenance));
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

/** Puts the library plans' blocks, then the examples', in the library as the app's, then each plan's blocks in `practice_plan_blocks`. Insert-only, so a second run adds no block and a block in both stays `seed`, enabled; the plan rows are replaced with the same ones. */
export async function seedBlocks(repo: UserDataRepo, plans: SeedPlan[], now: Date): Promise<{ library: number; examples: number; planBlocks: number }> {
  const library = libraryPlanBlocks(plans);
  const examples = exampleBlocks();
  await repo.addBlocks(null, library, now);
  await repo.addBlocks(null, examples, now);
  let planBlocks = 0;
  for (const p of plans) {
    const rows = planBlockRows(p.reply);
    if (!rows.length) continue;
    await repo.setPlanBlocks(p.id, rows);
    planBlocks += rows.length;
  }
  return { library: library.length, examples: examples.length, planBlocks };
}
