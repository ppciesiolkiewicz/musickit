import type { BlockDetail, BlockFilter, BlockOrder, BlockSummary, ConceptCoverage, CoverageRow, PlanDetail, PlanFilter, PlanSummary, Scope } from "./types";

/**
 * Reads the library. Nothing here writes. A block with several owner rows is listed once. Ties in an order break by id, compared
 * bytewise (JS `<`; `collate "C"` in SQL), so "Zed" comes before "alpha". The same holds for plan ids. The player's latest rating
 * (`mine`, `player: "repeat"`) is the one with the latest string `at`, bytewise; one without an `at` is older than any dated one,
 * and a tie goes to the lower exercise id. A timer slot counts only when `blocks` maps it to a string block id. A block whose
 * content has no string title has the title "".
 *
 * Blocks and plans are gated apart. A plan is visible when it is enabled for reuse or the scope has `includeNotEnabled`, and
 * `scope.planIds` narrows plans to those ids. A plan's `schedule` rows, `blocks`, `days`, `minutes`, `topics`, `concepts`, its
 * filters (`levels`, `topics`) and its `hadShare` come from its rows in `practice_plan_blocks` whether or not each block is itself
 * visible to the caller: library plans hold app-owned blocks, and the plan's own visibility is the gate. Only a schedule row's
 * `title` follows the block's own gate: "" when the caller cannot see the block. `coverage` is the opposite for blocks:
 * its block counts, times and seconds count only blocks visible under the scope, and a pair or concept with no visible block is left
 * out. Its `plans` counts visible plans that hold at least one block of the pair (or concept) in their rows, whether or not that block is visible to the caller; a pair with no visible block has no row at all.
 */
export interface LibraryRepo {
  countBlocks(scope: Scope, filter: BlockFilter): Promise<number>;
  listBlocks(scope: Scope, filter: BlockFilter, order: BlockOrder, limit: number): Promise<BlockSummary[]>;
  /** null when the block does not exist or is not visible in the scope */
  getBlock(scope: Scope, id: string): Promise<BlockDetail | null>;
  /** at most `limit` visible plans matching the filter, by id */
  listPlans(scope: Scope, filter: PlanFilter, limit: number): Promise<PlanSummary[]>;
  /**
   * null when the plan does not exist or is not visible; `reply` is included only when `withReply`. A schedule row whose block is
   * not visible under the scope (the rule `getBlock` uses) has the title ""; its block id and minutes, and the plan's counts, stay.
   */
  getPlan(scope: Scope, id: string, withReply: boolean): Promise<PlanDetail | null>;
  /** by topic then level, and by concept, both bytewise; no zero rows */
  coverage(scope: Scope): Promise<{ topics: CoverageRow[]; concepts: ConceptCoverage[] }>;
  userExists(id: string): Promise<boolean>;
}
