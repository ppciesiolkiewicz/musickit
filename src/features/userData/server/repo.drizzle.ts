import { and, desc, eq, exists, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { blockOwners, blocks, planClaims, planDayTimes, planReviews, progressEntries, shareVideos, shares, userDocuments, videos } from "@/lib/db/schema";
import type { ProgressEntry } from "@/features/progress/log";
import type { PlanReviewRow, ShareRow, UserDataRepo, VideoRow } from "./repo";

/** A UUID, as the `videos.id` column takes; anything else would make Postgres throw. */
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** The repo over Postgres. */
export function drizzleUserDataRepo(db: Db): UserDataRepo {
  return {
    async getDoc(userId, kind) {
      const [row] = await db.select({ data: userDocuments.data }).from(userDocuments).where(and(eq(userDocuments.userId, userId), eq(userDocuments.kind, kind))).limit(1);
      return row?.data ?? null;
    },
    async putDoc(userId, kind, data, now) {
      await db.insert(userDocuments).values({ userId, kind, data, updatedAt: now }).onConflictDoUpdate({ target: [userDocuments.userId, userDocuments.kind], set: { data, updatedAt: now } });
    },
    async listProgress(userId) {
      const rows = await db.select({ entry: progressEntries.entry }).from(progressEntries).where(eq(progressEntries.userId, userId));
      return rows.map((r) => r.entry as ProgressEntry);
    },
    async putProgress(userId, entry, now) {
      const blockId = entry.blockId ?? null;
      await db
        .insert(progressEntries)
        .values({ userId, exerciseId: entry.exerciseId, entry, blockId, updatedAt: now })
        .onConflictDoUpdate({
          target: [progressEntries.userId, progressEntries.exerciseId],
          // an entry without a block id (a tab running code from before blocks) keeps the stored one, in the column and in
          // the entry; a slot's block never changes, so this is safe
          set: {
            entry: sql`case when excluded.block_id is null and ${progressEntries.blockId} is not null then excluded.entry || jsonb_build_object('blockId', ${progressEntries.blockId}) else excluded.entry end`,
            blockId: sql`coalesce(excluded.block_id, ${progressEntries.blockId})`,
            updatedAt: now,
          },
        });
    },
    async removeProgress(userId, exerciseId) {
      await db.delete(progressEntries).where(and(eq(progressEntries.userId, userId), eq(progressEntries.exerciseId, exerciseId)));
    },
    async listPlanTimes(userId, planId) {
      // `on_dates` comes back as `on`, the `DayTime` field it holds
      return db
        .select({ planId: planDayTimes.planId, day: planDayTimes.day, elapsed: planDayTimes.elapsed, spent: planDayTimes.spent, blocks: planDayTimes.blocks, on: planDayTimes.onDates })
        .from(planDayTimes)
        .where(and(eq(planDayTimes.userId, userId), eq(planDayTimes.planId, planId)));
    },
    async putPlanTime(userId, t, now) {
      await db
        .insert(planDayTimes)
        .values({ userId, planId: t.planId, day: t.day, elapsed: t.elapsed, spent: t.spent, blocks: t.blocks ?? null, onDates: t.on ?? null, updatedAt: now })
        .onConflictDoUpdate({
          target: [planDayTimes.userId, planDayTimes.planId, planDayTimes.day],
          // a record without blocks or dates (a tab running code from before them) keeps the stored ones
          set: { elapsed: t.elapsed, spent: t.spent, blocks: sql`coalesce(excluded.blocks, ${planDayTimes.blocks})`, onDates: sql`coalesce(excluded.on_dates, ${planDayTimes.onDates})`, updatedAt: now },
        });
    },
    async ownedBlockIds(userId, ids) {
      if (!ids.length) return new Set();
      const rows = await db.select({ id: blockOwners.blockId }).from(blockOwners).where(and(eq(blockOwners.userId, userId), inArray(blockOwners.blockId, ids)));
      return new Set(rows.map((r) => r.id));
    },
    async addBlocks(userId, list, now) {
      if (!list.length) return;
      await db.transaction(async (tx) => {
        // a stored block is never changed: the same id is the same content and tags
        await tx
          .insert(blocks)
          .values(
            list.map(({ id, key, parentId }) => ({
              id,
              content: key.content,
              area: key.area ?? null,
              topic: key.topic ?? null,
              concepts: key.concepts ?? [],
              level: key.level ?? null,
              tags: key.tags ?? [],
              parentId,
              createdAt: now,
            })),
          )
          .onConflictDoNothing();
        // the unique (user_id, block_id) is nulls not distinct, so the app (null) owns a block once
        await tx
          .insert(blockOwners)
          .values(list.map((b) => ({ userId, blockId: b.id, source: b.source, enabledForReuse: b.enabledForReuse, createdAt: now })))
          .onConflictDoNothing();
      });
    },
    async syncPlanReviews(userId, planIds, rows) {
      if (!planIds.length) return;
      await db.transaction(async (tx) => {
        if (rows.length) {
          await tx
            .insert(planReviews)
            .values(rows.map((r) => ({ userId, planId: r.planId, libraryPlanId: r.libraryPlanId, title: r.title, stars: r.stars, why: r.why, at: r.at })))
            .onConflictDoUpdate({
              target: [planReviews.userId, planReviews.planId],
              set: { libraryPlanId: sql`excluded.library_plan_id`, title: sql`excluded.title`, stars: sql`excluded.stars`, why: sql`excluded.why`, at: sql`excluded.at` },
              setWhere: sql`${planReviews.at} is distinct from excluded.at`,
            });
        }
        const kept = rows.map((r) => r.planId);
        await tx.delete(planReviews).where(and(eq(planReviews.userId, userId), inArray(planReviews.planId, planIds), kept.length ? notInArray(planReviews.planId, kept) : undefined));
      });
    },
    async listPlanReviews(limit) {
      const out = await db.select().from(planReviews).orderBy(desc(planReviews.at)).limit(limit);
      return out.map((r) => ({ userId: r.userId, planId: r.planId, libraryPlanId: r.libraryPlanId, title: r.title, stars: r.stars as PlanReviewRow["stars"], why: r.why, at: r.at }));
    },
    async createVideo(row) {
      const made = await db.insert(videos).values(row).onConflictDoNothing().returning({ id: videos.id });
      return made.length > 0;
    },
    async listVideos(userId) {
      return db.select().from(videos).where(eq(videos.userId, userId)).orderBy(desc(videos.createdAt));
    },
    async getVideo(id) {
      const [row] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
      return row ?? null;
    },
    async renameVideo(userId, id, title) {
      const [row] = await db.update(videos).set({ title }).where(and(eq(videos.id, id), eq(videos.userId, userId))).returning();
      return row ?? null;
    },
    async deleteVideo(userId, id) {
      const [row] = await db.delete(videos).where(and(eq(videos.id, id), eq(videos.userId, userId))).returning();
      return row ?? null;
    },
    async canWatch(viewerId, videoId) {
      if (!isUuid(videoId) || (viewerId !== null && !isUuid(viewerId))) return null;
      // one query: the owner, or a share of the video's owner that lists it and is a live note, or a plan this viewer claimed
      const claimed = viewerId === null ? sql`false` : exists(db.select({ one: sql`1` }).from(planClaims).where(and(eq(planClaims.shareId, shares.id), eq(planClaims.userId, viewerId))));
      const shared = exists(
        db
          .select({ one: sql`1` })
          .from(shareVideos)
          .innerJoin(shares, eq(shares.id, shareVideos.shareId))
          .where(and(eq(shareVideos.videoId, videos.id), eq(shares.userId, videos.userId), or(and(eq(shares.kind, "note"), isNull(shares.stoppedAt)), and(eq(shares.kind, "plan"), claimed)))),
      );
      const allowed = viewerId === null ? shared : or(eq(videos.userId, viewerId), shared);
      const [row]: VideoRow[] = await db.select().from(videos).where(and(eq(videos.id, videoId), allowed)).limit(1);
      return row ?? null;
    },
    async createShare(row, videoIds) {
      await db.transaction(async (tx) => {
        await tx.insert(shares).values(row);
        if (!videoIds.length) return;
        // only the sharer's own videos, whatever the caller passed
        const own = await tx.select({ id: videos.id }).from(videos).where(and(eq(videos.userId, row.userId), inArray(videos.id, videoIds.filter(isUuid))));
        if (own.length) await tx.insert(shareVideos).values(own.map((v) => ({ shareId: row.id, videoId: v.id }))).onConflictDoNothing();
      });
    },
    async getShare(id) {
      const [row] = await db.select().from(shares).where(eq(shares.id, id)).limit(1);
      return (row as ShareRow | undefined) ?? null;
    },
    async listShares(userId, kind, itemId) {
      const rows = await db.select().from(shares).where(and(eq(shares.userId, userId), eq(shares.kind, kind), eq(shares.itemId, itemId), isNull(shares.stoppedAt))).orderBy(desc(shares.createdAt));
      return rows as ShareRow[];
    },
    async stopShare(userId, id, now) {
      const done = await db.update(shares).set({ stoppedAt: now }).where(and(eq(shares.id, id), eq(shares.userId, userId), isNull(shares.stoppedAt))).returning({ id: shares.id });
      return done.length > 0;
    },
    async claimPlan(shareId, userId, now) {
      const made = await db.insert(planClaims).values({ shareId, userId, createdAt: now }).onConflictDoNothing().returning({ shareId: planClaims.shareId });
      return made.length > 0 ? "new" : "again";
    },
    async videoPaths(userId) {
      return (await db.select({ blobPath: videos.blobPath }).from(videos).where(eq(videos.userId, userId))).map((v) => v.blobPath);
    },
  };
}
