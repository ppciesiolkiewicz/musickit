import { randomBytes, randomUUID } from "node:crypto";
import { can, type Account } from "@/features/account/model";
import type { Block, PlanConfig, PlanState, StoredPlan } from "@/features/plan/model/types";
import { withExerciseIds } from "@/features/plan/model/exerciseIds";
import { localDate } from "@/features/plan/model/schedule";
import { fitPlanState, sanitiseState } from "@/features/plan/model/state";
import { MAX_DOC_BYTES, MAX_PLAN_BYTES, parseDoc } from "../model";
import { readDoc, writeDoc } from "./data";
import type { ShareRow, UserDataRepo } from "./repo";

/**
 * Sharing a note as a frozen public link, and a plan as an invite. Pure: no Request, no SQL; it takes the repo and the
 * signed-in account (from the session). A share is a copy made now: later edits never reach it. A copy naming a recording
 * that isn't one of the sharer's uploaded videos is refused, so `share_videos` lists every video in it, and `canWatch` reads only those.
 */

/** A share id: 32 random bytes, base64url (43 characters). Unguessable, never a sequence. */
export const newShareId = (): string => randomBytes(32).toString("base64url");

/** Every recording id (`{ source: "recording", id }`) anywhere in the JSON, once each. Library refs and placeholders are skipped. */
export function videoIdsIn(snapshot: unknown): string[] {
  const found = new Set<string>();
  const stack: unknown[] = [snapshot];
  while (stack.length) {
    const v = stack.pop();
    if (typeof v !== "object" || v === null) continue;
    if (Array.isArray(v)) {
      stack.push(...v);
      continue;
    }
    const o = v as Record<string, unknown>;
    if (o.source === "recording" && typeof o.id === "string") found.add(o.id);
    stack.push(...Object.values(o));
  }
  return [...found];
}

/** Why a share is refused: a recording in it isn't one of the sharer's uploaded videos (still uploading, or gone). */
export type NotUploaded = { error: "video-not-uploaded" };

/**
 * Stores the share, with the sharer's videos named in it. Refused (`video-not-uploaded`) when it names a recording that
 * isn't one of the sharer's uploaded videos: a take still in the upload queue would show "This video is gone" to every
 * reader of the frozen copy, for good. Share again once it is up.
 */
async function create(repo: UserDataRepo, userId: string, kind: ShareRow["kind"], itemId: string, snapshot: unknown, now: Date, newId: () => string): Promise<{ id: string } | NotUploaded> {
  const ids = videoIdsIn(snapshot);
  const mine = ids.length ? new Set((await repo.listVideos(userId)).map((v) => v.id)) : new Set<string>();
  if (ids.some((id) => !mine.has(id))) return { error: "video-not-uploaded" };
  const row: ShareRow = { id: newId(), userId, kind, itemId, snapshot, createdAt: now, stoppedAt: null };
  await repo.createShare(row, ids);
  return { id: row.id };
}

const isEmptyNote = (b: Block | null): boolean => !b || (!b.title.trim() && b.cells.length === 0);

/** Shares the user's note as it is stored now. `no-note` when there is none, or it has no title and no cells. */
export async function shareNote(repo: UserDataRepo, account: Account, now: Date, newId: () => string = newShareId): Promise<{ id: string } | { error: "no-note" } | NotUploaded> {
  const note = (await readDoc(repo, account.id, "note")) as Block | null;
  if (isEmptyNote(note)) return { error: "no-note" };
  return create(repo, account.id, "note", "note", note, now, newId);
}

/** The item a note share of the studio's stage is listed under (the stored note's is "note"). */
export const STUDIO_ITEM = "studio";

/**
 * Shares a note given whole, never stored as the user's note: the studio's stage built into a note (`blockFromStage`). It is
 * measured and parsed the way a stored note is. `no-note` when it is broken or has no title and no cells.
 */
export async function shareNoteBlock(repo: UserDataRepo, account: Account, raw: unknown, now: Date, newId: () => string = newShareId): Promise<{ id: string } | { error: "no-note" | "too-big" } | NotUploaded> {
  if ((JSON.stringify(raw) ?? "").length > MAX_DOC_BYTES) return { error: "too-big" };
  const note = parseDoc("note", raw) as Block | null;
  if (isEmptyNote(note)) return { error: "no-note" };
  return create(repo, account.id, "note", STUDIO_ITEM, note, now, newId);
}

/**
 * Shares one of the user's plans as an invite (teachers and owners): the plan the page names by `planId`, which is the own
 * current plan (today's day on `/plan`) or a plan in `given` (its own page). Any other id, an earlier plan's too, is
 * `not-found`. The snapshot is `{ config }`: the plan's days only, without ticks, ratings, feedback, intake answers or
 * history. The AI's `progress` notes are about the sharer, so they are left out too, and so is each exercise's `given`
 * (the version rolled for the sharer).
 */
