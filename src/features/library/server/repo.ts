import type { BlockDetail, ComposeBlock, BlockFilter, BlockOrder, BlockSummary, ConceptCoverage, CoverageRow, Scope, StepCoverage } from "./types";

/**
 * Reads the library. Nothing here writes. A block with several owner rows is listed once. Ties in an order break by id, compared
 * bytewise (JS `<`; `collate "C"` in SQL), so "Zed" comes before "alpha". The player's latest rating
 * (`mine`, `player: "repeat"`) is the one with the latest string `at`, bytewise; one without an `at` is older than any dated one,
 * and a tie goes to the lower exercise id. A timer slot counts only when `blocks` maps it to a string block id. A block whose
 * content has no string title has the title "".
 *
 * A block is visible to the player who owns it. A curated block (the seed's) is visible to everyone while one of its choices is
 * active, and with `includeNotEnabled` always; a hashed block is its owners' only, and with `includeNotEnabled` also visible when
 * the app owns it (an old example or AI row). Another player's hashed block is never visible. A curated block lists its active
 * choices (all, with `includeNotEnabled`); its `level`, `steps`, the `level` and `steps` filters and `coverage` go by the choices
 * it lists.
 *
 * `coverage` counts only blocks visible under the scope (blocks, times and seconds), and a pair, concept or step with no visible
 * block is left out.
 */
export interface LibraryRepo {
  countBlocks(scope: Scope, filter: BlockFilter): Promise<number>;
  listBlocks(scope: Scope, filter: BlockFilter, order: BlockOrder, limit: number): Promise<BlockSummary[]>;
  /** null when the block does not exist or is not visible in the scope */
  getBlock(scope: Scope, id: string): Promise<BlockDetail | null>;
  /** by topic then level, by concept and by step, all bytewise; no zero rows */
  coverage(scope: Scope): Promise<{ topics: CoverageRow[]; concepts: ConceptCoverage[]; steps: StepCoverage[] }>;
  /**
   * What a day's plan can be made from: one item per active choice that names at least one step, of a curated block in one of
   * `areas`. A hashed block is never here. `use` counts every player's timer on the block (all its choices together); `mine` is
   * `player`'s latest rating (the rule of `mine` above) among the rows with that choice's id, null when there is none. By block id
   * (bytewise), then the choice's place; no limit.
   */
  composeBlocks(player: string, areas: string[]): Promise<ComposeBlock[]>;
  userExists(id: string): Promise<boolean>;
}
