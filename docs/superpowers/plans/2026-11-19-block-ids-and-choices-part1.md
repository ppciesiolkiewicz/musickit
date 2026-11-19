# Block ids and choices, Part 1: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curated seed blocks get fixed readable ids and a `choices` table (one row per block), the composer and progress
work per choice, and `block_owners.enabled_for_reuse` is gone, so every schema change is in before launch.

**Architecture:** A curated block's id is its seed file's `id`; its level, steps, moves and minutes move into a `choices`
list in the file and a `choices` table. A composed exercise is still a stored copy, now carrying a trusted `blockId` and
`choiceId`; only a player's edit (`editPlan`) turns it into a hashed block. `db:seed-blocks` upserts curated blocks and
choices in place. The composer's candidates are choices.

**Tech Stack:** Next.js 16, TypeScript, Drizzle + Postgres, node --test via tsx (`npm test`), seed JSON files with
generated `index.gen.ts`.

**Spec:** docs/superpowers/specs/2026-11-19-block-ids-and-choices-design.md (Part 1, "Settled after the builder check",
"Text fixes and plans already made"). Also read docs/superpowers/specs/2026-11-18-choice-split-design.md for `moves`,
`given` and the roll, which stay as they are.

## Global Constraints

- Work on main, commit with a temporary `GIT_INDEX_FILE` (never `git add` in the shared index); end each commit message
  with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before each commit: the feature's tests, `npx tsc --noEmit 2>&1 | grep -v '^.next/'` empty, eslint on changed files.
