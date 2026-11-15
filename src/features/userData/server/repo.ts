import type { DocKind } from "../model";
import type { BlockKey } from "@/features/plan/model/blockId";
import type { DayTime } from "@/features/plan/model/planTime";
import type { ProgressEntry } from "@/features/progress/log";
import type { Stars } from "@/features/progress/stars";

/** A player's uploaded video: the `videos` row. `blobPath` is where its file is in the private Blob store. */
export interface VideoRow {
  id: string;
  userId: string;
  title: string;
  type: string;
  seconds: number;
  width: number;
  height: number;
  size: number;
  blobPath: string;
  createdAt: Date;
}

/**
 * A frozen copy of a note or a plan, opened by its link: the `shares` row. `itemId` is "note" for the note, the plan's id
 * for a plan. `stoppedAt` is set when the owner stops sharing. The id is long and random (`newShareId`), never a sequence.
 */
export interface ShareRow {
  id: string;
  userId: string;
  kind: "note" | "plan";
  itemId: string;
  snapshot: unknown;
  createdAt: Date;
  stoppedAt: Date | null;
}

/** Where an owner got a block (`block_owners.source`): the AI, the player's edit, the app's seed, a hand-written example. */
export type BlockSource = "ai" | "edit" | "seed" | "example";

/** Who wrote a block and to which rules: the model, the AI prompt's version and the two documents' versions. Each null when unknown. */
export interface Provenance {
  model: string | null;
  promptVersion: number | null;
  docsAgents: number | null;
  docsTeaching: number | null;
}

/** A block to put in the library and the owner row to give it. `parentId` is only ever a block the saver owns. */
export interface NewBlock {
  id: string;
  key: BlockKey;
  parentId: string | null;
  source: BlockSource;
  enabledForReuse: boolean;
  /** Filled once, where the stored block has none (all four columns null); a block with a parent and none takes the parent's. */
  provenance?: Provenance;
}

/** One place in a plan: the block on a day at a position, and its minutes (`practice_plan_blocks`). */
export interface PlanBlockRow {
  day: number;
  place: number;
  blockId: string;
  minutes: number;
}

/** A player's review of a plan, the `plan_reviews` row. `libraryPlanId` is the library plan it was taken from, when known. */
export interface PlanReviewRow {
  planId: string;
  libraryPlanId: string | null;
  title: string;
  stars: Stars;
  why: string | null;
  at: Date;
}

/** Everything a player's documents, progress and videos need from storage. `drizzleUserDataRepo` is Postgres, `memoryUserDataRepo` is for tests. */
export interface UserDataRepo {
  /** The stored document, or null when there is none. */
  getDoc(userId: string, kind: DocKind): Promise<unknown | null>;
  /** Replaces the player's document of this kind. */
  putDoc(userId: string, kind: DocKind, data: unknown, now: Date): Promise<void>;
  listProgress(userId: string): Promise<ProgressEntry[]>;
  /** Replaces the entry for the same exercise. */
  putProgress(userId: string, entry: ProgressEntry, now: Date): Promise<void>;
  removeProgress(userId: string, exerciseId: string): Promise<void>;
  /** The day timer's records of one plan, as stored. */
  listPlanTimes(userId: string, planId: string): Promise<unknown[]>;
  /** The day timer's records of every plan of the user, as stored, newest `updated_at` first, at most 1000. */
  listAllPlanTimes(userId: string): Promise<unknown[]>;
  /**
   * Replaces the record of the same plan and day. A record without `blocks` or `on` keeps the stored ones, so a tab still
   * running code from before them doesn't wipe them.
   */
  putPlanTime(userId: string, time: DayTime, now: Date): Promise<void>;
  /** Which of these block ids the user owns (has a `block_owners` row for). */
  ownedBlockIds(userId: string, ids: string[]): Promise<Set<string>>;
  /**
   * In one transaction: the blocks not stored yet (a stored block's content and tags are never changed), then the owner
   * rows the user lacks, then provenance: a listed block whose four provenance columns are all null takes its own
   * `provenance`, and one that is still all null and has a stored parent takes the parent's. A block with any column set
   * is left. `null` is the app. Nothing is deleted.
   */
  addBlocks(userId: string | null, blocks: NewBlock[], now: Date): Promise<void>;
  /** Replaces the plan's `practice_plan_blocks` rows with these, in one transaction. */
  setPlanBlocks(planId: string, rows: PlanBlockRow[]): Promise<void>;
  /**
   * Makes the user's `plan_reviews` rows of these plans match `rows`: a row is added, or changed only when its `at` differs,
   * and a row of the user whose plan is in `planIds` but not in `rows` is deleted. Rows of plans not in `planIds` (dropped
   * from the history) are left. No `planIds`, nothing done.
   */
  syncPlanReviews(userId: string, planIds: string[], rows: PlanReviewRow[]): Promise<void>;
  /** Every player's plan reviews, newest `at` first. */
  listPlanReviews(limit: number): Promise<(PlanReviewRow & { userId: string })[]>;
  /** Stores a new video row; false when its id (or its path) is taken, and then nothing is changed. */
  createVideo(row: VideoRow): Promise<boolean>;
  /** The user's videos, newest first. */
  listVideos(userId: string): Promise<VideoRow[]>;
  /** A video by id, whoever owns it. Ids reaching here are checked UUIDs (`isVideoId`). */
  getVideo(id: string): Promise<VideoRow | null>;
  /** Renames the user's own video; null when they have no video with this id. */
  renameVideo(userId: string, id: string, title: string): Promise<VideoRow | null>;
  /** Removes the user's own video row and returns it (so its file can be deleted); null when they have no video with this id. */
  deleteVideo(userId: string, id: string): Promise<VideoRow | null>;
  /**
   * The video when this viewer (null: a visitor) may watch it, else null. The owner may; anyone may while it is in a live
   * (not stopped) note share of its owner; a viewer who claimed a plan share of its owner that holds it may, stopped or not.
   */
  canWatch(viewerId: string | null, videoId: string): Promise<VideoRow | null>;
  /** Stores the share and the videos it shows. Only `videoIds` that are videos of `row.userId` are kept, so no one shares another's video. */
  createShare(row: ShareRow, videoIds: string[]): Promise<void>;
  /** A share by id, stopped or not, whoever owns it. */
  getShare(id: string): Promise<ShareRow | null>;
  /** The user's live shares of one item, newest first. */
  listShares(userId: string, kind: ShareRow["kind"], itemId: string): Promise<ShareRow[]>;
  /** Stops the user's own live share; false when they have no live share with this id. */
  stopShare(userId: string, id: string, now: Date): Promise<boolean>;
  /** Records that the user claimed this plan share: "new" the first time, "again" after. Doesn't check the share is live. */
  claimPlan(shareId: string, userId: string, now: Date): Promise<"new" | "again">;
  /**
   * The blob paths of the user's videos, read before the account is deleted: deleting the user row cascades every row of
   * theirs (documents, progress, claims, shares, videos), and the caller then deletes these files. Read first, so a
   * delete that fails strands no file without its row.
   */
  videoPaths(userId: string): Promise<string[]>;
}
