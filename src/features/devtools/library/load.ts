import { findBlocks, getBlock, libraryCoverage, BLOCK_LIMIT, type Deps } from "@/features/library/server/query";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import type { BlockSummary, ConceptCoverage, CoverageRow, Scope } from "@/features/library/server/types";
import { devScope } from "@/features/library/server/mcp";
import { blockOfChoice } from "@/features/plan/model/blockId";
import { drizzleUserDataRepo } from "@/features/userData/server/repo.drizzle";
import type { Db } from "@/lib/db/client";
import { SEED_BLOCKS } from "@/features/library/seed";
import { riffInFile } from "../riff/blocks";
import { databaseItem, seedItem, type DrawnItem } from "./item";
import { devArgs, type LibraryParams } from "./params";

/** What a library page read, or why it could not: no database, or the query failed. */
export type Loaded<T> =
  | { state: "no-database" }
  | { state: "failed"; message: string }
  /** `scopeError`: why the player parameter was refused; the page is then read without a player */
  | { state: "ok"; data: T; scopeError: string | null };

export interface CoverageData {
  topics: CoverageRow[];
  concepts: ConceptCoverage[];
}

/** A topic and how many blocks it has, over every level. */
export interface TopicCount {
  topic: string;
  blocks: number;
}

export interface BlocksData {
  /** every topic with blocks, for the picker */
  topics: TopicCount[];
  /** the topic listed: the address's, else the open item's */
  topic: string | null;
  /** null until a topic is chosen */
  blocks: BlockSummary[] | null;
  /** the blocks whose riff was saved in the app and isn't in their seed file yet (`db:pull-riffs` writes it) */
  riffEdited: string[];
}

export type ItemResult =
  | { state: "none" }
  | { state: "found"; item: DrawnItem }
  | { state: "not-found"; id: string; message?: string };

const depsOf = (db: Db): Deps => ({ library: drizzleLibraryRepo(db), userData: drizzleUserDataRepo(db) });

/** Reads under the page's scope (the player's, or none when the player is refused), through the MCP tools' queries. Never throws. */
async function scoped<T>(db: Db | null, params: LibraryParams, read: (deps: Deps, scope: Scope) => Promise<T>): Promise<Loaded<T>> {
  if (!db) return { state: "no-database" };
  try {
    const deps = depsOf(db);
    let scopeError: string | null = null;
    let s = await devScope(devArgs(params), deps);
    if ("error" in s) {
      scopeError = s.error;
      s = await devScope(devArgs({ ...params, player: undefined }), deps);
    }
    if ("error" in s) return { state: "failed", message: s.error };
    return { state: "ok", data: await read(deps, s.scope), scopeError };
  } catch (e) {
    return { state: "failed", message: e instanceof Error ? e.message : String(e) };
  }
}

/** The overview: coverage by topic and level, and by concept. */
export const loadCoverage = (db: Db | null, params: LibraryParams): Promise<Loaded<CoverageData>> =>
  scoped(db, params, async (deps, scope) => {
    const { topics, concepts } = await libraryCoverage(deps, scope);
    return { topics, concepts };
  });

/** Blocks per topic over every level, topics with none left out, in coverage order. */
export function topicCounts(rows: CoverageRow[]): TopicCount[] {
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.topic, (by.get(r.topic) ?? 0) + r.blocks);
  return [...by].filter(([, n]) => n > 0).map(([topic, blocks]) => ({ topic, blocks }));
}

/** The ids of the blocks whose riff saved in the app differs from their seed file's (a block with no file is left out). */
async function riffsNotInFile(deps: Deps): Promise<string[]> {
  const files = new Map(SEED_BLOCKS.map((f) => [f.id, f]));
  return (await deps.userData.riffEdits()).filter((e) => files.has(e.blockId) && !riffInFile(files.get(e.blockId), e.edit)).map((e) => e.blockId);
}

/**
 * The Blocks page: the topics to pick from and the blocks of one. Without a topic in the address, an open item's own
 * topic is listed, so a bare `?item=<block id>` link opens it in its row.
 */
export const loadBlocks = (db: Db | null, params: LibraryParams): Promise<Loaded<BlocksData>> =>
  scoped(db, params, async (deps, scope) => {
    const { topics } = await libraryCoverage(deps, scope);
    let topic = params.topic ?? null;
    if (topic === null && params.item !== undefined) topic = (await getBlock(deps, scope, blockOfChoice(params.item) ?? params.item))?.topic ?? null;
    const blocks = topic === null ? null : await findBlocks(deps, scope, { topic }, "newest", BLOCK_LIMIT.max);
    return { topics: topicCounts(topics), topic, blocks, riffEdited: await riffsNotInFile(deps) };
  });

/**
 * The plan, block or choice in `?item=`: from its seed file when it has one, else a block from the database (under the
 * page's scope; a choice id draws that choice of its block). Never throws: a failed read is a not-found with the reason.
 */
export async function loadItem(db: Db | null, params: LibraryParams): Promise<ItemResult> {
  const id = params.item;
  if (id === undefined) return { state: "none" };
  const seed = seedItem(id);
  if (seed) return { state: "found", item: seed };
  if (!db) return { state: "not-found", id };
  try {
    const deps = depsOf(db);
    let s = await devScope(devArgs(params), deps);
    if ("error" in s) s = await devScope(devArgs({ ...params, player: undefined }), deps);
    if ("error" in s) return { state: "not-found", id, message: s.error };
    // a choice id draws that choice of its block, when the scope lists it
    const blockId = blockOfChoice(id);
    const block = await getBlock(deps, s.scope, blockId ?? id);
    if (!block) return { state: "not-found", id };
    if (blockId && !block.choices.some((c) => c.id === id)) return { state: "not-found", id, message: "The block has no such choice." };
    return { state: "found", item: databaseItem(block, blockId ? id : undefined) };
  } catch (e) {
    return { state: "not-found", id, message: e instanceof Error ? e.message : String(e) };
  }
}
