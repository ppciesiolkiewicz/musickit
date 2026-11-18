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

/** The player's document with its version, parsed; the kind's empty value at version 0 when none is stored. */
export async function readDocVersioned(repo: UserDataRepo, userId: string, kind: DocKind): Promise<{ data: unknown; version: number }> {
  const row = await repo.getDocVersioned(userId, kind);
  return { data: parseDoc(kind, row?.data ?? null), version: row?.version ?? 0 };
}

/** Every plan of a plan document: the current one, the history, the given plans. */
const plansOf = (s: PlanState): StoredPlan[] => [s.current, ...s.history, ...s.given].filter((p): p is StoredPlan => !!p);

/** A plan with its `teacher` record's comment left out (the comment is for our team only; it never reaches the student's screen). */
function withoutComment(p: StoredPlan): StoredPlan {
  if (p.teacher?.comment === undefined) return p;
  const teacher = { ...p.teacher };
  delete teacher.comment;
  return { ...p, teacher };
}

/** A parsed plan document with the teacher's comment taken off every plan (current, history, given). */
export function withoutTeacherComments(s: PlanState): PlanState {
  return { ...s, current: s.current && withoutComment(s.current), history: s.history.map(withoutComment), given: s.given.map(withoutComment) };
}

/**
 * The document as its owner's browser gets it (`GET /api/me/documents/<kind>`): `readDocVersioned`, with the teacher's
 * comments taken off a plan document. The stored document keeps them; `writeDoc` puts them back on the owner's save.
 */
export async function readOwnDocVersioned(repo: UserDataRepo, userId: string, kind: DocKind): Promise<{ data: unknown; version: number }> {
  const read = await readDocVersioned(repo, userId, kind);
  return kind === "plan" ? { ...read, data: withoutTeacherComments(read.data as PlanState) } : read;
}

/**
 * The stored teacher's comments put back onto an incoming plan document: on each plan with the same id that has a
 * `teacher` record and no comment of its own (the owner's browser never had it). A comment the incoming document
 * carries (the teacher's write) is kept as it is.
 */
export function keepTeacherComments(incoming: PlanState, stored: PlanState): PlanState {
  const comments = new Map(plansOf(stored).flatMap((p) => (p.teacher?.comment ? [[p.id, p.teacher.comment] as const] : [])));
  if (!comments.size) return incoming;
  const put = (p: StoredPlan): StoredPlan => (p.teacher && p.teacher.comment === undefined && comments.has(p.id) ? { ...p, teacher: { ...p.teacher, comment: comments.get(p.id)! } } : p);
  return { ...incoming, current: incoming.current && put(incoming.current), history: incoming.history.map(put), given: incoming.given.map(put) };
}

/**
 * An owner's plan document with the teacher's records as stored: each plan gets the stored `teacher` record of the plan with
 * the same id (madeAt and comment), or none. An owner's save never writes a teacher record or a comment of its own, never
 * changes one and never drops one from a plan it still sends.
 */
export function storedTeacherRecords(incoming: PlanState, stored: PlanState): PlanState {
  const records = new Map(plansOf(stored).flatMap((p) => (p.teacher ? [[p.id, p.teacher] as const] : [])));
  const put = (p: StoredPlan): StoredPlan => {
    const teacher = records.get(p.id);
    if (teacher) return { ...p, teacher: { ...teacher } };
    if (!p.teacher) return p;
    const rest = { ...p };
    delete rest.teacher;
    return rest;
  };
  return { ...incoming, current: incoming.current && put(incoming.current), history: incoming.history.map(put), given: incoming.given.map(put) };
}

/** How many times a plan save without `expect` reads, merges the comments and writes before it writes regardless. */
const COMMENT_TRIES = 3;

/**
 * Parses before storing, so a stored document is always safe to read back. Over its kind's cap (`maxDocBytes`) it is too big.
 * A plan also puts its blocks in the library (`storePlanBlocks`) and syncs its reviews (`syncPlanReviews`), from the parsed state. Those are side effects: the document
 * save is what the player asked for, so a failure there is logged and the save still succeeds; the next save repairs it.
 * Every write adds 1 to the document's version. With `expect` it writes only when the stored version is `expect` (0 when none is stored);
 * otherwise it is "stale", with the stored version, and nothing is written, not even the plan's side effects. Without `expect` it always writes.
 * A plan keeps the teacher's comments stored on it, read in the same call: with `expect`, from the version it replaces;
 * without, the write names the version it read and reads again when another write came between. With `owner` (the
 * player's own save, `PUT /api/me/documents/plan`) the stored teacher records always win (`storedTeacherRecords`), so the
 * owner can't change, add or drop a comment; without it (a server writer, `makeWeek`) a comment the document carries wins
 * and a missing one is put back (`keepTeacherComments`).
 */
