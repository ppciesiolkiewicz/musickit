import type { Block } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";

/**
 * The library's rows, shaped like the tables in `src/lib/db/schema.ts` (same fields, same meanings), so the same data can be
 * loaded into memory or into Postgres. `spent` and `blocks` are the JSON the table holds, so a bad row can be stored.
 */
export interface LibraryData {
  users: { id: string }[];
  blocks: {
    id: string; content: Block; area: string | null; topic: string | null; concepts: string[]; level: string | null; tags: string[];
    parentId: string | null; model: string | null; promptVersion: number | null; docsAgents: number | null; docsTeaching: number | null; createdAt: Date;
  }[];
  /** `userId` null is the app */
  owners: { userId: string | null; blockId: string; source: "ai" | "edit" | "seed" | "example"; enabledForReuse: boolean; createdAt: Date }[];
  progress: { userId: string; exerciseId: string; entry: ProgressEntry; blockId: string | null }[];
  dayTimes: { userId: string; planId: string; day: number; elapsed: number; spent: unknown; blocks: unknown }[];
  plans: {
    id: string; title: string; answers: unknown; model: string; reply: string; source: string; promptVersion: number | null;
    docsAgents: number | null; docsTeaching: number | null; enabledForReuse: boolean; createdAt: Date;
  }[];
  planBlocks: { planId: string; day: number; place: number; blockId: string; minutes: number }[];
  reviews: { userId: string; planId: string; libraryPlanId: string | null; title: string; stars: number; why: string | null; at: Date }[];
}

export const PLAYER_A = "a0000000-0000-4000-8000-00000000000a";
export const PLAYER_B = "b0000000-0000-4000-8000-00000000000b";

const block = (id: string, createdAt: string, extra: Partial<LibraryData["blocks"][number]> = {}): LibraryData["blocks"][number] => ({
  id, content: { title: `Block ${id}`, cells: [] }, area: "guitar", topic: "guitar-scales", concepts: [], level: null, tags: [], parentId: null,
  model: null, promptVersion: null, docsAgents: null, docsTeaching: null, createdAt: new Date(createdAt), ...extra,
});
const owner = (userId: string | null, blockId: string, enabledForReuse: boolean, source: LibraryData["owners"][number]["source"]): LibraryData["owners"][number] =>
  ({ userId, blockId, source, enabledForReuse, createdAt: new Date("2026-01-01T00:00:00Z") });
const entry = (userId: string, exerciseId: string, blockId: string, stars: ProgressEntry["stars"], at: string): LibraryData["progress"][number] => ({
  userId, exerciseId, blockId,
  entry: { id: `${userId}-${exerciseId}`, planId: "p-1", exerciseId, day: 0, exercise: 0, title: "t", blockId, stars, at },
});

/**
 * Two players (A, B) and the app. S1 and S2 are seed blocks enabled for reuse; X is an example block, app-owned and not enabled; PA
 * is A's private edit; R is a block A and B both own and both rated (A 3 stars, then 5 stars later in another slot; B 2 stars), not
 * enabled. A also owns S2 and rated it 2 stars. Timer rows: A and B on S1, plus two bad rows (`blocks` null; a non-number in `spent`).
 */
export function baseFixture(): LibraryData {
  return {
    users: [{ id: PLAYER_A }, { id: PLAYER_B }],
    blocks: [
      block("S1", "2026-01-01T00:00:00Z", { level: "beginner", concepts: ["major-scale", "pentatonic"], tags: ["warmup", "slow"], model: "m1", promptVersion: 3, docsAgents: 2, docsTeaching: 2 }),
      block("S2", "2026-01-02T00:00:00Z", { level: "intermediate", concepts: ["pentatonic"], tags: ["warmup"], model: "m2", promptVersion: 4, docsAgents: 2, docsTeaching: 3 }),
      block("X", "2026-01-03T00:00:00Z", { level: "beginner", topic: "ear", area: "ear", concepts: ["intervals"], tags: ["ear"] }),
      block("PA", "2026-01-04T00:00:00Z", { level: "beginner", parentId: "S1", model: "m1" }),
      block("R", "2026-01-05T00:00:00Z", { topic: "rhythm", area: "rhythm", level: "beginner", tags: ["slow"] }),
    ],
    owners: [
      owner(null, "S1", true, "seed"), owner(null, "S2", true, "seed"), owner(null, "X", false, "example"),
      owner(PLAYER_A, "PA", false, "edit"), owner(PLAYER_A, "R", false, "ai"), owner(PLAYER_B, "R", false, "ai"), owner(PLAYER_A, "S2", false, "ai"),
    ],
    progress: [
      entry(PLAYER_A, "e-r1", "R", 3, "2026-03-01T10:00:00.000Z"),
      entry(PLAYER_A, "e-r2", "R", 5, "2026-03-05T10:00:00.000Z"),
      entry(PLAYER_B, "e-r1", "R", 2, "2026-03-03T10:00:00.000Z"),
      entry(PLAYER_A, "e-s2", "S2", 2, "2026-03-02T10:00:00.000Z"),
    ],
    dayTimes: [
      { userId: PLAYER_A, planId: "p-1", day: 0, elapsed: 600, spent: { e1: 600 }, blocks: { e1: "S1" } },
      { userId: PLAYER_B, planId: "p-2", day: 0, elapsed: 300, spent: { e1: 300 }, blocks: { e1: "S1" } },
      { userId: PLAYER_A, planId: "p-bad-1", day: 0, elapsed: 500, spent: { e1: 500 }, blocks: null },
      { userId: PLAYER_B, planId: "p-bad-2", day: 0, elapsed: 500, spent: { e1: "lots" }, blocks: { e1: "S1" } },
    ],
    plans: [],
    planBlocks: [],
    reviews: [],
  };
}
