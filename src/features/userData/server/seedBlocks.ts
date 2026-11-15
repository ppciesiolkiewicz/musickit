import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise, parsePlanConfig } from "@/features/plan/model/config";
import { libraryBlocksOf } from "@/features/plan/model/libraryBlocks";
import { sanitiseState } from "@/features/plan/model/state";
import type { PlanConfig, StoredPlan } from "@/features/plan/model/types";
import type { NewBlock, UserDataRepo } from "./repo";

/** The config as a player's stored plan would hold it, so a block id is the one that plan's exercise gets. */
function storedPlanOf(config: PlanConfig): StoredPlan[] {
  const cur = sanitiseState({ current: { id: "seed", startedOn: "2026-01-01", done: {}, config } }).current;
  return cur ? [cur] : [];
}

function toNew(config: PlanConfig, source: "seed" | "example", enabledForReuse: boolean): NewBlock[] {
  return libraryBlocksOf(storedPlanOf(config)).map((b) => ({ id: b.id, key: b.key, parentId: null, source, enabledForReuse }));
}

/** Every exercise example and every plan example's exercises, as library blocks the app owns and does not offer for reuse. */
export function exampleBlocks(): NewBlock[] {
  const entries = catalogue();
  const configs: PlanConfig[] = [];
  for (const e of EXERCISE_EXAMPLES) {
    const { block } = parseExercise(e.exercise, e.id, entries);
    if (block) configs.push({ title: e.id, days: [{ theme: e.id, exercises: [block] }] });
  }
  for (const p of PLAN_EXAMPLES) {
    const r = parsePlanConfig(JSON.stringify(p.plan), entries);
    if (r.ok) configs.push(r.config);
  }
  return dedupe(configs.flatMap((c) => toNew(c, "example", false)));
}

/** The blocks of the `practice_plans` replies, owned by the app and enabled for reuse. A reply that doesn't parse is left out; see `unparsedReplies`. */
export function libraryPlanBlocks(replies: string[]): NewBlock[] {
  const entries = catalogue();
  const out: NewBlock[] = [];
  for (const reply of replies) {
    const r = parsePlanConfig(reply, entries);
    if (r.ok) out.push(...toNew(r.config, "seed", true));
  }
  return dedupe(out);
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

/** Puts the library plans' blocks, then the examples', in the library as the app's. Insert-only, so a second run adds nothing and a block in both stays `seed`, enabled. */
export async function seedBlocks(repo: UserDataRepo, replies: string[], now: Date): Promise<{ library: number; examples: number }> {
  const library = libraryPlanBlocks(replies);
  const examples = exampleBlocks();
  await repo.addBlocks(null, library, now);
  await repo.addBlocks(null, examples, now);
  return { library: library.length, examples: examples.length };
}
