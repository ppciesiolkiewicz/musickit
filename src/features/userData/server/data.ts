import { libraryBlocksOf } from "@/features/plan/model/libraryBlocks";
import { parseDayTime, type DayTime } from "@/features/plan/model/planTime";
import type { PlanState, StoredPlan } from "@/features/plan/model/types";
import { cleanEntries, type ProgressEntry } from "@/features/progress/log";
import { isDocKind, maxDocBytes, parseDoc, type DocKind } from "../model";
import type { PlanReviewRow, UserDataRepo } from "./repo";

/** The player's document of this kind, parsed; the kind's empty value when none is stored. */
export async function readDoc(repo: UserDataRepo, userId: string, kind: DocKind): Promise<unknown> {
  return parseDoc(kind, await repo.getDoc(userId, kind));
}

/**
 * Parses before storing, so a stored document is always safe to read back. Over its kind's cap (`maxDocBytes`) it is too big.
 * A plan also puts its blocks in the library (`storePlanBlocks`) and syncs its reviews (`syncPlanReviews`), from the parsed state. Those are side effects: the document
 * save is what the player asked for, so a failure there is logged and the save still succeeds; the next save repairs it.
 */
export async function writeDoc(repo: UserDataRepo, userId: string, kind: string, raw: unknown, now: Date): Promise<{ ok: true } | { ok: false; error: "too-big" | "bad-kind" }> {
  if (!isDocKind(kind)) return { ok: false, error: "bad-kind" };
  if ((JSON.stringify(raw) ?? "").length > maxDocBytes(kind)) return { ok: false, error: "too-big" };
  const doc = parseDoc(kind, raw);
  await repo.putDoc(userId, kind, doc, now);
  if (kind === "plan") {
    try {
      await storePlanBlocks(repo, userId, doc as PlanState, now);
    } catch (error) {
      console.error("[writeDoc] storePlanBlocks failed", { userId, error });
    }
    try {
      const state = doc as PlanState;
      await repo.syncPlanReviews(userId, [state.current, ...state.history].flatMap((p) => (p ? [p.id] : [])), reviewRowsOf(state));
    } catch (error) {
      console.error("[writeDoc] syncPlanReviews failed", { userId, error });
    }
  }
  return { ok: true };
}

/**
 * The `plan_reviews` rows of a parsed plan document: one for each plan (current, then history) that has a review, and one per
 * plan id, the first kept (two rows for one id would make the upsert throw on every save). `libraryPlanId` stays null until a
 * stored plan records its library plan.
 */
export function reviewRowsOf(state: PlanState): PlanReviewRow[] {
  const seen = new Set<string>();
  return [state.current, ...state.history].flatMap((p) => {
    const review = p?.review;
    const at = review ? new Date(review.at) : null;
    if (!p || !review || !at || Number.isNaN(at.getTime()) || seen.has(p.id)) return [];
    seen.add(p.id);
    return [{ planId: p.id, libraryPlanId: null, title: typeof p.config?.title === "string" ? p.config.title : "", stars: review.stars, why: review.why ?? null, at }];
  });
}

/**
 * Puts the blocks of a parsed plan document (the current plan, then the history) in the library, owned by the player:
 * only those they don't own yet, so a second save adds nothing. Ids are worked out from content and tags, never taken from
 * the document. A parent is kept only when the player owns it or it is in this document, so no one hangs a block off
 * another player's private one. Returns how many blocks the player newly owns.
 */
export async function storePlanBlocks(repo: UserDataRepo, userId: string, state: PlanState, now: Date): Promise<number> {
  const found = libraryBlocksOf([state.current, ...state.history].filter((p): p is StoredPlan => !!p));
  if (!found.length) return 0;
  const inDoc = new Set(found.map((b) => b.id));
  const parents = found.flatMap((b) => (b.parentId && !inDoc.has(b.parentId) ? [b.parentId] : []));
  const owned = await repo.ownedBlockIds(userId, [...inDoc, ...new Set(parents)]);
  const fresh = found.filter((b) => !owned.has(b.id));
  if (!fresh.length) return 0;
  await repo.addBlocks(
    userId,
    fresh.map((b) => ({ id: b.id, key: b.key, parentId: b.parentId && (owned.has(b.parentId) || inDoc.has(b.parentId)) ? b.parentId : null, source: b.source, enabledForReuse: false })),
    now,
  );
  return fresh.length;
}

/** Stores one progress entry (replacing the exercise's earlier one); false when it is broken. */
export async function putEntry(repo: UserDataRepo, userId: string, raw: unknown, now: Date): Promise<boolean> {
  const entry = cleanEntries([raw])[0];
  if (!entry) return false;
  await repo.putProgress(userId, entry, now);
  return true;
}

/** The player's progress log as stored, re-parsed the way documents are: broken rows dropped, one row per exercise. */
export async function readEntries(repo: UserDataRepo, userId: string): Promise<ProgressEntry[]> {
  return cleanEntries(await repo.listProgress(userId));
}

/** Stores one day of the day timer's record (`PUT /api/me/plan/time`), replacing that day's; false when it is broken. The plan document is never read. */
export async function writePlanTime(repo: UserDataRepo, userId: string, raw: unknown, now: Date): Promise<boolean> {
  const time = parseDayTime(raw);
  if (!time) return false;
  await repo.putPlanTime(userId, time, now);
  return true;
}

/** The day timer's records of one plan, re-parsed the way documents are: broken rows dropped. */
export async function readPlanTimes(repo: UserDataRepo, userId: string, planId: string): Promise<DayTime[]> {
  return (await repo.listPlanTimes(userId, planId)).flatMap((r) => parseDayTime(r) ?? []);
}

/** The day timer's records of every plan of the player (newest first, at most 1000), re-parsed the way documents are: broken rows dropped. */
export async function readAllPlanTimes(repo: UserDataRepo, userId: string): Promise<DayTime[]> {
  return (await repo.listAllPlanTimes(userId)).flatMap((r) => parseDayTime(r) ?? []);
}
