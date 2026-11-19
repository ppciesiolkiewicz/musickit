import { and, desc, eq, exists, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/lib/db/client";
import { blockOwners, blocks, choices, planClaims, planDayTimes, practicePlanBlocks, progressEntries, shareVideos, shares, userDocuments, userVoices, videos } from "@/lib/db/schema";
import { cleanVoice } from "@/features/theory/voiceRange";
import type { ProgressEntry } from "@/features/progress/log";
import { levelOfSteps } from "@/features/plan/model/path";
import type { Provenance, ShareRow, UserDataRepo, VideoRow } from "./repo";

/** A UUID, as the `videos.id` column takes; anything else would make Postgres throw. */
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** The repo over Postgres. */
export function drizzleUserDataRepo(db: Db): UserDataRepo {
  return {
    async getDoc(userId, kind) {
      const [row] = await db.select({ data: userDocuments.data }).from(userDocuments).where(and(eq(userDocuments.userId, userId), eq(userDocuments.kind, kind))).limit(1);
      return row?.data ?? null;
    },
    async getDocVersioned(userId, kind) {
      const [row] = await db.select({ data: userDocuments.data, version: userDocuments.version }).from(userDocuments).where(and(eq(userDocuments.userId, userId), eq(userDocuments.kind, kind))).limit(1);
      return row ?? null;
    },
    async putDoc(userId, kind, data, now, expect) {
      // one statement: insert version 1, or on conflict add 1 (only when the stored version is `expect`, if one is given)
      const insert = db.insert(userDocuments).values({ userId, kind, data, updatedAt: now, version: 1 });
      const set = { data, updatedAt: now, version: sql`${userDocuments.version} + 1` };
      const target = [userDocuments.userId, userDocuments.kind];
      // a document that does not exist yet is version 0: `expect` above 0 must not insert it
      if (expect !== undefined && expect > 0) {
        const [row] = await db.update(userDocuments).set(set).where(and(eq(userDocuments.userId, userId), eq(userDocuments.kind, kind), eq(userDocuments.version, expect))).returning({ version: userDocuments.version });
        if (row) return { ok: true, version: row.version };
      } else {
        const [row] = await (expect === undefined ? insert.onConflictDoUpdate({ target, set }) : insert.onConflictDoUpdate({ target, set, setWhere: eq(userDocuments.version, 0) })).returning({ version: userDocuments.version });
        if (row) return { ok: true, version: row.version };
      }
      const [current] = await db.select({ version: userDocuments.version }).from(userDocuments).where(and(eq(userDocuments.userId, userId), eq(userDocuments.kind, kind))).limit(1);
      return { ok: false, version: current?.version ?? 0 };
    },
    async listProgress(userId) {
      const rows = await db.select({ entry: progressEntries.entry }).from(progressEntries).where(eq(progressEntries.userId, userId));
      return rows.map((r) => r.entry as ProgressEntry);
    },
    async putProgress(userId, entry, now) {
      const blockId = entry.blockId ?? null;
      const choiceId = entry.choiceId ?? null;
      await db
        .insert(progressEntries)
        .values({ userId, exerciseId: entry.exerciseId, entry, blockId, choiceId, updatedAt: now })
        .onConflictDoUpdate({
          target: [progressEntries.userId, progressEntries.exerciseId],
          // an entry without a block id or a choice id (a tab running code from before them) keeps the stored one, in the column
          // and in the entry; a slot's block never changes, so this is safe
          set: {
            entry: sql`(case when excluded.block_id is null and ${progressEntries.blockId} is not null then excluded.entry || jsonb_build_object('blockId', ${progressEntries.blockId}) else excluded.entry end) || (case when excluded.choice_id is null and ${progressEntries.choiceId} is not null then jsonb_build_object('choiceId', ${progressEntries.choiceId}) else '{}'::jsonb end)`,
            blockId: sql`coalesce(excluded.block_id, ${progressEntries.blockId})`,
            choiceId: sql`coalesce(excluded.choice_id, ${progressEntries.choiceId})`,
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
    async listAllPlanTimes(userId) {
      return db
        .select({ planId: planDayTimes.planId, day: planDayTimes.day, elapsed: planDayTimes.elapsed, spent: planDayTimes.spent, blocks: planDayTimes.blocks, on: planDayTimes.onDates })
        .from(planDayTimes)
        .where(eq(planDayTimes.userId, userId))
        .orderBy(desc(planDayTimes.updatedAt))
        .limit(1000);
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
    async getVoice(userId) {
      const [row] = await db.select({ type: userVoices.type, low: userVoices.low, high: userVoices.high }).from(userVoices).where(eq(userVoices.userId, userId)).limit(1);
      if (!row) return null;
      return cleanVoice(row.low !== null && row.high !== null ? { range: { low: row.low, high: row.high } } : { type: row.type });
    },
    async putVoice(userId, voice, now) {
      if (!voice) {
        await db.delete(userVoices).where(eq(userVoices.userId, userId));
        return;
      }
      // a range of their own, or a type: the table's check takes one or the other
      const row = voice.range ? { type: null, low: voice.range.low, high: voice.range.high } : { type: voice.type ?? null, low: null, high: null };
      await db.insert(userVoices).values({ userId, ...row, updatedAt: now }).onConflictDoUpdate({ target: userVoices.userId, set: { ...row, updatedAt: now } });
    },
    async ownedBlockIds(userId, ids) {
      if (!ids.length) return new Set();
      const rows = await db.select({ id: blockOwners.blockId }).from(blockOwners).where(and(eq(blockOwners.userId, userId), inArray(blockOwners.blockId, ids)));
      return new Set(rows.map((r) => r.id));
    },
    async ownCurated(userId, ids, now) {
      if (!ids.length) return;
      // only a block that is stored: its row is the seed's, never written here
      const stored = await db.select({ id: blocks.id }).from(blocks).where(inArray(blocks.id, ids));
      if (!stored.length) return;
      await db.insert(blockOwners).values(stored.map((b) => ({ userId, blockId: b.id, source: "seed" as const, createdAt: now }))).onConflictDoNothing();
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
              level: key.level ?? (key.steps ? levelOfSteps(key.steps) : undefined) ?? null,
              steps: key.steps ?? [],
              tags: key.tags ?? [],
              parentId,
              createdAt: now,
            })),
          )
          .onConflictDoNothing();
        // the unique (user_id, block_id) is nulls not distinct, so the app (null) owns a block once
        await tx
          .insert(blockOwners)
          .values(list.map((b) => ({ userId, blockId: b.id, source: b.source, createdAt: now })))
          .onConflictDoNothing();
        // the slot is written on insert and filled once after: only where minutes is still null
        for (const b of list) {
          if (!b.slot) continue;
          await tx
            .update(blocks)
            .set({ minutes: b.slot.minutes, why: b.slot.why ?? null, learnBefore: b.slot.learnBefore ?? null, exploreMore: b.slot.exploreMore ?? null })
            .where(and(eq(blocks.id, b.id), isNull(blocks.minutes)));
        }
        // provenance is filled once: only where all four columns are still null
        const bare = and(isNull(blocks.model), isNull(blocks.promptVersion), isNull(blocks.docsAgents), isNull(blocks.docsTeaching));
        const groups = new Map<string, { p: Provenance; ids: string[] }>();
        for (const b of list) {
          if (!b.provenance) continue;
          const { model, promptVersion, docsAgents, docsTeaching } = b.provenance;
          if (model === null && promptVersion === null && docsAgents === null && docsTeaching === null) continue;
          const g = JSON.stringify([model, promptVersion, docsAgents, docsTeaching]);
          const grp = groups.get(g) ?? { p: b.provenance, ids: [] };
          grp.ids.push(b.id);
          groups.set(g, grp);
        }
        for (const { p, ids } of groups.values()) {
          await tx
            .update(blocks)
            .set({ model: p.model, promptVersion: p.promptVersion, docsAgents: p.docsAgents, docsTeaching: p.docsTeaching })
            .where(and(inArray(blocks.id, ids), bare));
        }
        // a listed block with a stored parent and still no provenance takes the parent's
        const parent = alias(blocks, "parent_block");
        await tx
          .update(blocks)
          .set({
            model: sql`${parent.model}`,
            promptVersion: sql`${parent.promptVersion}`,
            docsAgents: sql`${parent.docsAgents}`,
            docsTeaching: sql`${parent.docsTeaching}`,
          })
          .from(parent)
          .where(and(inArray(blocks.id, list.map((b) => b.id)), eq(blocks.parentId, parent.id), bare));
      });
    },
    async upsertCurated(list, now) {
      const listed = list.flatMap((b) => b.choices.map((c) => c.id));
      return db.transaction(async (tx) => {
        if (list.length) {
          // a curated block is the seed file's: everything but its id and created_at is overwritten
          await tx
            .insert(blocks)
            .values(
              list.map((b) => ({
                id: b.id,
                kind: "curated",
                content: b.content,
                area: b.area,
                topic: b.topic,
                concepts: b.concepts,
                level: null,
                steps: [],
                tags: b.tags,
                parentId: null,
                ...b.provenance,
                // the block's default minutes are its first choice's
                minutes: b.choices[0]?.minutes ?? null,
                why: b.slot.why ?? null,
                learnBefore: b.slot.learnBefore ?? null,
                exploreMore: b.slot.exploreMore ?? null,
                createdAt: now,
              })),
            )
            .onConflictDoUpdate({
              target: blocks.id,
              set: {
                kind: sql`excluded.kind`,
                content: sql`excluded.content`,
                area: sql`excluded.area`,
                topic: sql`excluded.topic`,
                concepts: sql`excluded.concepts`,
                level: sql`excluded.level`,
                steps: sql`excluded.steps`,
                tags: sql`excluded.tags`,
                parentId: sql`excluded.parent_id`,
                model: sql`excluded.model`,
                promptVersion: sql`excluded.prompt_version`,
                docsAgents: sql`excluded.docs_agents`,
                docsTeaching: sql`excluded.docs_teaching`,
                minutes: sql`excluded.minutes`,
                why: sql`excluded.why`,
                learnBefore: sql`excluded.learn_before`,
                exploreMore: sql`excluded.explore_more`,
              },
            });
          await tx
            .insert(blockOwners)
            .values(list.map((b) => ({ userId: null, blockId: b.id, source: "seed" as const, createdAt: now })))
            .onConflictDoNothing();
        }
        const rows = list.flatMap((b) => b.choices.map((c) => ({ id: c.id, blockId: b.id, name: c.name, level: c.level, steps: c.steps, moves: c.moves, minutes: c.minutes, active: c.active, place: c.place, createdAt: now, updatedAt: now })));
        if (rows.length) {
          // written only when a field differs, so updated_at says when the seed last changed the choice
          const changed = or(
            sql`${choices.blockId} is distinct from excluded.block_id`,
            sql`${choices.name} is distinct from excluded.name`,
            sql`${choices.level} is distinct from excluded.level`,
            sql`${choices.steps} is distinct from excluded.steps`,
            sql`${choices.moves} is distinct from excluded.moves`,
            sql`${choices.minutes} is distinct from excluded.minutes`,
            sql`${choices.active} is distinct from excluded.active`,
            sql`${choices.place} is distinct from excluded.place`,
          );
          await tx
            .insert(choices)
            .values(rows)
            .onConflictDoUpdate({
              target: choices.id,
              set: { blockId: sql`excluded.block_id`, name: sql`excluded.name`, level: sql`excluded.level`, steps: sql`excluded.steps`, moves: sql`excluded.moves`, minutes: sql`excluded.minutes`, active: sql`excluded.active`, place: sql`excluded.place`, updatedAt: now },
              setWhere: changed,
            });
        }
        // every other active choice of a curated block is no longer in the seed: off, never deleted
        const curated = tx.select({ id: blocks.id }).from(blocks).where(eq(blocks.kind, "curated"));
        const off = await tx
          .update(choices)
          .set({ active: false, updatedAt: now })
          .where(and(eq(choices.active, true), inArray(choices.blockId, curated), ...(listed.length ? [notInArray(choices.id, listed)] : [])))
          .returning({ id: choices.id });
        return { blocks: list.length, choices: listed.length, deactivated: off.length };
      });
    },
    async setPlanBlocks(planId, rows) {
      await db.transaction(async (tx) => {
        await tx.delete(practicePlanBlocks).where(eq(practicePlanBlocks.planId, planId));
        if (rows.length) await tx.insert(practicePlanBlocks).values(rows.map((r) => ({ planId, day: r.day, place: r.place, blockId: r.blockId, choiceId: r.choiceId ?? null, minutes: r.minutes })));
      });
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
