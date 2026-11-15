import { slotBlocks } from "@/features/plan/model/libraryBlocks";
import type { PlanState, StoredPlan } from "@/features/plan/model/types";
import { readDoc, readEntries, readPlanTimes, storePlanBlocks } from "./data";
import type { UserDataRepo } from "./repo";

/** What one player's move-over changed: blocks newly owned, entries and day times given their block ids. */
export interface MoveOverCounts {
  blocks: number;
  entries: number;
  days: number;
}

/**
 * One-off: gives a player's ratings and day times from before blocks their block ids, worked out from the plan document.
 * The document's blocks go in the library first (`storePlanBlocks`). Then each entry without a block id whose slot is in
 * a plan of the document gets one (`setEntryBlockId`), and each day time of those plans without blocks gets the blocks of
 * its slots with seconds (`setDayTimeBlocks`). Those write only the block column, never the whole row, so stars or seconds
 * a player saves meanwhile are kept. Entries and days whose plan is gone are left as they are; nothing is deleted.
 * Safe to run again: the second run changes nothing. Returns what it changed.
 */
export async function moveOverUser(repo: UserDataRepo, userId: string, now: Date): Promise<MoveOverCounts> {
  const state = (await readDoc(repo, userId, "plan")) as PlanState;
  const plans = [state.current, ...state.history].filter((p): p is StoredPlan => !!p);
  const blocks = await storePlanBlocks(repo, userId, state, now);
  const slots = slotBlocks(plans);
  let entries = 0;
  for (const e of await readEntries(repo, userId)) {
    if (e.blockId || !Object.hasOwn(slots, e.exerciseId)) continue;
    if (await repo.setEntryBlockId(userId, e.exerciseId, slots[e.exerciseId])) entries++;
  }
  let days = 0;
  for (const p of plans) {
    const own = slotBlocks([p]);
    for (const t of await readPlanTimes(repo, userId, p.id)) {
      if (t.blocks) continue;
      const known = Object.fromEntries(Object.keys(t.spent).flatMap((slot) => (Object.hasOwn(own, slot) ? [[slot, own[slot]]] : [])));
      if (!Object.keys(known).length) continue;
      if (await repo.setDayTimeBlocks(userId, p.id, t.day, known)) days++;
    }
  }
  return { blocks, entries, days };
}