- A curated id matches `/^[a-z0-9]+(-[a-z0-9]+)*$/` and is not 32 hex characters. A hashed id stays `isBlockId` (32 hex).
- A choice id is `${blockId}/${name}`; `name` matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`. Part 1 names each block's one
  choice after its level (`new`, `beginner`, `intermediate`, `advanced`), or `main` when it has none.
- Nothing is deleted from `blocks` or `choices`. A choice dropped from its file, or with `"draft": true`, is
  `active = false`.
- The plan's flag `practice_plans.enabled_for_reuse` stays (the spec drops only the block owners' one).
- No migration of old rows: the database is wiped and reseeded at the end (user, 2026-11-19), only with the user's go,
  and `.env.local` points at Supabase (check the host before any db command).
- New test files go where the `npm test` globs in package.json already reach.
- Feature READMEs and CLAUDE.md files beside the changed code are kept true in the same commit (AGENTS.md).

## Review Focus

1. A player's saved plan sends an exercise with a curated `blockId` but changed content (a forged or stale copy): the
   server writes no `blocks` row for a curated id from a player save, and adds an owner row only when the block exists.
   Test in Task 8.
2. A block's text is fixed and reseeded: same `blocks.id`, `choices` rows updated in place, and the player's earlier
   rating still comes back as `mine` from `composeBlocks`. Test in Task 5 (seed) and Task 6 (repo).
3. A choice removed from its file, or marked draft: `active = false`, never composed, its progress rows still read.
   Test in Task 5 and Task 6.
4. A stored exercise with a curated-looking `blockId` but no matching `choiceId`: `withBlockIds` treats it as hashed and
   recomputes. Test in Task 1.
5. Two plan exercises with the same title but different content (or one title in two plans): the split script gives
   them different ids; identical content in two places gets one id. Test in Task 3.

---

### Task 1: Curated ids and choice ids in the plan model

**Files:**
- Modify: `src/features/plan/model/blockId.ts`, `src/features/plan/model/exerciseIds.ts`, `src/features/plan/model/types.ts:56-58`,
  `src/features/plan/model/editPlan.ts:55-65`, `src/features/plan/model/libraryBlocks.ts:9-30`, `src/features/plan/README.md`
- Test: `src/features/plan/model/exerciseIds.test.ts`, `src/features/plan/model/editPlan.test.ts`

**Interfaces:**
- Produces (blockId.ts): `isCuratedId(v: unknown): v is string`; `isAnyBlockId(v: unknown): v is string` (curated or
  hashed); `choiceIdOf(blockId: string, name: string): string`; `blockOfChoice(choiceId: string): string | null`.
- Produces (types.ts): `PlanExercise` gains `choiceId?: string`.
- Behaviour: `withBlockIds` keeps an exercise whose `blockId` is curated and whose `choiceId` is
  `choiceIdOf(blockId, <some name>)`; every other exercise is recomputed as today, and loses any `choiceId`.
  `editPlan`'s edited exercise has a hashed id, no `choiceId`, `parentBlockId` = the old curated or hashed id, and keeps
  the copy's `steps`, `level` and `moves` (the choice's, already on the copy). `libraryBlocksOf` keeps a curated
  `parentBlockId` as `parentId`, and skips exercises whose id is curated (they are not new blocks).

- [ ] **Step 1: Write the failing tests**
  - `withBlockIds keeps a curated id with its choice`: exercise `{ blockId: "guitar-x", choiceId: "guitar-x/beginner", ... }` comes back the same object.
  - `withBlockIds recomputes a curated-looking id without its choice`: `{ blockId: "guitar-x" }` and `{ blockId: "guitar-x", choiceId: "other/beginner" }` get `blockIdOf(blockKeyOf(e))` and no `choiceId`.
  - `isCuratedId`: true for `"guitar-beginner-down-up-picking"`, false for 32 hex, `"Guitar"`, `"a--b"`, `""`.
  - `editPlan of a curated exercise`: result has `isBlockId(blockId)`, no `choiceId`, `parentBlockId === "guitar-x"`, the same `steps`.
  - `libraryBlocksOf skips curated exercises` and `keeps a curated parentId` for an edited one.
- [ ] **Step 2: Run** `npx tsx --test src/features/plan/model/exerciseIds.test.ts src/features/plan/model/editPlan.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the functions and changes above; update the `PlanExercise` comment and the README's "Every exercise carries two ids" paragraph (three ids now: `id`, `blockId`, `choiceId`).
- [ ] **Step 4: Run** the tests and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(plan): curated block ids and choice ids on an exercise`.

### Task 2: Seed file shape: `choices` in block files, block refs in plan files

**Files:**
- Modify: `src/features/library/seed/index.ts`, `scripts/seed.ts` (the `check` command), `src/features/library/seed/README.md`, `src/features/library/seed/CLAUDE.md`
- Create: `src/features/library/seed/choices.ts`
- Test: `src/features/library/seed/choices.test.ts`

**Interfaces:**
- Produces (index.ts):
  ```ts
  export interface SeedChoice { name: string; level?: Level; steps: string[]; moves?: unknown; minutes: number; draft?: boolean }
  // SeedBlockFile gains: choices: SeedChoice[]; `exercise` no longer holds level, steps, moves or minutes
  export interface SeedBlockRef { block: string; choice: string; minutes?: number }
  // SeedPlanFile: plan.days[].exercises is SeedBlockRef[]
  ```
- Produces (choices.ts):
  - `exerciseOf(file: SeedBlockFile, choice: SeedChoice): Record<string, unknown>`: the AI-shape exercise (file's
    `exercise` plus the choice's `level`, `steps`, `moves`, `minutes`, plus `blockId: file.id`, `choiceId`), so
    `parseExercise` validates it unchanged.
  - `expandPlan(file: SeedPlanFile, blocks: SeedBlockFile[]): { plan: Record<string, unknown>; errors: string[] }`: the
    plan with each ref replaced by `exerciseOf`, `minutes` from the ref when given. An unknown block or choice is an error.
- `seed check` checks every choice through `exerciseOf` + `parseExercise` + the existing moves checks (`movesCheck.ts`),
  fails on a duplicate choice name in a file, a choice name not matching the rule, a file `id` that is not a curated id,
  and a plan ref to a missing block or choice. Versions are checked as today.

- [ ] **Step 1: Write the failing tests** in `choices.test.ts`: `exerciseOf merges the choice and carries both ids`;
  `expandPlan uses the ref's minutes, else the choice's`; `expandPlan names a missing block and a missing choice`.
- [ ] **Step 2: Run** `npx tsx --test src/features/library/seed/choices.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the types, `choices.ts` and the `seed check` rules. Rewrite README "File shape" and CLAUDE.md
  for the new shape (no rule changes yet: Task 9 does those).
- [ ] **Step 4: Run** the tests. Expected: PASS. (`npm run -s seed -- check` fails until Task 3 converts the files.)
- [ ] **Step 5: Commit** `feat(seed): block files list choices; plan files name blocks`.

### Task 3: Convert the seed files

**Files:**
- Create: `scripts/seed-split.ts` (one-off, kept for the record), test `scripts/seed-split.test.ts` (run directly with `npx tsx --test`)
- Modify: every `src/features/library/seed/blocks/*.json`, every `src/features/library/seed/plans/*.json`, both `index.gen.ts` (regenerate with the existing generator)