export async function sharePlan(repo: UserDataRepo, account: Account, planId: string, now: Date, newId: () => string = newShareId): Promise<{ id: string } | { error: "not-allowed" | "not-found" } | NotUploaded> {
  if (!can(account, "sharePlan")) return { error: "not-allowed" };
  const state = (await readDoc(repo, account.id, "plan")) as PlanState;
  const plan = state.current?.id === planId ? state.current : state.given.find((p) => p.id === planId);
  if (!planId || !plan) return { error: "not-found" };
  // the version each exercise was rolled in is the sharer's own (their keys, their tempo, their earlier ones): the copy starts as the block is written
  const config: PlanConfig = { ...plan.config, days: plan.config.days.map((d) => ({ ...d, exercises: d.exercises.map(({ given: _given, ...e }) => e) })) };
  delete config.progress;
  return create(repo, account.id, "plan", plan.id, { config }, now, newId);
}

/** A live note share, for its public page; null when there is none, it is stopped, or it is a plan share. */
export async function openNoteShare(repo: UserDataRepo, id: string): Promise<ShareRow | null> {
  const row = await repo.getShare(id);
  return row && row.kind === "note" && row.stoppedAt === null ? row : null;
}

/** What a reader of a note link gets: the note and when it was shared. Never the owner's id, name or email. Null as `openNoteShare`. */
export async function readNoteShare(repo: UserDataRepo, id: string): Promise<{ note: Block; sharedAt: string } | null> {
  const row = await openNoteShare(repo, id);
  if (!row) return null;
  const note = (parseDoc("note", row.snapshot) as Block | null) ?? { title: "", cells: [] };
  return { note, sharedAt: row.createdAt.toISOString() };
}

/** The user's live links of one item, newest first, for the share popover: the id and the date, not the snapshot. */
export async function liveLinks(repo: UserDataRepo, userId: string, kind: ShareRow["kind"], itemId: string): Promise<{ id: string; createdAt: string }[]> {
  return (await repo.listShares(userId, kind, itemId)).map((s) => ({ id: s.id, createdAt: s.createdAt.toISOString() }));
}

/** The invite's week, made safe the way a stored plan is; null when it isn't one. */
function invitedConfig(snapshot: unknown): PlanConfig | null {
  const config = (snapshot as { config?: unknown } | null)?.config;
  const s = sanitiseState({ current: { id: "x", startedOn: "2000-01-01", done: {}, config } });
  return s.current?.config ?? null;
}

/**
 * Claims an invite: a copy of its plan at the front of the claimer's given plans (`PlanState.given`), started today,
 * whatever the current plan is; `current` and `history` are left as they are. A second claim adds nothing and returns the
 * copy's id; if the copy is gone from the document (another tab saved over it), it is added back. A stopped invite can't be claimed.
 * `nameOf` gives the sharer's name, stored on the copy (`sharedBy`) so the claimer sees who shared it.
 */
export async function claimInvite(
  repo: UserDataRepo,
  account: Account,
  id: string,
  now: Date,
  newId: () => string = randomUUID,
  nameOf: (userId: string) => Promise<string | null> = async () => null,
): Promise<{ ok: true; planId: string } | { error: "stopped" | "not-found" }> {
  const share = await repo.getShare(id);
  if (!share || share.kind !== "plan") return { error: "not-found" };
  if (share.stoppedAt !== null) return { error: "stopped" };
  const config = invitedConfig(share.snapshot);
  if (!config) return { error: "not-found" };
  await repo.claimPlan(id, account.id, now);
  const state = (await readDoc(repo, account.id, "plan")) as PlanState;
  const copy = state.given.find((p) => p.from === id);
  if (copy) return { ok: true, planId: copy.id };
  const sharedBy = share.userId === account.id ? null : await nameOf(share.userId);
  const plan: StoredPlan = { id: newId(), config: withExerciseIds(config, newId, true), startedOn: localDate(now), done: {}, from: id, ...(sharedBy ? { sharedBy } : {}) };
  const next: PlanState = { ...state, given: [plan, ...state.given] };
  // too big a document loses its oldest earlier plans, then its oldest given plans (fitPlanState); the copy, newest, goes last
  const saved = await writeDoc(repo, account.id, "plan", fitPlanState(next, MAX_PLAN_BYTES), now);
  if (!saved.ok) throw new Error(`claimInvite: plan document not saved (${saved.error})`);
  return { ok: true, planId: plan.id };
}
