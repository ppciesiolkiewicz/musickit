import type { Moves } from "@/features/plan/model/moves";
import type { Block } from "@/features/plan/model/types";
import type { Stars } from "@/features/progress/stars";
import type { BlockSlot, Provenance } from "@/features/userData/server/repo";

export type { BlockSlot };

/** Who is asking and what they may see. Built by the server code that calls the library, never taken from a model. */
export interface Scope {
  /** the player in scope: their own blocks are visible, and `mine` and the `player` filter are about them */
  player?: string;
  /** when set, plan queries see only these plan ids */
  planIds?: string[];
  /**
   * Dev only. Also: inactive choices (and a curated block with no active choice), the hashed blocks the app owns (old examples
   * and AI rows), and plans not enabled for reuse. Never another player's private block.
   */
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

/** One choice of a curated block: one way to play it, on its own level, steps, moves (null: none) and minutes. */
export interface BlockChoice { id: string; name: string; level: string | null; steps: string[]; moves: Moves | null; minutes: number; active: boolean }

export interface BlockSummary {
  id: string;
  title: string;
  area: string | null;
  topic: string | null;
  concepts: string[];
  /** a hashed block's own; a curated block's first listed choice's (by place), null when none is listed */
  level: string | null;
  /** the path steps it practises ("trackId:n"): a hashed block's own (empty when written before steps), a curated block's listed choices' together */
  steps: string[];
  /** a curated block's choices by place: the active ones (with `includeNotEnabled`, the inactive ones too); [] for a hashed block */
  choices: BlockChoice[];
  tags: string[];
  provenance: Provenance;
  use: BlockUse;
  /** only with `scope.player` */
  mine?: PlayerBlock;
}

export interface BlockDetail extends BlockSummary {
  content: Block;
  parentId: string | null;
  /** the minutes, why and lessons the block stands in a plan with; null for a block stored without them */
  slot: BlockSlot | null;
}

/** One active choice of a curated block, as the composer may pick it: the block's content and fields with the choice's level, steps, minutes and moves. */
export interface ComposeBlock {
  /** the block's id */
  id: string;
  /** the choice's id, `<blockId>/<name>` */
  choiceId: string;
  /** the block's content, with the choice's `moves` (absent when the choice has none) */
  content: Block;
  area: string;
  topic: string | null;
  concepts: string[];
  /** at least one, except on a warm-up (`content.kind`), which names none: any other block that names no step is never composed */
  steps: string[];
  level: string | null;
  tags: string[];
  slot: BlockSlot;
  /** all players together, on the block (every choice of it), counted for these blocks only */
  use: { times: number; seconds: number };
  /** this player's newest rating of this choice (by `at`, from the rows with its `choice_id`); null when never rated. `ratedAt` is "" for an entry with no `at`. */
  mine: { stars: Stars; ratedAt: string } | null;
}

/** `unused`: visible and not owned by the player. `had`: owned. `repeat`: owned and last rated 1 to 3 stars. */
export type PlayerMode = "unused" | "had" | "repeat";
export type BlockOrder = "least-used" | "newest";

/**
 * `concepts` and `steps` match a block with any of them, `tags` a block with all of them, the rest are equal. `level` and `steps`
 * match a curated block through its listed choices (one choice with that level, or naming any of the steps).
 */
export interface BlockFilter {
  area?: string;
  topic?: string;
  concepts?: string[];
  level?: string;
  steps?: string[];
  tags?: string[];
  model?: string;
  promptVersion?: number;
  docsAgents?: number;
  docsTeaching?: number;
  player?: PlayerMode;
}

/** An id (a topic or a concept) with how many distinct blocks of a plan carry it. */
export interface Count { id: string; count: number }

export interface PlanSummary {
  id: string;
  title: string;
  answers: unknown;
  provenance: Provenance;
  /** distinct days in the plan's block rows */
  days: number;
  /** the minutes of all the plan's block rows added */
  minutes: number;
  /** distinct blocks in the plan's block rows */
  blocks: number;
  /** by count, highest first, then id */
  topics: Count[];
  concepts: Count[];
  /** only with `scope.player`: the share of the plan's distinct blocks the player owns (0 when the plan has none), else null */
  hadShare: number | null;
}

export interface PlanDetail extends PlanSummary {
  /** by day, then place */
  schedule: { day: number; place: number; blockId: string; title: string; minutes: number }[];
  /** only when asked for */
  reply?: string;
}

/** `areas` matches a plan whose `answers.areas` has any of them; `levels` a plan with a block at any of them; `topics` a plan with blocks for every one of them. */
export interface PlanFilter {
  areas?: string[];
  levels?: string[];
  topics?: string[];
  model?: string;
  promptVersion?: number;
  docsAgents?: number;
  docsTeaching?: number;
}

/**
 * Only pairs with at least one visible block. `blocks` counts a hashed block once and a curated block once per listed choice at that
 * level; `times` and `seconds` add each block once. `plans`: visible plans with a row of that topic and level (a row's level is its
 * choice's when it names one, else its block's).
 */
export interface CoverageRow { topic: string; level: string; blocks: number; plans: number; times: number; seconds: number }
/** Only concepts with at least one visible block. `plans`: visible plans with a block of that concept. */
export interface ConceptCoverage { concept: string; blocks: number; plans: number; times: number; seconds: number }
/** Only steps with at least one visible block. `blocks` counts as in `CoverageRow` (a curated block once per listed choice naming the step). `plans`: visible plans with a row of that step (its choice's steps, else its block's). */
export interface StepCoverage { step: string; blocks: number; plans: number; times: number; seconds: number }
