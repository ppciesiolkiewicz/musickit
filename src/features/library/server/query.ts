import { TOPICS } from "@/features/plan/intake/topics";
import { CONCEPTS, conceptId } from "@/features/plan/model/concepts";
import { LEVEL_ORDER, outcome, type Outcome, type OutcomeInput } from "@/features/plan/model/outcome";
import { localDate } from "@/features/plan/model/schedule";
import type { PlanState } from "@/features/plan/model/types";
import { readAllPlanTimes, readDoc, readEntries } from "@/features/userData/server/data";
import type { UserDataRepo } from "@/features/userData/server/repo";
import type { LibraryRepo } from "./repo";
import type { BlockDetail, BlockFilter, BlockSummary, ConceptCoverage, CoverageRow, PlanDetail, PlanFilter, PlanSummary, Scope } from "./types";

/** What the query functions run on. `rand` and `today` are for tests. */
export interface Deps {
  library: LibraryRepo;
  userData: UserDataRepo;
  /** a number from 0 up to, not including, 1; `Math.random` by default */
  rand?: () => number;
  /** the local date, yyyy-mm-dd; today by default */
  today?: () => string;
}

export const BLOCK_LIMIT = { default: 20, max: 50 } as const;
export const PLAN_LIMIT = { default: 10, max: 30 } as const;

export type FindOrder = "least-used" | "random-least-used" | "newest";

/** A missing limit is the default; anything else is made a whole number from 1 to the max. */
function clamp(limit: number | undefined, l: { default: number; max: number }): number {
  if (limit === undefined || !Number.isFinite(limit)) return l.default;
  return Math.min(l.max, Math.max(1, Math.floor(limit)));
}

export async function findBlocks(d: Deps, scope: Scope, filter: BlockFilter, order: FindOrder = "least-used", limit?: number): Promise<BlockSummary[]> {
  const n = clamp(limit, BLOCK_LIMIT);
  if (order !== "random-least-used") return d.library.listBlocks(scope, filter, order, n);
  const total = await d.library.countBlocks(scope, filter);
  const pool = await d.library.listBlocks(scope, filter, "least-used", Math.max(n, Math.ceil(total / 5)));
  const rand = d.rand ?? Math.random;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export const getBlock = (d: Deps, scope: Scope, id: string): Promise<BlockDetail | null> => d.library.getBlock(scope, id);

export const findPlans = (d: Deps, scope: Scope, filter: PlanFilter, limit?: number): Promise<PlanSummary[]> =>
  d.library.listPlans(scope, filter, clamp(limit, PLAN_LIMIT));

export const getPlan = (d: Deps, scope: Scope, id: string, withReply = false): Promise<PlanDetail | null> => d.library.getPlan(scope, id, withReply);

/** A row for every topic and level and every concept, zeros where the library has none; rows for ids the catalogue lacks come after. An old concept id counts for its track. */
export async function libraryCoverage(d: Deps, scope: Scope): Promise<{ topics: CoverageRow[]; concepts: ConceptCoverage[] }> {
  const got = await d.library.coverage(scope);
  const key = (t: string, l: string) => `${t}\u0000${l}`;
  const byPair = new Map(got.topics.map((r) => [key(r.topic, r.level), r]));
  const topics: CoverageRow[] = [];
  const seen = new Set<string>();
  for (const t of TOPICS) {
    for (const level of LEVEL_ORDER) {
      seen.add(key(t.id, level));
      topics.push(byPair.get(key(t.id, level)) ?? { topic: t.id, level, blocks: 0, plans: 0, times: 0, seconds: 0 });
    }
  }
  topics.push(...got.topics.filter((r) => !seen.has(key(r.topic, r.level))));
  // a block stored before the path names its old concepts: their counts go to the track that took their place
  const byConcept = new Map<string, ConceptCoverage>();
  for (const r of got.concepts) {
    const id = conceptId(r.concept) ?? r.concept;
    const at = byConcept.get(id);
    byConcept.set(id, at ? { concept: id, blocks: at.blocks + r.blocks, plans: Math.max(at.plans, r.plans), times: at.times + r.times, seconds: at.seconds + r.seconds } : { ...r, concept: id });
  }
  const known = new Set(CONCEPTS.map((c) => c.id));
  const concepts: ConceptCoverage[] = CONCEPTS.map((c) => byConcept.get(c.id) ?? { concept: c.id, blocks: 0, plans: 0, times: 0, seconds: 0 });
  concepts.push(...[...byConcept.values()].filter((r) => !known.has(r.concept)));
  return { topics, concepts };
}

/**
 * Where the player in scope stands (the same `outcome()` the progress page uses, built from the player's stored plan document,
 * ratings and timer rows as of today) and the blocks they have had: at most `BLOCK_LIMIT.max` of them, least used first, with
 * `blocksTotal` the number they have had in all. Null without `scope.player`.
 * The page builds its input in the browser from hooks, so the server side is assembled here from the same readers the API uses
 * (broken progress rows dropped, one per exercise).
 */
export async function playerProgress(d: Deps, scope: Scope): Promise<{ outcome: Outcome; blocks: BlockSummary[]; blocksTotal: number } | null> {
  const player = scope.player;
  if (player === undefined) return null;
  const state = (await readDoc(d.userData, player, "plan")) as PlanState;
  const input: OutcomeInput = {
    plans: [state.current, ...state.history].filter((p) => p !== null),
    entries: await readEntries(d.userData, player),
    times: await readAllPlanTimes(d.userData, player),
    answersHistory: state.answersHistory,
  };
  const asOf = (d.today ?? (() => localDate()))();
  return {
    outcome: outcome(input, asOf),
    blocks: await findBlocks(d, scope, { player: "had" }, "least-used", BLOCK_LIMIT.max),
    blocksTotal: await d.library.countBlocks(scope, { player: "had" }),
  };
}
