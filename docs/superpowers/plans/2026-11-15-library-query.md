# Library Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record which model and rule version wrote every block and library plan, and let agents and devtools query blocks and plans through local MCP tools, with the server setting the bounds.

**Architecture:** Provenance columns on `blocks` and `practice_plans`, and a `practice_plan_blocks` table, filled by the seed. A new feature, `src/features/library/server`, with its own `LibraryRepo` (Postgres and memory, held together by one shared contract test), thin query functions that take a server-built `Scope`, tool definitions over them, and a hand-written JSON-RPC handler served at `/api/dev/mcp`. A bare `/dev/library` page calls the same functions.

**Tech Stack:** Next 16 (read `node_modules/next/dist/docs/` before writing a route or page), Drizzle + postgres-js, `tsx --test`, no new dependency.

**Spec:** `docs/superpowers/specs/2026-11-15-library-query-design.md`

## Global Constraints

- Read `AGENTS.md`, `src/features/userData` README/CLAUDE and `src/features/devtools/README.md` first; keep READMEs true in the same commit as the change.
- The tools only read. Nothing in `src/features/library` inserts, updates or deletes.
- A block is returned only when an owner row has `enabled_for_reuse`, or the player in scope owns it, or it is app-owned (`user_id` null) and the scope has `includeNotEnabled`. A plan only when `enabled_for_reuse`, or `includeNotEnabled`. With `scope.planIds` set, plan queries see only those ids.
- Other players appear only as totals. No function returns another player's id or a single rating of theirs.
- Stars never order or filter blocks, except the player's own latest stars for `player: "repeat"`.
- The scope is built by the server code that calls the module, never passed through from a model. Only the local dev route reads `player` and `include_not_enabled` from tool arguments.
- `/api/dev/mcp` and `/dev/library` answer 404 in production (`devGate()`, the `/dev` layout).
- Blocks stay insert-only for content and tags. Provenance is the one thing filled later, and only where all four provenance columns are null.
- No migration, seed or test script runs against a database that is not local: check the host of `DATABASE_URL` first (`.env.local` may point at Supabase). Never reset data without asking the user.
- Dev pages show bare tables, no charts; plain labels, no copy skill needed.
- Commits: never `git add` in the main checkout (other sessions share the index); commit with a temporary `GIT_INDEX_FILE`. Run `tsx` from the npm cache, not `npx tsx`.
- Before calling a task done: the feature's tests, `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on changed files.

## Review Focus

1. **Tool arguments a model gets wrong** (`limit: 10000`, an unknown `order`, `concepts` as a string, an unknown tool): a clear error result or a clamp, never a 500 or an unbounded query. Test in Task 6.
2. **A dev `player` that is not a UUID or not a user**: an error result naming the argument, not a Postgres exception. Test in Task 6.
3. **Old timer rows**: `plan_day_times.blocks` null, or `spent` values that are not numbers: left out of the totals, no crash. Test in Task 3 (contract).
4. **A library plan whose reply no longer parses**: it has no plan-blocks rows; `find_plans` still lists it with 0 days and `get_plan` answers without throwing. Test in Tasks 2 and 4.
5. **An empty library, or a topic that isn't in the catalogue**: empty lists; coverage still lists every catalogue topic with zeros. Test in Task 4.

---

### Task 1: Provenance columns, the plan-blocks table, and the repo's provenance rule

