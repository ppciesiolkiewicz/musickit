import type { BlockDetail, BlockFilter, BlockOrder, BlockSummary, Scope } from "./types";

/** Reads the library. Nothing here writes. */
export interface LibraryRepo {
  countBlocks(scope: Scope, filter: BlockFilter): Promise<number>;
  listBlocks(scope: Scope, filter: BlockFilter, order: BlockOrder, limit: number): Promise<BlockSummary[]>;
  /** null when the block does not exist or is not visible in the scope */
  getBlock(scope: Scope, id: string): Promise<BlockDetail | null>;
  userExists(id: string): Promise<boolean>;
}