export async function writeDoc(
  repo: UserDataRepo,
  userId: string,
  kind: string,
  raw: unknown,
  now: Date,
  expect?: number,
  opts: { owner?: boolean } = {},
): Promise<{ ok: true; version: number } | { ok: false; error: "too-big" | "bad-kind" | "stale"; version?: number }> {
  if (!isDocKind(kind)) return { ok: false, error: "bad-kind" };
  if ((JSON.stringify(raw) ?? "").length > maxDocBytes(kind)) return { ok: false, error: "too-big" };
  let doc = parseDoc(kind, raw);
  let put: Awaited<ReturnType<UserDataRepo["putDoc"]>>;
  if (kind === "plan") {
    const incoming = doc as PlanState;
    for (let i = 0; ; i++) {
      const stored = await readDocVersioned(repo, userId, "plan");
      if (expect !== undefined && stored.version !== expect) return { ok: false, error: "stale", version: stored.version };
      // an owner's merge can leave a given plan with neither `from` nor `teacher`: parsed again, it is dropped as any such plan is
      doc = opts.owner ? parseDoc("plan", storedTeacherRecords(incoming, stored.data as PlanState)) : keepTeacherComments(incoming, stored.data as PlanState);
      // without `expect` the last try writes regardless, as a save without a version always does
      put = await repo.putDoc(userId, kind, doc, now, expect ?? (i < COMMENT_TRIES - 1 ? stored.version : undefined));
      if (put.ok || expect !== undefined || i >= COMMENT_TRIES - 1) break;
    }
  } else {
    put = await repo.putDoc(userId, kind, doc, now, expect);
  }
  if (!put.ok) return { ok: false, error: "stale", version: put.version };
  if (kind === "plan") {
    try {
      await storePlanBlocks(repo, userId, doc as PlanState, now);
    } catch (error) {
      console.error("[writeDoc] storePlanBlocks failed", { userId, error });
    }
    try {
      const state = doc as PlanState;
      await repo.syncPlanReviews(userId, [state.current, ...state.history, ...state.given].flatMap((p) => (p ? [p.id] : [])), reviewRowsOf(state));
    } catch (error) {
      console.error("[writeDoc] syncPlanReviews failed", { userId, error });
    }
  }
  return { ok: true, version: put.version };
}

/**
 * The `plan_reviews` rows of a parsed plan document: one for each plan (current, then history, then given) that has a review, and one per
 * plan id, the first kept (two rows for one id would make the upsert throw on every save). `libraryPlanId` stays null until a
 * stored plan records its library plan.
 */
export function reviewRowsOf(state: PlanState): PlanReviewRow[] {
  const seen = new Set<string>();
  return [state.current, ...state.history, ...state.given].flatMap((p) => {
    const review = p?.review;
    const at = review ? new Date(review.at) : null;
    if (!p || !review || !at || Number.isNaN(at.getTime()) || seen.has(p.id)) return [];
    seen.add(p.id);
    return [{ planId: p.id, libraryPlanId: null, title: typeof p.config?.title === "string" ? p.config.title : "", stars: review.stars, why: review.why ?? null, at }];
  });
}

/**
 * Puts the blocks of a parsed plan document (the current plan, then the history, then the given plans) in the library, owned by the player:
 * only those they don't own yet, so a second save adds nothing. Ids are worked out from content and tags, never taken from
 * the document. A parent is kept only when the player owns it or it is in this document, so no one hangs a block off
 * another player's private one. Returns how many blocks the player newly owns.
 */
export async function storePlanBlocks(repo: UserDataRepo, userId: string, state: PlanState, now: Date): Promise<number> {
  const found = libraryBlocksOf([state.current, ...state.history, ...state.given].filter((p): p is StoredPlan => !!p));
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
