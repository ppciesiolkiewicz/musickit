import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { blocks, contentVideos } from "@/lib/db/schema";
import type { Cell } from "@/features/plan/model/tools";
import { toolCells } from "../model/slot";
import { bytewise, cellsOf, takeSteps, type ContentVideoRepo, type ContentVideoRow, type Lost, type Pointers } from "./repo";
import type { BlockVideos } from "./rules";

/*
 * Every value from a caller is a bound parameter. Ids are compared as text (`id::text = $1`), so an id that is not a UUID
 * matches nothing instead of throwing. Ids order with `collate "C"` (bytewise), as the memory repo's `<` does.
 */

type Stored = typeof contentVideos.$inferSelect;

const rowOf = (r: Stored): ContentVideoRow => ({
  id: r.id, title: r.title, note: r.note, recordedBy: r.recordedBy, madeFor: r.madeFor, tool: r.tool, steps: r.steps,
  type: r.type, seconds: r.seconds, width: r.width, height: r.height, size: r.size, blobPath: r.blobPath, overlay: r.overlay ?? null, createdAt: r.createdAt,
});

const idIs = (id: string): SQL => sql`${contentVideos.id}::text = ${id}`;
const newest = [desc(contentVideos.createdAt), sql`${contentVideos.id}::text collate "C"`];

/** Thrown inside a transaction to roll it back and answer `taken`. */
class Taken extends Error {}

/** The content videos over Postgres: the same rules as `repo.memory.ts`, held to `repoContract.ts` by `npm run test:library-db`. */
export function drizzleContentVideoRepo(db: Db): ContentVideoRepo {
  type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

  /** The curated blocks' cells that hold the video, by block id (bytewise) then cell. */
  const cellsHolding = async (q: Db | Tx, id: string) => {
    const rows = [...(await q.execute(sql`
      select b.id as block_id, c.key
      from blocks b
      cross join lateral jsonb_each_text(case when jsonb_typeof(b.videos -> 'cells') = 'object' then b.videos -> 'cells' else '{}'::jsonb end) c
      where b.kind = 'curated' and c.value = ${id} and c.key ~ '^(0|[1-9][0-9]*)$'`))] as { block_id: string; key: string }[];
    return rows.map((r) => ({ blockId: r.block_id, cell: Number(r.key) })).sort((a, b) => bytewise(a.blockId, b.blockId) || a.cell - b.cell);
  };

  const pointersOf = async (q: Db | Tx, row: Stored | undefined, id: string): Promise<Pointers> => ({
    tool: row?.tool ? { tool: row.tool, steps: row.steps } : null,
    cells: await cellsHolding(q, id),
  });

  /** Writes the row; false when its id or path is already stored. */
  const insert = async (tx: Tx, row: ContentVideoRow, tool: string | null, steps: string[] | null): Promise<boolean> => {
    const written = await tx
      .insert(contentVideos)
      .values({ ...row, tool, steps, overlay: row.overlay ?? null })
      .onConflictDoNothing()
      .returning({ id: contentVideos.id });
    return written.length === 1;
  };

  return {
    async create(row, target) {
      try {
        return await db.transaction(async (tx) => {
          if (target.kind === "cell") {
            const [block] = await tx
              .select({ content: blocks.content, videos: blocks.videos })
              .from(blocks)
              .where(and(eq(blocks.id, target.blockId), eq(blocks.kind, "curated")))
              .for("update");
            if (!block) return { ok: false as const, reason: "no-block" as const };
            const cells = (block.content as { cells?: unknown } | null)?.cells;
            if (target.cell >= toolCells(Array.isArray(cells) ? (cells as Cell[]) : []).length) return { ok: false as const, reason: "no-cell" as const };
            if (!(await insert(tx, row, null, null))) throw new Taken();
            const videos: BlockVideos = { ...block.videos, cells: { ...block.videos?.cells, [String(target.cell)]: row.id } };
            await tx.update(blocks).set({ videos }).where(eq(blocks.id, target.blockId));
            return { ok: true as const, lost: [] };
          }
          // a row lock would not stop two first saves of a tool with no rows yet: lock the tool's name
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"content_videos:" + target.tool}))`);
          const others = await tx
            .select()
            .from(contentVideos)
            .where(eq(contentVideos.tool, target.tool))
            .orderBy(sql`${contentVideos.id}::text collate "C"`);
          const lost: Lost[] = [];
          for (const other of others) {
            const taken = takeSteps(other, target);
            if (!taken) continue;
            await tx
              .update(contentVideos)
              .set({ steps: taken.steps, ...(taken.emptied ? { tool: null } : {}) })
              .where(eq(contentVideos.id, other.id));
            lost.push({ id: other.id, title: other.title, steps: taken.lost, emptied: taken.emptied });
          }
          if (!(await insert(tx, row, target.tool, target.steps))) throw new Taken();
          return { ok: true as const, lost };
        });
      } catch (e) {
        if (e instanceof Taken) return { ok: false, reason: "taken" };
        throw e;
      }
    },
    async get(id) {
      const [r] = await db.select().from(contentVideos).where(idIs(id));
      return r ? rowOf(r) : null;
    },
    async list() {
      return (await db.select().from(contentVideos).orderBy(...newest)).map(rowOf);
    },
    async edit(id, to) {
      const [r] = await db.update(contentVideos).set({ title: to.title, note: to.note }).where(idIs(id)).returning();
      return r ? rowOf(r) : null;
    },
    async pointers(id) {
      const [r] = await db.select().from(contentVideos).where(idIs(id));
      return pointersOf(db, r, id);
    },
    async remove(id) {
      return db.transaction(async (tx) => {
        const [r] = await tx.select().from(contentVideos).where(idIs(id)).for("update");
        if (!r) return null;
        const pointers = await pointersOf(tx, r, id);
        if (pointers.tool || pointers.cells.length) return { ok: false as const, pointers };
        await tx.delete(contentVideos).where(eq(contentVideos.id, r.id));
        return { ok: true as const, row: rowOf(r) };
      });
    },
    async forLookup(blockIds, tools) {
      const own: Record<string, Record<number, string>> = {};
      if (blockIds.length) {
        const found = await db
          .select({ id: blocks.id, videos: blocks.videos })
          .from(blocks)
          .where(and(inArray(blocks.id, blockIds), eq(blocks.kind, "curated")));
        for (const b of found) {
          const cells = cellsOf(b.videos);
          if (cells.length) own[b.id] = Object.fromEntries(cells);
        }
      }
      const held = [...new Set(Object.values(own).flatMap((c) => Object.values(c)))];
      const when: SQL[] = [];
      if (tools.length) when.push(inArray(contentVideos.tool, tools));
      if (held.length) when.push(sql`${contentVideos.id}::text = any(array[${sql.join(held.map((h) => sql`${h}`), sql`, `)}]::text[])`);
      if (!when.length) return { own, rows: [] };
      const rows = await db.select().from(contentVideos).where(or(...when)).orderBy(...newest);
      return { own, rows: rows.map(rowOf) };
    },
  };
}
