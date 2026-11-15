import type { BlockDetail, BlockFilter, BlockOrder, BlockSummary, Scope } from "./types";

/**
 * Reads the library. Nothing here writes. A block with several owner rows is listed once. Ties in an order break by id, compared
 * bytewise (JS `<`; `collate "C"` in SQL), so "Zed" comes before "alpha".
 */
export interface LibraryRepo {
  countBlocks(scope: Scope, filter: BlockFilter): Promise<number>;
  listBlocks(scope: Scope, filter: BlockFilter, order: BlockOrder, limit: number): Promise<BlockSummary[]>;
  /** null when the block does not exist or is not visible in the scope */
  getBlock(scope: Scope, id: string): Promise<BlockDetail | null>;
  userExists(id: string): Promise<boolean>;
}
