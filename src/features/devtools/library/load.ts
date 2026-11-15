import { findBlocks, findPlans, libraryCoverage, BLOCK_LIMIT, PLAN_LIMIT, type Deps } from "@/features/library/server/query";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import type { BlockSummary, ConceptCoverage, CoverageRow, PlanSummary } from "@/features/library/server/types";
import { devScope } from "@/features/library/server/mcp";
import { drizzleUserDataRepo } from "@/features/userData/server/repo.drizzle";
import type { Db } from "@/lib/db/client";
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

/** Reads what the page shows through the same query functions the MCP tools use. Never throws. */
export async function loadLibrary(db: Db | null, params: LibraryParams): Promise<LibraryResult> {
  if (!db) return { state: "no-database" };
  try {
    const deps: Deps = { library: drizzleLibraryRepo(db), userData: drizzleUserDataRepo(db) };
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
