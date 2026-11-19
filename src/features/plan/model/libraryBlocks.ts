import { blockIdOf, blockKeyOf, isAnyBlockId, isCuratedExercise, type BlockKey } from "./blockId";
import type { PlanExercise, StoredPlan } from "./types";

/** A block of a plan as the library stores it: its id and key, the block it was edited from, and how the player got it. */
export interface LibraryBlock {
  id: string;
  key: BlockKey;
  parentId?: string;
  /** `edit` when the player edited it from another block (`parentBlockId`), else `ai` (written by the AI, claimed or pasted). */
  source: "ai" | "edit";
  /** a curated block: its id is the seed file's, and it has no new content to write (only an owner row, when the block exists) */
  curated?: true;
}

/** Every exercise of the plans, skipping a day without an exercise list. */
export function* exercisesOf(plans: StoredPlan[]): Generator<PlanExercise> {
  for (const p of plans) for (const d of p?.config?.days ?? []) if (Array.isArray(d?.exercises)) yield* d.exercises;
}

/**
 * The plans' blocks, one per distinct block id, the first seen kept (pass the current plan first). The ids are worked out
 * here from content and tags, never taken from the exercise; a curated exercise is returned as `curated: true` with its curated id; a parent that is not a block id, or is the block's own, is dropped.
 */
export function libraryBlocksOf(plans: StoredPlan[]): LibraryBlock[] {
  const out = new Map<string, LibraryBlock>();
  for (const e of exercisesOf(plans)) {
    const key = blockKeyOf(e);
    const curated = isCuratedExercise(e);
    const id = curated ? (e.blockId as string) : blockIdOf(key);
    if (out.has(id)) continue;
    if (curated) {
      out.set(id, { id, key, source: "ai", curated: true });
      continue;
    }
    const parentId = isAnyBlockId(e.parentBlockId) && e.parentBlockId !== id ? e.parentBlockId : undefined;
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
  for (const e of exercisesOf(plans)) if (typeof e.id === "string" && e.id && !Object.hasOwn(out, e.id)) out[e.id] = isCuratedExercise(e) ? (e.blockId as string) : blockIdOf(blockKeyOf(e));
  return out;
}