**Files:**
- Modify: `src/lib/db/schema.ts`, `drizzle/` (generated), `docs/db/*` (`npm run db:diagram`)
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`
- Test: `src/features/userData/server/data.test.ts` (or a new `provenance.test.ts` beside it)

**Interfaces:**
- Produces, in `repo.ts`:
  ```ts
  export interface Provenance { model: string | null; promptVersion: number | null; docsAgents: number | null; docsTeaching: number | null }
  export interface NewBlock { /* as today */ provenance?: Provenance }
  export interface PlanBlockRow { day: number; place: number; blockId: string; minutes: number }
  // on UserDataRepo:
  setPlanBlocks(planId: string, rows: PlanBlockRow[]): Promise<void>; // replaces that plan's rows, one transaction
  ```
- Columns: `blocks.model text`, `blocks.prompt_version int`, `blocks.docs_agents int`, `blocks.docs_teaching int` (all nullable); the three version columns on `practice_plans`; table `practice_plan_blocks (plan_id → practice_plans on delete cascade, day int, place int, block_id → blocks, minutes int not null, primary key (plan_id, day, place), index on block_id)`.

- [ ] **Step 1: Check the migration tree is free.** Run `git status --short drizzle`. If `0017_lower_prices_reuse_first.sql` or `meta/_journal.json` is still uncommitted (another session's work), stop and ask the user; do not generate on top of it or commit its files.
- [ ] **Step 2: Write failing tests** on `memoryUserDataRepo()`:
  - `addBlocks` with `provenance` stores it; a second `addBlocks` of the same id with other provenance leaves the first.
  - a block stored with no provenance gets it from a later `addBlocks` that has one (the fill); a block with only `model` set is not touched.
  - a block with `parentId` and no provenance takes its parent's provenance when the parent is stored.
  - `setPlanBlocks("p", rows)` twice leaves only the second list.
- [ ] **Step 3: Run** `tsx --test src/features/userData/server/*.test.ts`. Expected: the new tests fail.
- [ ] **Step 4: Schema.** Add the columns and table; `npm run db:generate`; confirm the SQL only adds columns and one table.
- [ ] **Step 5: Implement** in both repos. In Drizzle `addBlocks`, inside the same transaction and after the inserts: one `update blocks … where id in (…) and model is null and prompt_version is null and docs_agents is null and docs_teaching is null` per distinct provenance, then one update copying the four columns from the parent for listed blocks that have a parent and are still all null.
- [ ] **Step 6: Run** the tests (pass), tsc, eslint. With a local `DATABASE_URL` only: `npm run db:migrate`, `npm run db:diagram`.
- [ ] **Step 7: Commit** `feat(db): model and version on blocks and library plans, plan blocks table`.

### Task 2: The seed fills provenance and plan blocks

**Files:**
- Modify: `src/features/userData/server/seedBlocks.ts`, `seedBlocks.test.ts`, `scripts/db-seed-blocks.ts`, `scripts/db-seed-plans.ts`, `src/features/devtools/model/library.ts`
- Modify: `src/features/userData/README.md` (or where the seed is described)

**Interfaces:**
- Consumes: `Provenance`, `PlanBlockRow`, `setPlanBlocks` (Task 1).
- Produces:
  ```ts
  export interface SeedPlan { id: string; reply: string; provenance: Provenance }
  export function libraryPlanBlocks(plans: SeedPlan[]): NewBlock[];                      // each block carries its plan's provenance
  export function planBlockRows(reply: string): PlanBlockRow[];                           // [] when the reply doesn't parse
  export async function seedBlocks(repo: UserDataRepo, plans: SeedPlan[], now: Date): Promise<{ library: number; examples: number; planBlocks: number }>;
  ```
  `LibraryRow` gains `promptVersion`, `docsAgents`, `docsTeaching` (all `number | null`).

- [ ] **Step 1: Failing tests:**
  - a seeded plan's blocks carry `{ model: plan.model, promptVersion: plan.promptVersion, … }`.
  - an example block carries the example's `model` and `{ docsAgents: docs.agents, docsTeaching: docs.teaching }`, `promptVersion: null`.
  - `planBlockRows(reply)` gives one row per exercise with `day` and `place` from 0, the exercise's `minutes`, and the same block id `libraryBlocksOf` gives; a reply that doesn't parse gives `[]` (Review Focus 4).
  - a block in two plans keeps the first plan's provenance.
- [ ] **Step 2: Run, see them fail.**
- [ ] **Step 3: Implement.** `seedBlocks` calls `setPlanBlocks` per plan after `addBlocks`. `libraryRows` sets the versions: the published compare-models plans hold no prompt version, so look at `ModelPlan` and `tools/prompt-history`; if a run records one use it, else `null` for all three. `db-seed-plans` writes the new columns in its insert and its `onConflictDoUpdate`; `db-seed-blocks` selects `id, reply, model` and the versions and prints the plan-block count.
- [ ] **Step 4: Run** tests, tsc, eslint. With a local database: `npm run -s db:seed-plans && npm run -s db:seed-blocks` twice; the second run reports the same counts and `select count(*) from blocks where model is null and id in (select block_id from practice_plan_blocks)` is 0.
- [ ] **Step 5: Commit** `feat(db): seed records each block's model and version, and each plan's blocks`.

### Task 3: The library repo for blocks (types, memory, contract)

**Files:**
- Create: `src/features/library/server/types.ts`, `repo.ts`, `repo.memory.ts`, `repoContract.ts`, `repo.memory.test.ts`, `fixture.ts`
- Create: `src/features/library/README.md`
- Modify: `package.json` (`test`: add `src/features/library/server/*.test.ts`)

**Interfaces:**
- Produces, in `types.ts`:
  ```ts
  export interface Scope { player?: string; planIds?: string[]; includeNotEnabled?: boolean }
  export interface BlockUse { times: number; seconds: number; rated: number; stars: [number, number, number, number, number] }
  export interface PlayerBlock { stars: Stars | null; ratedAt: string | null; times: number; seconds: number }
  export interface BlockSummary { id: string; title: string; area: string | null; topic: string | null; concepts: string[]; level: string | null; tags: string[]; provenance: Provenance; use: BlockUse; mine?: PlayerBlock }
  export interface BlockDetail extends BlockSummary { content: Block; parentId: string | null }
  export type PlayerMode = "unused" | "had" | "repeat";
  export type BlockOrder = "least-used" | "newest";
  export interface BlockFilter { area?: string; topic?: string; concepts?: string[]; level?: string; tags?: string[]; model?: string; promptVersion?: number; docsAgents?: number; docsTeaching?: number; player?: PlayerMode }
  ```
  in `repo.ts`:
  ```ts
  export interface LibraryRepo {
    countBlocks(scope: Scope, filter: BlockFilter): Promise<number>;
    listBlocks(scope: Scope, filter: BlockFilter, order: BlockOrder, limit: number): Promise<BlockSummary[]>;
    getBlock(scope: Scope, id: string): Promise<BlockDetail | null>;
    userExists(id: string): Promise<boolean>;
  }
  ```
  in `fixture.ts`: `interface LibraryData { users, blocks, owners, progress, dayTimes, plans, planBlocks, reviews }` (plain rows shaped like the tables) and `baseFixture(): LibraryData`; `memoryLibraryRepo(data: LibraryData): LibraryRepo`; in `repoContract.ts`: `export function libraryRepoContract(make: (data: LibraryData) => Promise<LibraryRepo>): void` registering `node:test` tests.
- Meanings the contract pins:
  - `concepts` matches a block with any of them; `tags` a block with all of them; the rest are equality.
  - `use.times`: `plan_day_times` rows (all players) whose `blocks` map names the block for a slot with seconds > 0 in `spent`. `use.seconds`: the sum of those seconds. `use.rated` and `use.stars`: `progress_entries` rows with that `block_id`, by `entry.stars`.
  - `mine` only with `scope.player`: latest rating by `entry.at`, and the player's own times and seconds.
  - a player "had" a block: they have a `block_owners` row. `unused`: reusable and not had. `had`: had. `repeat`: had and latest stars 1 to 3. A `player` filter without `scope.player` matches nothing.
  - `least-used`: `use.seconds` asc, then `use.times` asc, then id. `newest`: `created_at` desc, then id.

- [ ] **Step 1: Write the fixture and the contract tests.** The fixture needs two players (A, B) and the app: an enabled seed block S1 (topic `guitar-scales`, beginner) and S2 (same topic, intermediate), an example block X (app-owned, not enabled), A's private edited block PA, a block both players have rated (A 3★ then 5★ later in another slot; B 2★), timer rows for A and B on S1, one timer row with `blocks: null` and one with a non-number in `spent`. Tests:
  - visibility: no scope → S1, S2 only; `player: A` → adds PA; `player: B` never sees PA; `includeNotEnabled` adds X and never PA.
  - `getBlock` of PA with `player: B` is null.
  - each filter; `concepts` any-of; `tags` all-of.
  - `use` totals add both players; `mine` is A's only and uses the later rating.
  - `unused` / `had` / `repeat` for A; a `player` filter with no `scope.player` → `[]`.
  - both orders; `limit` respected; `countBlocks` equals the unlimited list length.
  - Review Focus 3: the two bad timer rows change no total and throw nothing.
- [ ] **Step 2: Run** `tsx --test src/features/library/server/*.test.ts`. Expected: fail (no repo).
- [ ] **Step 3: Implement** `memoryLibraryRepo` (plain filters over `LibraryData`; it is the readable statement of the rules).
- [ ] **Step 4: Run** (pass), tsc, eslint. Write the README: what the feature is, the scope rule, the files.
- [ ] **Step 5: Commit** `feat(library): block queries with scope, use totals and a player's history (memory repo, contract)`.

### Task 4: Plans and coverage in the repo

**Files:**
- Modify: `src/features/library/server/types.ts`, `repo.ts`, `repo.memory.ts`, `repoContract.ts`, `fixture.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Count { id: string; count: number }
  export interface PlanSummary { id: string; title: string; answers: unknown; provenance: Provenance; days: number; minutes: number; blocks: number; topics: Count[]; concepts: Count[]; reviews: { count: number; mean: number | null }; hadShare: number | null }
  export interface PlanDetail extends PlanSummary { schedule: { day: number; place: number; blockId: string; title: string; minutes: number }[]; reply?: string }
  export interface PlanFilter { areas?: string[]; levels?: string[]; topics?: string[]; model?: string; promptVersion?: number; docsAgents?: number; docsTeaching?: number }
  export interface CoverageRow { topic: string; level: string; blocks: number; plans: number; times: number; seconds: number }
  export interface ConceptCoverage { concept: string; blocks: number; plans: number; times: number; seconds: number }
  // on LibraryRepo:
  listPlans(scope: Scope, filter: PlanFilter, limit: number): Promise<PlanSummary[]>;
  getPlan(scope: Scope, id: string, withReply: boolean): Promise<PlanDetail | null>;
  coverage(scope: Scope): Promise<{ topics: CoverageRow[]; concepts: ConceptCoverage[] }>;
  ```
- Meanings: `areas` matches `answers.areas` containing any; `levels` and `topics` match a plan having at least one block with that level / every listed topic. `days` is the number of distinct days in `practice_plan_blocks`, `blocks` the distinct block ids. `reviews` from `plan_reviews.library_plan_id`. `hadShare`: with `scope.player`, owned distinct blocks ÷ distinct blocks (0 when the plan has none), else null. Plans ordered by id. `coverage` counts visible blocks and plans only and returns only pairs that have at least one (the query layer fills the zeros, Task 6).

- [ ] **Step 1: Extend the fixture** (two enabled plans, one not enabled, one enabled plan with no plan-blocks rows, two reviews) **and the contract:**
  - visibility: not-enabled plan only with `includeNotEnabled`; `scope.planIds` narrows `listPlans` and makes `getPlan` of another id null, even with `includeNotEnabled`.
  - each filter; `days`, `minutes`, `topics`, `concepts` counts; `reviews` mean; `hadShare` for A, null without a player.
  - Review Focus 4: the plan with no rows lists with `days: 0`, `hadShare: 0`; `getPlan` returns an empty `schedule`.
  - `getPlan(…, false)` has no `reply`; `true` has it.
  - `coverage` counts S1/S2 under their topic and level, leaves out PA and X without the flag, and its `seconds` equal the block totals.
  - Review Focus 5: on an empty `LibraryData`, every list is `[]` and coverage is empty.
- [ ] **Step 2: Run, see them fail. Step 3: Implement in the memory repo. Step 4: Run** (pass), tsc, eslint.
- [ ] **Step 5: Commit** `feat(library): plan queries and coverage`.

### Task 5: The Postgres repo, held to the same contract

**Files:**
- Create: `src/features/library/server/repo.drizzle.ts`, `scripts/test-library-db.ts`
- Modify: `package.json` (`"test:library-db"`), `src/features/library/README.md`

**Interfaces:**
- Consumes: `LibraryRepo`, `libraryRepoContract`, `LibraryData` (Tasks 3, 4).
- Produces: `export function drizzleLibraryRepo(db: Db): LibraryRepo`.

- [ ] **Step 1: Write `scripts/test-library-db.ts`.** It reads `LIBRARY_TEST_DATABASE_URL`, and exits with a message unless its host is `localhost` or `127.0.0.1` and its database name ends in `_test`. It drops and creates that database's `public` schema, runs the migrations (`scripts/db-migrate.mjs` with `DATABASE_URL` set to it), and calls `libraryRepoContract(async (data) => { truncate all; insert data; return drizzleLibraryRepo(db) })`. `test:library-db` runs it with `tsx --test`. It is not part of `npm test`.
- [ ] **Step 2: Run it** against the local Docker server (`docker start musickit-db`; create `musickit_test` once). Expected: every contract test fails with "not implemented".
- [ ] **Step 3: Implement the SQL.** One visibility predicate helper used by every query (`exists` on `block_owners`: enabled, or `user_id = player`, or `user_id is null` with the flag). Use totals from two subqueries: `plan_day_times` expanded with `jsonb_each(blocks)` joined to `spent ->> slot`, counting only values where `jsonb_typeof(spent -> slot) = 'number'` and > 0; `progress_entries` grouped by `block_id` and `(entry ->> 'stars')::int`. The player's latest rating with `distinct on (block_id) … order by block_id, entry ->> 'at' desc`. Cast nothing from caller text into SQL: every value is a bound parameter.
- [ ] **Step 4: Run** `npm run -s test:library-db` (all pass), `npm test` (memory still passes), tsc, eslint.
- [ ] **Step 5: Commit** `feat(library): Postgres queries, tested against a local database`.

### Task 6: The query functions and the tools

**Files:**
- Create: `src/features/library/server/query.ts`, `query.test.ts`, `tools.ts`, `tools.test.ts`

**Interfaces:**
- Consumes: `LibraryRepo`; `UserDataRepo` (`getDoc`, `listProgress`, `listAllPlanTimes`); `outcome`, `OutcomeInput` (`features/plan/model/outcome.ts`); `TOPICS`, `CONCEPTS`.
- Produces, in `query.ts`:
  ```ts
  export interface Deps { library: LibraryRepo; userData: UserDataRepo; rand?: () => number; today?: () => string }
  export const BLOCK_LIMIT = { default: 20, max: 50 } as const;
  export const PLAN_LIMIT = { default: 10, max: 30 } as const;
  export type FindOrder = "least-used" | "random-least-used" | "newest";
  export function findBlocks(d: Deps, scope: Scope, filter: BlockFilter, order?: FindOrder, limit?: number): Promise<BlockSummary[]>;
  export function getBlock(d: Deps, scope: Scope, id: string): Promise<BlockDetail | null>;
  export function findPlans(d: Deps, scope: Scope, filter: PlanFilter, limit?: number): Promise<PlanSummary[]>;
  export function getPlan(d: Deps, scope: Scope, id: string, withReply?: boolean): Promise<PlanDetail | null>;
  export function libraryCoverage(d: Deps, scope: Scope): Promise<{ topics: CoverageRow[]; concepts: ConceptCoverage[] }>;
  export function playerProgress(d: Deps, scope: Scope): Promise<{ outcome: Outcome; blocks: BlockSummary[] } | null>; // null without scope.player
  ```
  in `tools.ts`:
  ```ts
  export interface ToolDef { name: string; description: string; inputSchema: object }
  export const LIBRARY_TOOLS: ToolDef[]; // find_blocks, get_block, find_plans, get_plan, library_coverage, player_progress
  export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };
  export function callTool(d: Deps, scope: Scope, name: string, args: unknown): Promise<ToolResult>;
  ```
- Decisions:
  - limits: a missing limit is the default; anything else is clamped to 1..max.
  - `random-least-used`: take `n = countBlocks`, list `least-used` with limit `max(limit, ceil(n / 5))`, shuffle with `d.rand` (Fisher–Yates), return the first `limit`.
  - `libraryCoverage` returns a row for every topic in `TOPICS` × every level in `LEVEL_ORDER` and every concept in `CONCEPTS`, zeros where the repo has none; repo rows for a topic not in the catalogue are appended after.
  - `playerProgress` builds `OutcomeInput` the way `src/features/devtools/progress/ProgressPage.tsx` and its data loader do (read them first), as of `d.today()`; `blocks` is `findBlocks(…, { player: "had" })` at the max limit.
  - `callTool` validates `args` by hand against the tool's shape: unknown tool, wrong type, unknown enum value → `{ ok: false, error }` naming the argument. It never reads `player`, `planIds` or `includeNotEnabled` from `args`.
  - tool descriptions say what the answer is for (for `library_coverage`: "read this first to see which topics and levels are thin"; for `find_blocks`: what `unused`, `had`, `repeat` mean, and that stars say how the player is doing, not how good a block is).

- [ ] **Step 1: Failing tests** on the memory repos and `baseFixture()`:
  - limit clamps: `findBlocks(…, undefined, 10000)` returns at most 50; `0` returns 1.
  - `random-least-used` with a fixed `rand` returns `limit` blocks, all from the lowest fifth by seconds (or the `limit` least used when the fifth is smaller), and a different `rand` gives another order.
  - coverage has `TOPICS.length × 4` topic rows at least, zeros included (Review Focus 5).
  - `playerProgress` without a player is null; for A its topic for S1 is not "not yet" and `blocks` are A's.
  - `callTool`: each tool round-trips; `{ limit: "ten" }`, `{ order: "best" }`, `{ concepts: "caged" }` and an unknown tool give `ok: false` with the argument's name (Review Focus 1); `args` carrying `player` or `includeNotEnabled` change nothing.
  - every `LIBRARY_TOOLS` entry has a description and an `inputSchema` of type object with `additionalProperties: false`.
- [ ] **Step 2: Run, fail. Step 3: Implement. Step 4: Run** (pass), tsc, eslint.
- [ ] **Step 5: Commit** `feat(library): query functions and tool definitions`.

### Task 7: The local MCP endpoint

**Files:**
- Create: `src/features/library/server/mcp.ts`, `mcp.test.ts`, `src/app/api/dev/mcp/route.ts`, `.mcp.json`
- Modify: `src/features/library/README.md`, `src/features/devtools/README.md`

**Interfaces:**
- Consumes: `LIBRARY_TOOLS`, `callTool`, `Deps`, `Scope`; `devGate` (`features/devtools/gate`); `getDb`, `drizzleLibraryRepo`, `drizzleUserDataRepo`.
- Produces:
  ```ts
  export const DEV_ARGS = { player: "a user id (dev only)", include_not_enabled: "also show examples and plans not enabled for reuse (dev only)" };
  export function devTools(): ToolDef[];                                  // LIBRARY_TOOLS with the two dev arguments added to each schema
  export function devScope(args: unknown, d: Deps): Promise<{ scope: Scope; args: unknown } | { error: string }>; // strips the two, checks the player
  export function handleRpc(d: Deps, body: unknown): Promise<{ status: number; body?: unknown }>;
  ```
- Decisions:
  - Streamable HTTP, stateless, plain JSON answers (no SSE, no session). `POST` only; `GET` answers 405.
  - JSON-RPC 2.0 methods: `initialize` (answer `protocolVersion` = the client's when it sent one, `capabilities: { tools: {} }`, `serverInfo: { name: "musickit-library", version: "1" }`), `ping`, `tools/list`, `tools/call`; a notification (no `id`) answers 202 with no body; an unknown method answers error `-32601`; a body that isn't a JSON-RPC request `-32600`.
  - `tools/call` answers `{ content: [{ type: "text", text: JSON.stringify(data) }], isError: false }`, or the error text with `isError: true` (a tool error is a result, not a JSON-RPC error).
  - `devScope`: `player` must match the UUID pattern and `library.userExists`; otherwise `{ error }` (Review Focus 2).
  - The route: `devGate() ??` the handler; no database → 503 with a plain message. `.mcp.json`: `{ "mcpServers": { "musickit-library": { "type": "http", "url": "http://localhost:3000/api/dev/mcp" } } }`.

- [ ] **Step 1: Failing tests** for `handleRpc` on the memory repos: `initialize`, `tools/list` (six tools, each with the two dev arguments), `tools/call find_blocks`, a tool error as `isError: true`, a notification → 202, unknown method → `-32601`, garbage → `-32600`; `devScope` with `player: "x"` and with an unknown UUID → error naming `player`; `include_not_enabled: true` shows the example block.
- [ ] **Step 2: Run, fail. Step 3: Read `node_modules/next/dist/docs/` for route handlers, then implement. Step 4: Run** (pass), tsc, eslint.
- [ ] **Step 5: Check it for real.** With the dev server and the local database up: `curl -s localhost:3000/api/dev/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"library_coverage","arguments":{}}}'` returns coverage rows; `claude mcp list` shows `musickit-library` connected.
- [ ] **Step 6: Commit** `feat(devtools): the library as local MCP tools`.

### Task 8: `/dev/library`

**Files:**
- Create: `src/app/dev/library/page.tsx`, `src/features/devtools/library/LibraryPage.tsx`
- Modify: `src/features/devtools/registry.ts`, `src/features/devtools/README.md`, `tasks.txt` (mark NEW8 done)

**Interfaces:**
- Consumes: `libraryCoverage`, `findBlocks`, `findPlans`, `getBlock`, `getPlan` (Task 6).

- [ ] **Step 1: Build the page** the way `/dev/plan-reviews` reads the database (read it first): a server page, `DevShell`, tables only. Coverage first (topic × level: blocks, plans, times, minutes), then plans (title, model, versions, days, reviews), then blocks for a topic chosen by a query parameter (title, level, concepts, model, versions, times, minutes, ratings per star). A checkbox-style link toggles `include_not_enabled`; a `player` query parameter is passed through `devScope`. No database → the page says so in one line.
- [ ] **Step 2: Add it to the registry** (tone `data`).
- [ ] **Step 3: Read it on the dev server** at `/dev/library` with the local database seeded: the counts match `select count(*)` on the reusable blocks, and a topic with no blocks shows a zero row. Report what was and wasn't looked at.
- [ ] **Step 4: Run** `npm test`, tsc, eslint.
- [ ] **Step 5: Commit** `feat(devtools): /dev/library, the library's coverage, plans and blocks`.
