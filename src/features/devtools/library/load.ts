import { findBlocks, findPlans, getBlock, libraryCoverage, BLOCK_LIMIT, PLAN_LIMIT, type Deps } from "@/features/library/server/query";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import type { BlockSummary, ConceptCoverage, CoverageRow, PlanSummary } from "@/features/library/server/types";
import { devScope } from "@/features/library/server/mcp";
import { blockOfChoice } from "@/features/plan/model/blockId";
import { drizzleUserDataRepo } from "@/features/userData/server/repo.drizzle";
import type { Db } from "@/lib/db/client";
import { databaseItem, seedItem, type DrawnItem } from "./item";
import { devArgs, type LibraryParams } from "./params";

export interface LibraryData {
  /** why the player parameter was refused; the tables are then read without a player */
  scopeError: string | null;
  topics: CoverageRow[];
  concepts: ConceptCoverage[];
  plans: PlanSummary[];
  /** null until a topic is chosen */
  blocks: BlockSummary[] | null;
}

export type LibraryResult =
  | { state: "no-database" }
  | { state: "failed"; message: string }
  | { state: "ok"; data: LibraryData };

export type ItemResult =
  | { state: "none" }
  | { state: "found"; item: DrawnItem }
  | { state: "not-found"; id: string; message?: string };

const depsOf = (db: Db): Deps => ({ library: drizzleLibraryRepo(db), userData: drizzleUserDataRepo(db) });

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
    if (blockId && !block.choices.some((c) => c.id === id)) return { state: "not-found", id, message: "The block has no such choice, or it is inactive (show inactive ones too)." };
    return { state: "found", item: databaseItem(block, blockId ? id : undefined) };
  } catch (e) {
    return { state: "not-found", id, message: e instanceof Error ? e.message : String(e) };
  }
}

/** Reads what the page shows through the same query functions the MCP tools use. Never throws. */
export async function loadLibrary(db: Db | null, params: LibraryParams): Promise<LibraryResult> {
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
    const { scope } = s;
    const { topics, concepts } = await libraryCoverage(deps, scope);
    const plans = await findPlans(deps, scope, {}, PLAN_LIMIT.max);
    const blocks = params.topic === undefined ? null : await findBlocks(deps, scope, { topic: params.topic }, "newest", BLOCK_LIMIT.max);
    return { state: "ok", data: { scopeError, topics, concepts, plans, blocks } };
  } catch (e) {
    return { state: "failed", message: e instanceof Error ? e.message : String(e) };
  }
}
