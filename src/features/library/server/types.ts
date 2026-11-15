import type { Block } from "@/features/plan/model/types";
import type { Stars } from "@/features/progress/stars";
import type { Provenance } from "@/features/userData/server/repo";

/** Who is asking and what they may see. Built by the server code that calls the library, never taken from a model. */
export interface Scope {
  /** the player in scope: their own blocks are visible, and `mine` and the `player` filter are about them */
  player?: string;
  /** when set, plan queries see only these plan ids */
  planIds?: string[];
  /** also the app's blocks and plans that are not enabled for reuse (never another player's private block) */
  includeNotEnabled?: boolean;
}

/** What a block has been used for by all players together: only totals, never who. */
export interface BlockUse {
  times: number;
  seconds: number;
  rated: number;
  /** how many ratings gave 1, 2, 3, 4 and 5 stars */
  stars: [number, number, number, number, number];
}

/** The player in scope with one block: their latest rating, and their own timer totals. */
export interface PlayerBlock { stars: Stars | null; ratedAt: string | null; times: number; seconds: number }

export interface BlockSummary {
  id: string;
  title: string;
  area: string | null;
  topic: string | null;
  concepts: string[];
  level: string | null;
  tags: string[];
  provenance: Provenance;
  use: BlockUse;
  /** only with `scope.player` */
  mine?: PlayerBlock;
}

export interface BlockDetail extends BlockSummary { content: Block; parentId: string | null }

/** `unused`: reusable and not owned by the player. `had`: owned. `repeat`: owned and last rated 1 to 3 stars. */
export type PlayerMode = "unused" | "had" | "repeat";
export type BlockOrder = "least-used" | "newest";

/** `concepts` matches a block with any of them, `tags` a block with all of them, the rest are equal. */
export interface BlockFilter {
  area?: string;
  topic?: string;
  concepts?: string[];
  level?: string;
  tags?: string[];
  model?: string;
  promptVersion?: number;
  docsAgents?: number;
  docsTeaching?: number;
  player?: PlayerMode;
}
