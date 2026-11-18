import { blockIdOf, blockKeyOf, isBlockId, type BlockKey } from "./blockId";
import type { PlanExercise, StoredPlan } from "./types";

/** A block of a plan as the library stores it: its id and key, the block it was edited from, and how the player got it. */
export interface LibraryBlock {
  id: string;
  key: BlockKey;
  parentId?: string;
  /** `edit` when the player edited it from another block (`parentBlockId`), else `ai` (written by the AI, claimed or pasted). */
  source: "ai" | "edit";
}

/** Every exercise of the plans, skipping a day without an exercise list. */
export function* exercisesOf(plans: StoredPlan[]): Generator<PlanExercise> {
  for (const p of plans) for (const d of p?.config?.days ?? []) if (Array.isArray(d?.exercises)) yield* d.exercises;
}

/**
 * The plans' blocks, one per distinct block id, the first seen kept (pass the current plan first). The ids are worked out
 * here from content and tags, never taken from the exercise; a parent that is not a block id, or is the block's own, is dropped.
 */
export function libraryBlocksOf(plans: StoredPlan[]): LibraryBlock[] {
  const out = new Map<string, LibraryBlock>();
  for (const e of exercisesOf(plans)) {
    const key = blockKeyOf(e);
    const id = blockIdOf(key);
    if (out.has(id)) continue;
    const parentId = isBlockId(e.parentBlockId) && e.parentBlockId !== id ? e.parentBlockId : undefined;
    out.set(id, parentId ? { id, key, parentId, source: "edit" } : { id, key, source: "ai" });
  }
  return [...out.values()];
}

/**
 * Exercise (slot) id -> block id, for every exercise with an id in the plans, the first seen kept. The record has no
 * prototype, so a slot id like "constructor" or "__proto__" is an ordinary key and a missing one reads undefined.
 */
export function slotBlocks(plans: StoredPlan[]): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  for (const e of exercisesOf(plans)) if (typeof e.id === "string" && e.id && !Object.hasOwn(out, e.id)) out[e.id] = blockIdOf(blockKeyOf(e));
  return out;
}