**Interfaces:**
- Produces: `splitSeed(blocks: OldBlockFile[], plans: OldPlanFile[]): { blocks: SeedBlockFile[]; plans: SeedPlanFile[]; report: string[] }`
  and `slugOf(title: string): string` (lowercase, `{{=key}}`-style params and punctuation dropped, words joined by `-`,
  at most 60 characters on a word boundary).
- Rules:
  - A block file: its `exercise`'s `level`, `steps`, `moves`, `minutes` move into `choices: [{ name: <level or "main">, ... }]`.
  - An inline plan exercise: identical (same `blockIdOf(blockKeyOf(...))`) to an existing block file or an exercise
    already moved: becomes a ref to that file. Otherwise a new block file with id `${planId}-${slugOf(title)}`, and
    `-2`, `-3` on a clash; its `model`, `versions` and a `note` ("Moved from plans/<planId>.json, day N.") from its plan.
  - Files keep their `versions` (no rewrite; the spec says moving raises nothing).

- [ ] **Step 1: Write the failing tests**: `slugOf` on `"{{=key}} minor pentatonic, position 1"` → `"minor-pentatonic-position-1"`;
  `two different exercises with one title get -2`; `the same exercise in two plans becomes one file and two refs`;
  `a plan exercise identical to a block file becomes a ref to it`.
- [ ] **Step 2: Run** `npx tsx --test scripts/seed-split.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `splitSeed`, and a `main` that reads the files, writes them back (2-space JSON, as today) and prints the report.
- [ ] **Step 4: Run** the tests (PASS), then the script, the index generator and `npm run -s seed -- check`. Expected:
  only the version findings that were there before; no shape errors. Count: block files ≈ 145 + the moved ones (the
  report says how many were folded as duplicates).
- [ ] **Step 5: Commit** in two commits: the script, then the converted files (`chore(seed): plan exercises move to block files with choices`).

### Task 4: Schema and migration

**Files:**
- Modify: `src/lib/db/schema.ts` (`blocks`, new `choices`, `progressEntries`, `practicePlanBlocks`, `blockOwners`)
- Create: `drizzle/0036_*.sql` via `npm run db:generate`
- Modify: `docs/db/schema.dbml` via `npm run db:diagram` (and offer the user to update the DB schema artifact)

**Interfaces:**
- `blocks`: `kind` text not null default `'hashed'` (`'curated' | 'hashed'`); comment: insert-only for hashed blocks; a
  curated block is updated in place by the seed. `steps`, `level` stay for hashed blocks (empty/null on curated ones).
- `choices`: `id` text pk, `block_id` text not null → `blocks.id`, `name` text not null, `level` text, `steps` text[] not
  null default `'{}'`, `moves` jsonb, `set` jsonb not null default `'{}'`, `minutes` integer not null, `active` boolean not
  null default true, `place` integer not null, `created_at`, `updated_at`; unique (`block_id`, `name`); indexes on
  `block_id` and on `active`.
- `progress_entries.choice_id` text (no foreign key, as `block_id`), index.
- `practice_plan_blocks.choice_id` text → `choices.id` (nullable for a hashed block).
- `block_owners.enabled_for_reuse` is not dropped here: Task 6 drops it once nothing reads it.

- [ ] **Step 1:** Edit schema.ts; `npm run db:generate`; read the generated SQL (one file, the changes above, nothing else).
- [ ] **Step 2:** Apply to the local test database only (the one `npm run test:library-db` uses), not Supabase. Expected: applies cleanly.
- [ ] **Step 3:** `npm test`, tsc. Expected: PASS (nothing reads the new columns yet).
- [ ] **Step 4: Commit** `feat(db): choices table, choice ids on progress and plan rows`.

### Task 5: Seeding curated blocks and choices

**Files:**
- Modify: `src/features/userData/server/seedBlocks.ts`, `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `scripts/db-seed-blocks.ts`, `scripts/db-seed-plans.ts`
- Test: `src/features/userData/server/seedBlocks.test.ts`

**Interfaces:**
- Consumes: `exerciseOf`, `expandPlan` (Task 2); `choiceIdOf` (Task 1).
- Produces (repo.ts): `upsertCurated(blocks: CuratedBlock[], now: Date): Promise<{ blocks: number; choices: number; deactivated: number }>` with
  ```ts
  interface CuratedBlock { id: string; content: Block; area; topic; concepts: string[]; tags: string[]; slot: Omit<BlockSlot, "minutes">;
    provenance: Provenance; choices: { id: string; name: string; level: string | null; steps: string[]; moves: Moves | null; minutes: number; active: boolean; place: number }[] }
  ```
  Upsert by id: block content, tags, slot and provenance overwritten; choices upserted by id; every choice of a listed
  block not in its list, and every choice of a curated block not listed at all, set `active = false`. App owner row
  (`user_id` null) inserted once.
- `seedBlocks` builds `CuratedBlock`s from `SEED_BLOCKS` (draft → `active: false`) and plan block rows from each plan
  file's refs (`blockId`, `choiceId`, `minutes`), no longer by hashing the reply. `libraryPlanBlocks` goes.
- `db:seed-plans` writes `expandPlan(...)` as the reply; each exercise in it carries `blockId` and `choiceId`.

- [ ] **Step 1: Write the failing tests** (memory repo): `seeding twice changes nothing`; `a text edit keeps the id and
  updates the content`; `a choice dropped from the file becomes inactive`; `a draft choice is stored inactive`;
  `plan rows name the block and choice of each ref`.
- [ ] **Step 2: Run** `npx tsx --test src/features/userData/server/seedBlocks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in both repos and the two scripts; the scripts print per block and choice as `db:seed-blocks` does today (f7c586d8).
- [ ] **Step 4: Run** the tests and `npm run test:library-db` (drizzle repo against the local test database). Expected: PASS.
- [ ] **Step 5: Commit** `feat(seed): db:seed-blocks upserts curated blocks and their choices`.

### Task 6: Library repo reads choices

**Files:**
- Modify: `src/features/library/server/types.ts`, `repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `repoContract.ts`, `fixture.ts`, `query.ts`, `tools.ts`, `mcp.ts`, `src/features/library/README.md`
- Test: `src/features/library/server/repoContract.ts` (run by `repo.memory.test.ts` and `npm run test:library-db`), `tools.test.ts`

**Interfaces:**
- `ComposeBlock` gains `choiceId: string`; one item per **active choice** of a curated block in `areas`; `steps`, `level`,
  `slot.minutes` and `content.moves` come from the choice; `use` per block (all choices); `mine` is the player's newest
  rating with that `choice_id`.
- Visibility without the owners' flag: a curated block is visible when it has an active choice (dev
  `include_not_enabled`: also inactive ones); a hashed block only to its owners. `BlockSummary`/`BlockDetail` gain
  `choices: { id; name; level; steps; minutes; active }[]` (curated) or `[]` (hashed); `steps` on a summary is the union of
  its active choices' steps for a curated block. `find_blocks` by `steps` and `coverage().steps` count choices.
- The MCP tool descriptions say "choice" where a step is served (tools.ts).

- [ ] **Step 1: Write the failing contract tests**: `composeBlocks gives one item per active choice`; `an inactive choice
  is never composed`; `mine follows the choice id`; `a reseeded text edit keeps mine`; `a hashed block another player
  owns is not visible`; `coverage counts a step once per choice`.
- [ ] **Step 2: Run** `npx tsx --test src/features/library/server/repo.memory.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in both repos, the fixture, query.ts and tools.ts. Then remove `enabledForReuse` from
  `blockOwners` in schema.ts and every reader (`grep -rn enabledForReuse src scripts`), `npm run db:generate` (0037,
  one `drop column`), apply to the local test database.
- [ ] **Step 4: Run** the memory tests, `npm run test:library-db`, `tools.test.ts`, `mcp.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): the library serves choices; no reuse flag on blocks`.

### Task 7: The composer picks choices

**Files:**
- Modify: `src/features/plan/model/compose.ts`, `src/features/plan/server/composeToday.ts`, `composeStudentWeek.ts`, `stubLibrary.ts`, `src/features/plan/model/roll.ts` callers, `src/features/devtools/model/composeLab.ts`, `src/features/devtools/compose/ComposeLab.tsx`, `Architecture.tsx`
- Test: `src/features/plan/model/compose.test.ts`, `src/features/plan/server/composeToday.test.ts`, `composeStudentWeek.test.ts`

**Interfaces:**
- `Candidate` gains `choiceId: string`; `candidateOf` sets `exercise.blockId`, `exercise.choiceId`, and the choice's
  `steps`, `level`, `moves`, `minutes` on the copy.
- `ComposeInput.yesterday` and `declined` hold choice ids; "used today/yesterday" and `declined` compare choice ids. The
  roll's history is the player's entries with that `choiceId` (earned keys stay per track, unchanged).
- `blockIds(...)` in composeToday becomes `choiceIds(...)`.
- /dev/compose shows the choice id under each pick's block id (stage 3 picks, stage 6 versions).

- [ ] **Step 1: Write the failing tests**: `two choices of one block are two candidates`; `a choice used yesterday is not
  picked, another choice of the same block may be`; `the roll reads only this choice's ratings`; `a composed exercise
  carries blockId and choiceId`.
- [ ] **Step 2: Run** the three test files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS. Open `/dev/compose` on the dev server: picks show choice ids, stage 6 still fills.
- [ ] **Step 5: Commit** `feat(plan): the composer picks choices`.

### Task 8: Progress and plan saves carry the choice

**Files:**
- Modify: `src/features/progress/log.ts` (`ProgressEntry.choiceId?: string`), `src/features/plan/model/progressLog.ts` (`entryFor`), `src/features/userData/server/repo.drizzle.ts:40-60` and `repo.memory.ts:85-95` (progress upsert writes `choice_id`, kept like `block_id`), the plan-save path that calls `libraryBlocksOf` (owner rows), `src/features/plan/model/state.ts` sanitising
- Test: `src/features/plan/model/progressLog.test.ts`, `src/features/userData/server/*.test.ts` for the save path

**Interfaces:**
- `entryFor` copies `exercise.choiceId` when present.
- A plan save inserts `blocks` rows only for hashed exercises; for a curated exercise it adds the player's owner row only
  when `blocks` has that id, and never writes its content.

- [ ] **Step 1: Write the failing tests**: `a rating of a composed exercise records its choice id`; `the server stores
  choice_id and keeps it when a later write lacks it`; `a save with a curated id writes no block row`; `a save with an
  unknown curated id adds no owner row`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npm run test:library-db`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(progress): a rating keeps its choice; saves never write curated blocks`.

### Task 9: Dev pages, docs, writing rules

**Files:**
- Modify: `src/features/devtools/library/*` (/dev/library shows a block's choices, with active/inactive, and `item=<blockId>` or `item=<choiceId>`), `src/app/dev/costs/page.tsx` and `src/features/devtools/model/library.ts` (no owners' flag), `.claude/skills/exercise-example/SKILL.md` and the other three teaching skills' `version:`, `src/features/library/seed/versions.ts` (`DOC_VERSIONS.teaching` 7 → 8), `src/features/plan/model/CHANGELOG.md`, `src/features/library/README.md`, `src/features/devtools/README.md`, `src/features/plan/CLAUDE.md` if it names `enabled_for_reuse`
- Test: `src/features/devtools/model/library.test.ts`, `src/features/library/seed/versions.test.ts`

**Interfaces:**
- Writing rules (exercise-example, written with teaching-voice): a block file lists its choices; one block per exercise;
  another level or range of the same exercise is a choice, not a copy; a block whose words must differ by level stays
  separate blocks; an edit that changes what the block is (another tool, another exercise) is a new block or choice, not
  an edit. This changes what gets written: teaching 8, with a CHANGELOG entry (AGENTS.md "Version"). Every seed file then
  reports old versions in `seed check`, as after any raise; ChoiceSplit3 rewrites them.

- [ ] **Step 1: Write the failing tests**: /dev/library model lists choices for a curated block; versions test expects teaching 8.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the pages, the skill text and the version raise.
- [ ] **Step 4: Run** `npm test`, tsc, eslint; open `/dev/library?item=guitar-beginner-down-up-picking` on the dev server. Expected: the block with one choice, `beginner`, active.
- [ ] **Step 5: Commit** `feat(devtools): /dev/library shows choices; seed writing rules for choices (teaching 8)`.

### Task 10: Wipe, migrate, reseed, walk (user's go)

- [ ] **Step 1:** Tell the user what will be wiped (library, plans, progress, player plan documents) and get the go. Check `.env.local`'s database host before any command.
- [ ] **Step 2:** `npm run db:migrate`, then `npm run db:reset-library`, `npm run db:wipe-plans` (and progress, if not included: check `scripts/db-wipe-plans.mjs` first), `npm run -s db:seed-plans`, `npm run -s db:seed-blocks`. Expected: every curated block and choice reported; plan rows name choices.
- [ ] **Step 3:** Run `db:seed-blocks` again. Expected: nothing added, nothing deactivated.
- [ ] **Step 4:** Walk signed in on the scratch server on 127.0.0.1 (memory "Signed-in walk on 127.0.0.1"): /plan composes, rate an exercise, Get another plan; fix one word in a block file, reseed, reload: the rating is still on the exercise's choice (/dev/progress).
- [ ] **Step 5:** Update tasks.txt (ChoiceSplit2 Part 1 done, what is left) and commit.
