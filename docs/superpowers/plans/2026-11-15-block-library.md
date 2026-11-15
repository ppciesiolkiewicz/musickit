# Block library and plan review (Part B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every block a plan uses becomes an immutable row in a shared `blocks` library, found by a hash of its content and tags; plan exercises, ratings and day times point at it; and at the end of a week the student can review the plan with stars and, when low, "Can you tell us why?".

**Architecture:** One pure, synchronous id function (`blockIdOf`, SHA-256 in plain TS so browser and Node agree) is applied wherever exercises get ids (`startPlan`, `sanitiseState`, `editDay`). Because `sanitiseState` runs inside `parseDoc` on the server, the server always recomputes block ids itself; `writeDoc` for kind `plan` then inserts the plan's new blocks and owner rows and syncs `plan_reviews` from the parsed document. No new client fetch: the review rides on the plan document's existing `DocClient` save. A seed script and a one-off move-over script reuse the same server functions.

**Tech Stack:** TypeScript, Next.js (read `node_modules/next/dist/docs/` before touching routes or pages, per `AGENTS.md`), React, Drizzle ORM + drizzle-kit on Postgres 17, node:test + `assert/strict` run by `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-15-blocks-and-progress-design.md` (Part B; Parts A and C are other plans).

## Global Constraints

- Blocks are only ever inserted (`on conflict do nothing`), never updated, never deleted. "Blocks never change once stored."
- "A student's edited block showing up in someone else's plan" is a failure: blocks are private to their owner until `enabled_for_reuse` is on for some owner row; default `false`.
- Block id: "a hash of the block's canonical JSON (content and tags)… at least 128 bits"; the same function in browser and server. Here: `sha256Hex(canonicalJson(key)).slice(0, 32)` (128 bits, lowercase hex).
- The id covers content and tags only: "Changing just minutes, why or links in the day editor keeps the block id (the slot still gets a new id and loses its stars, as `editDay` does today)."
- The exercise `id` stays the slot id, fresh per plan run; `done`, `rated` and the day timer keep using it.
- The server "recomputes the ids itself and does not trust the client's".
- Moving over: "Nothing is deleted." Rows whose plan is gone keep `block_id` null.
- "The AI does not see block ids… The prompt, `PROMPT_VERSION`, the examples and the teaching documents do not change." `buildPrompt` output must not contain `blockId` or `parentBlockId`.
- "No points, no score, no celebrating." No exclamation marks in any new copy.
- "Can you tell us why?" is the user's wording, used exactly. All other new words on the screen are written after loading `design:ux-copy` and `teaching-voice` (AGENTS.md table); report strings old → new.
- Out of scope: `answersHistory` and its move-over, the outcome, the tracker, handing library plans to students.
- Every failure is surfaced (toast or inline error) and every fetch has a timeout; Part B adds no new browser fetch (the review is saved with the plan document).
- Tests: `npx tsx --test <file>` (if npx stalls, use the cached binary, `ls ~/.npm/_npx/*/node_modules/.bin/tsx`). Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` prints nothing. Eslint on changed files: `npx eslint <files>`.
- Commits: never `git add` into the shared index. Commit only the task's paths via a temp `GIT_INDEX_FILE` (see memory shared-index-staging), then `git reset -q -- <paths>`. Every message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `next dev` may re-add the AGENTS.md block; leave it out of these commits unless it is the only diff there.
- DB: before `npm run db:migrate`, `grep DATABASE_URL .env.local`; it points at Supabase (release). Migrate locally with `docker start musickit-db` and `DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit npm run db:migrate`. Applying to Supabase is the user's call, asked for, never done by a task.
- Each task keeps the README/CLAUDE.md of the feature it touches true in the same commit.

## Review Focus

- **Same block, different bytes.** A block reloaded after the editor gave its cells `id`s, or with `choice` keys in another order, or concepts listed in another order, must keep its block id; otherwise every edit-free reload would make a "new" block. Test in Task 1.
- **A forged or stale `blockId` / `parentBlockId` in a saved document.** The stored ids are always the server's own, and a `parent_id` is written only when the saver already owns the parent block, so nobody can hang their row off someone else's private block or claim a wrong id. Tests in Tasks 2 and 4.
- **A low review whose stars are raised.** Typing a why at 2 stars, then picking 4: the why is not stored (and the box hides); picking 2 again shows an empty box. Typing spaces in the box must not be eaten while typing. Tests in Task 5 (model) and the browser check in Task 6.
- **An old client or an old row without day blocks.** A `DayTime` with no `blocks`, `blocks: null` (the new column on an old row), or a block for a slot with no seconds must still parse; the stray entry is dropped, not the record. Test in Task 3.
- **Running a script twice.** The seed and the move-over must add nothing the second time: no duplicate owner rows for the app (`user_id` null, so the unique index is `nulls not distinct`), no changed rows. Tests in Tasks 8 and 9.

---

### Task 1: The block id

**Files:**
- Create: `src/lib/sha256.ts`, `src/lib/sha256.test.ts`
- Create: `src/features/plan/model/blockId.ts`, `src/features/plan/model/blockId.test.ts`
- Modify: `src/features/plan/model/editPlan.ts` (use `withoutCellIds` in place of its private `noIds`)
- Modify: `src/features/plan/README.md` (code map: `blockId.ts`)

**Interfaces:**
- Produces:
  - `sha256Hex(text: string): string` — SHA-256 of the UTF-8 bytes (`TextEncoder`), 64 lowercase hex chars; pure TS, synchronous, no `node:crypto`, no `crypto.subtle`.
  - `export interface BlockKey { content: Block; area?: Area; topic?: string; concepts?: string[]; level?: Level; tags?: string[] }`
  - `blockKeyOf(e: PlanExercise): BlockKey` — `content` is `{ title, choice?, cells }` with every cell `id` removed at every depth; `concepts` and `tags` sorted and de-duplicated, left out when empty; `area`, `topic`, `level` left out when absent. Minutes, why, links, `id`, `blockId`, `parentBlockId` never enter the key.
  - `withoutCellIds(cells: Cell[]): Cell[]` — cells without editor ids, sections recursed.
  - `canonicalJson(v: unknown): string` — JSON with object keys sorted at every depth, `undefined` properties dropped; arrays keep their order.
  - `blockIdOf(key: BlockKey): string` — `sha256Hex(canonicalJson(key)).slice(0, 32)`.
  - `isBlockId(v: unknown): v is string` — `/^[0-9a-f]{32}$/`.

- [ ] **Step 1: Write the failing tests**

`src/lib/sha256.test.ts`:
```ts
test("sha256Hex matches node:crypto", () => {
  for (const s of ["", "abc", "é♪😀 ünïcode", "x".repeat(1_000_003)])
    assert.equal(sha256Hex(s), createHash("sha256").update(s, "utf8").digest("hex"));
});
```
`src/features/plan/model/blockId.test.ts` (an exercise fixture with a section cell holding a text cell, a choice, concepts `["b","a"]`, tags):
```ts
test("blockIdOf is 32 hex chars and is node:crypto's sha256 of the canonical key", () => {
  const k = blockKeyOf(ex);
  assert.match(blockIdOf(k), /^[0-9a-f]{32}$/);
  assert.equal(blockIdOf(k), createHash("sha256").update(canonicalJson(k)).digest("hex").slice(0, 32));
});
test("canonicalJson sorts keys at every depth and drops undefined", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: undefined, c: [2, { z: 1, y: 0 }] } }), '{"a":{"c":[2,{"y":0,"z":1}]},"b":1}');
});
test("cell ids, key order and concept order do not change the id", () => {
  const withIds = { ...ex, cells: ex.cells.map((c, i) => ({ ...c, id: `c${i}` })) };      // and inside the section
  const reordered = { ...ex, concepts: ["a", "b"], choice: reverseKeys(ex.choice) };
  assert.equal(blockIdOf(blockKeyOf(withIds)), blockIdOf(blockKeyOf(ex)));
  assert.equal(blockIdOf(blockKeyOf(reordered)), blockIdOf(blockKeyOf(ex)));
});
test("minutes, why, links and slot ids do not change the id; title, a cell, level and topic do", () => {
  const id = blockIdOf(blockKeyOf(ex));
  assert.equal(blockIdOf(blockKeyOf({ ...ex, minutes: 99, why: "x", learnBefore: ["/a"], id: "s2", blockId: "f".repeat(32) })), id);
  for (const other of [{ ...ex, title: "Other" }, { ...ex, level: "advanced" }, { ...ex, topic: "t2" }, { ...ex, cells: [...ex.cells, { type: "text", text: "more" }] }])
    assert.notEqual(blockIdOf(blockKeyOf(other as PlanExercise)), id);
});
test("empty concepts and tags are the same as none", () => {
  assert.equal(blockIdOf(blockKeyOf({ ...ex, concepts: [], tags: [] })), blockIdOf(blockKeyOf({ ...ex, concepts: undefined, tags: undefined })));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tsx --test src/lib/sha256.test.ts src/features/plan/model/blockId.test.ts`
Expected: FAIL, cannot find module `./sha256` / `./blockId`.

- [ ] **Step 3: Implement `sha256Hex` in `src/lib/sha256.ts` and the `blockId.ts` functions above**

Standard FIPS 180-4 SHA-256 over a `Uint8Array` (32-bit ops with `>>> 0`). `editPlan.ts`'s `sameExercise` switches to `withoutCellIds` (same behaviour, its tests stay green).

- [ ] **Step 4: Run them to verify they pass**

Run: `npx tsx --test src/lib/sha256.test.ts src/features/plan/model/blockId.test.ts src/features/plan/model/editPlan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit only this task's paths via a temp GIT_INDEX_FILE (see memory shared-index-staging):
```
feat(plan): a block id, the hash of a block's content and tags

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 2: Block ids on plan exercises

**Files:**
- Modify: `src/features/plan/model/types.ts` (`PlanExercise`)
- Modify: `src/features/plan/model/exerciseIds.ts` (`withBlockIds`), test `exerciseIds.test.ts`
- Modify: `src/features/plan/model/schedule.ts` (`startPlan`), `src/features/plan/model/state.ts` (`cleanPlan`), test `plan.test.ts`
- Modify: `src/features/plan/model/editPlan.ts` (`editDay`), test `editPlan.test.ts`
- Modify: `src/features/plan/model/prompt.test.ts` (no block ids in the prompt)
- Modify: `src/features/plan/README.md`, `src/features/plan/CLAUDE.md`

**Interfaces:**
- Consumes: `blockKeyOf`, `blockIdOf`, `isBlockId` (Task 1).
- Produces:
  - `PlanExercise = Block & ExerciseMeta & { id?: string; blockId?: string; parentBlockId?: string }`. `parentBlockId`: the block this exercise was edited from in the day editor (becomes `blocks.parent_id`).
  - `withBlockIds(config: PlanConfig): PlanConfig` in `exerciseIds.ts` — **this is the choice** (a sibling of `withExerciseIds`, not a flag on it): sets `blockId = blockIdOf(blockKeyOf(e))` on every exercise of every listed day, always recomputed (a stored or sent id is never trusted); drops a `parentBlockId` that is not `isBlockId` or equals the exercise's own `blockId`; returns the same object when nothing changed.
  - Called in: `startPlan` (`withBlockIds(withExerciseIds(config, newId, true))`), `cleanPlan` (`withBlockIds` applied after `cleanCells`, so the id is of the cleaned content the page shows), and `editDay` (below). `claimInvite` needs no change: it saves through `writeDoc` → `parseDoc` → `sanitiseState`.
  - `editDay`: an exercise that changed gets `id: newId()`, `blockId` recomputed, and `parentBlockId: old.blockId` when the new block id differs from the old one; when only minutes/why/links changed the block id is the same and the old `parentBlockId` (if any) is kept. A new exercise (`from: null`) has no `parentBlockId`.

- [ ] **Step 1: Write the failing tests**

```ts
// exerciseIds.test.ts
test("withBlockIds puts the content's block id on every exercise, and replaces a wrong one", () => {
  const c = withBlockIds(configWith([{ ...ex, blockId: "0".repeat(32) }, ex2]));
  assert.equal(c.days[0].exercises[0].blockId, blockIdOf(blockKeyOf(ex)));
  assert.equal(c.days[0].exercises[1].blockId, blockIdOf(blockKeyOf(ex2)));
});
test("withBlockIds gives the same object when every id is right, and leaves a day without exercises alone", ...);
test("withBlockIds drops a parentBlockId that is not a block id or is the block itself", ...);
// plan.test.ts
test("startPlan gives every exercise a block id; the same exercise in two runs has the same block id and new slot ids", ...);
test("sanitiseState fills block ids on a stored plan without them, history included", ...);
test("a stored plan's block id is of its cleaned cells: a dropped tool changes it", ...);   // a cell parseCellDiag drops
// editPlan.test.ts
test("editDay: a changed block gets a new slot id, a new block id and the old one as parentBlockId", ...);
test("editDay: changing only minutes or why keeps the block id and its parent, and still gives a new slot id", ...);
test("editDay: an added exercise has a block id and no parent", ...);
// prompt.test.ts
test("the prompt never carries block ids", () => {
  const p = buildPrompt(answers, entries, [startedPlanWithParents], course);
  assert.equal(/blockId|parentBlockId/.test(p), false);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tsx --test src/features/plan/model/exerciseIds.test.ts src/features/plan/model/plan.test.ts src/features/plan/model/editPlan.test.ts src/features/plan/model/prompt.test.ts`
Expected: FAIL, `withBlockIds` is not exported; `blockId` undefined.

- [ ] **Step 3: Implement `withBlockIds` and the three call sites as in Interfaces**

If `prompt.test.ts` fails because `weekReport`/`weekByTopic` serialise whole exercises, pick fields there instead of spreading (the prompt text must not change otherwise; `PROMPT_VERSION` stays).

- [ ] **Step 4: Run them, then the whole plan model suite**

Run: `npx tsx --test src/features/plan/model/*.test.ts src/features/plan/store/*.test.ts src/features/userData/*.test.ts src/features/userData/server/*.test.ts`
Expected: PASS (existing tests that deep-equal sanitised plans may need `blockId` added to their expected values; update those, don't weaken them).

- [ ] **Step 5: Docs**

README code map: `exerciseIds.ts` gains `withBlockIds()`; the storage section says block ids are filled on start, on load and by the day editor, always recomputed. CLAUDE.md gains one rule: "**A block id is computed, never trusted** (`withBlockIds`, `model/blockId.ts`): content and tags only, cell ids left out; minutes, why and links are the slot's."

- [ ] **Step 6: Commit** (temp GIT_INDEX_FILE, this task's paths only)
```
feat(plan): every plan exercise carries its block id

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 3: Ratings and day times name their block

**Files:**
- Modify: `src/features/progress/log.ts`, test `src/features/progress/log.test.ts`, `src/features/progress/README.md`
- Modify: `src/features/plan/model/progressLog.ts`, test `progressLog.test.ts`
- Modify: `src/features/plan/model/planTime.ts`, test `planTime.test.ts`

**Interfaces:**
- Consumes: `PlanExercise.blockId` (Task 2).
- Produces:
  - `ProgressEntry.blockId?: string`; `cleanEntry` keeps it when it is text of 1–200 chars (progress knows nothing of the id's shape), else drops just that field.
  - `entryFor(...)` sets `blockId` from the exercise when it has one (signature unchanged).
  - `DayTime.blocks?: Record<string, string>` (slot id → block id), only for slots in `spent`.
  - `parseDayTime(raw)`: `blocks` absent, `null` or not an object → no `blocks`; entries whose key is not in `spent` or whose value is not text ≤ 200 are dropped; empty → no `blocks`. Never a reason to refuse the record.
  - `dayTime(planId, day, exercises, elapsed, seconds)` (signature unchanged) adds `blocks` for each exercise with an `id`, a `blockId` and seconds > 0.
  - `withDayTime` returns the same array only when `elapsed`, `spent` and `blocks` are all unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
// log.test.ts
it("keeps a rated block's id, and drops a broken one without dropping the row", () => {
  assert.equal(cleanEntries([{ ...row, blockId: "a".repeat(32) }])[0].blockId, "a".repeat(32));
  const [r] = cleanEntries([{ ...row, blockId: 7 }]);
  assert.ok(r); assert.equal("blockId" in r, false);
});
// progressLog.test.ts
it("entryFor copies the exercise's block id; an exercise without one gives a row without it", ...);
// planTime.test.ts
it("dayTime records each timed slot's block, only for slots with seconds", () => {
  const t = dayTime("p", 0, [{ ...a, id: "s1", blockId: B1 }, { ...b, id: "s2", blockId: B2 }], 90, [60, 0]);
  assert.deepEqual(t.blocks, { s1: B1 });
});
it("parseDayTime keeps a record with no blocks, blocks: null, or a block for a slot without seconds (dropped)", () => {
  assert.deepEqual(parseDayTime({ ...good, blocks: null }), good);
  assert.deepEqual(parseDayTime({ ...good, blocks: { s1: B1, ghost: B2 } })?.blocks, { s1: B1 });
  assert.equal(parseDayTime({ ...good, blocks: "x" })?.planId, good.planId);
});
it("withDayTime sees a change in blocks alone", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tsx --test src/features/progress/log.test.ts src/features/plan/model/progressLog.test.ts src/features/plan/model/planTime.test.ts`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement the fields and parsing above**

- [ ] **Step 4: Run them to verify they pass**

Same command. Expected: PASS. Then `npx tsx --test src/features/plan/store/*.test.ts src/features/progress/*.test.ts` stays green.

- [ ] **Step 5: Docs**

progress README: `ProgressEntry` lists `blockId` ("the block rated, when the plan had one; a row stays one per slot"). plan README: `planTime.ts` line mentions `blocks` (slot → block, for the slots with seconds, so time finds its block without the plan).

- [ ] **Step 6: Commit** (temp GIT_INDEX_FILE)
```
feat(progress): ratings and day times carry the block id

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 4: The library tables, filled when a plan is saved

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/NNNN_blocks_and_reviews.sql`, `drizzle/meta/NNNN_snapshot.json` (NNNN: the next free number; 0013 when this was written, since 0012 is taken — check `drizzle/` first), `drizzle/meta/_journal.json` (generated)
- Create: `src/features/plan/model/libraryBlocks.ts`, test `src/features/plan/model/libraryBlocks.test.ts`
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `data.ts`, test `data.test.ts`
- Modify: `src/features/userData/README.md`, `src/features/userData/CLAUDE.md`, `README.md` + `docs/db/schema.*` (via `npm run db:diagram`)

**Interfaces:**
- Consumes: `BlockKey` (Task 1), `PlanExercise.blockId`/`parentBlockId` (Task 2), `DayTime.blocks`, `ProgressEntry.blockId` (Task 3).
- Produces (schema; also the `plan_reviews` table used by Task 5, made in this migration so there is one):
  - `blockSource = pgEnum("block_source", ["ai", "edit", "seed", "example"])`.
  - `blocks`: `id` text pk; `content` jsonb not null; `area` text; `topic` text; `concepts` text[] not null default `{}`; `level` text; `tags` text[] not null default `{}`; `parent_id` text (no FK; set only to a block the saver owns); `created_at`. Indexes `blocks_area`, `blocks_topic`.
  - `block_owners`: `user_id` uuid null → `users.id` on delete cascade; `block_id` text not null → `blocks.id`; `source` `block_source` not null; `enabled_for_reuse` bool not null default false; `created_at`. `unique("block_owners_user_block").on(user_id, block_id).nullsNotDistinct()`; index `block_owners_block` on `block_id`.
  - `plan_reviews`: `user_id` uuid not null → `users.id` cascade; `plan_id` text not null; `library_plan_id` text null → `practice_plans.id` on delete set null; `title` text not null (the plan's title, for `/dev/plan-reviews`); `stars` integer not null, check 1–5; `why` text; `at` timestamptz not null. Unique `plan_reviews_user_plan` on (user_id, plan_id); index `plan_reviews_at` on `at`.
  - `progress_entries.block_id` text null, index `progress_entries_block`; `plan_day_times.blocks` jsonb null.
  - `libraryBlocksOf(plans: StoredPlan[]): LibraryBlock[]` with `interface LibraryBlock { id: string; key: BlockKey; parentId?: string; source: "ai" | "edit" }` — one per distinct block id, first seen wins (current plan first); `source` is `edit` when the exercise has a `parentBlockId`, else `ai` (a claimed or pasted plan is `ai`).
  - `slotBlocks(plans: StoredPlan[]): Record<string, string>` — exercise (slot) id → block id, for Task 9.
  - Repo (`repo.ts`): `type BlockSource = "ai" | "edit" | "seed" | "example"`; `interface NewBlock { id: string; key: BlockKey; parentId: string | null; source: BlockSource; enabledForReuse: boolean }`;
    `ownedBlockIds(userId: string, ids: string[]): Promise<Set<string>>`;
    `addBlocks(userId: string | null, blocks: NewBlock[], now: Date): Promise<void>` — one transaction: blocks `on conflict do nothing`, then owner rows `on conflict do nothing`; `null` user is the app.
    `putProgress` also writes `block_id` (`entry.blockId ?? null`, in values and on update); `putPlanTime` writes `blocks` (`t.blocks ?? null`); `listPlanTimes` selects `blocks`.
    Memory repo: owner rows keyed `${userId ?? ""} ${blockId}`, so all app (`null`) rows of a block are one, like `nulls not distinct`; `cascadeUser` also drops that user's owner rows (not blocks); test-only `peekBlocks(): Map<string, { key: BlockKey; parentId: string | null }>` and `peekOwners(): { userId: string | null; blockId: string; source: BlockSource; enabledForReuse: boolean }[]` on its return type.
  - `data.ts`: `storePlanBlocks(repo: UserDataRepo, userId: string, state: PlanState, now: Date): Promise<number>` (blocks newly owned) — ids from `libraryBlocksOf([current, ...history])`, minus `ownedBlockIds`; `parentId` kept only when the parent is in the owned set or in this document; `enabledForReuse: false`. `writeDoc` calls it after `putDoc` when `kind === "plan"`, with the parsed state (never the raw body).

- [ ] **Step 1: Schema and migration**

Edit `schema.ts` as above (doc comment on each table: what it holds, the never-updated rule, who owns). Then:
Run: `npx drizzle-kit generate --name blocks_and_reviews`
Expected: `drizzle/NNNN_blocks_and_reviews.sql` with `CREATE TYPE "block_source"`, three `CREATE TABLE`s, `UNIQUE NULLS NOT DISTINCT`, two `ALTER TABLE … ADD COLUMN`. Read it; nothing else in it.
Run: `grep DATABASE_URL .env.local; docker start musickit-db; DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit npm run db:migrate`
Expected: migrations applied, no error. `psql … -c '\d block_owners'` shows the unique index with `NULLS NOT DISTINCT`.

- [ ] **Step 2: Write the failing tests**

```ts
// libraryBlocks.test.ts
it("one LibraryBlock per distinct block, current plan first; edited ones are source edit with their parent", ...);
it("slotBlocks maps every slot id of every plan to its block id", ...);
// data.test.ts
test("writing a plan puts its blocks in the library, owned by the player as ai", async () => {
  await writeDoc(repo, "u1", "plan", planDoc([ex, ex2]), now);
  assert.deepEqual(new Set(repo.peekOwners().map((o) => [o.userId, o.source, o.enabledForReuse].join())), new Set(["u1,ai,false"]));
  assert.equal(repo.peekBlocks().size, 2);
});
test("the server works out block ids itself: a sent blockId is not used", ...);   // send blockId "0"*32 → stored id is blockIdOf(blockKeyOf(ex))
test("an edited block is owned as edit with its parent, only when the player owns the parent", ...); // u2 sends parentBlockId of u1's private block → parentId null
test("two players with the same block share one row and own it each", ...);
test("a stored block never changes: a later save naming another parent leaves it as it was", ...);
test("a second save of the same plan adds no rows", ...);   // storePlanBlocks returns 0
test("deleting an account drops its owner rows, not the blocks", ...);   // cascadeUser("u1")
test("a progress entry and a day time keep their block ids through the repo", ...);   // putEntry/readEntries, writePlanTime/readPlanTimes
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx tsx --test src/features/plan/model/libraryBlocks.test.ts src/features/userData/server/data.test.ts`
Expected: FAIL (`libraryBlocksOf`, `peekBlocks` missing).

- [ ] **Step 4: Implement `libraryBlocks.ts`, the repo methods (memory and Drizzle) and `storePlanBlocks`**

Drizzle `ownedBlockIds`: one `select block_id from block_owners where user_id = $1 and block_id = any($2)`. `addBlocks` with an empty list does nothing (no query).

- [ ] **Step 5: Run them to verify they pass, then the userData and plan suites**

Run: `npx tsx --test src/features/plan/model/*.test.ts src/features/userData/*.test.ts src/features/userData/server/*.test.ts src/features/progress/*.test.ts`
Expected: PASS. Then `npx tsc --noEmit 2>&1 | grep -v '^.next/'` prints nothing.

- [ ] **Step 6: Check the Drizzle repo against the local DB**

Start the dev server against the local DB (`DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit npm run dev`; memory local-login-db for signing in), rate one exercise on `/plan`, let the timer run a minute. Then `psql` shows: `blocks` rows for the plan, `block_owners` rows with your user and `ai`, `progress_entries.block_id` set, `plan_day_times.blocks` set. Edit one exercise's text in the day editor → a new `blocks` row with `parent_id`, owner `edit`.

- [ ] **Step 7: Docs**

userData README: the new repo methods, `storePlanBlocks` in `data.ts`, and that a plan save also fills the library. userData CLAUDE.md: "**Blocks are insert-only.** `addBlocks` never updates or deletes a `blocks` row; account deletion removes only `block_owners` rows. A `parent_id` is written only for a block the saver owns." Run `npm run db:diagram` and include `docs/db/schema.*` and `README.md` if they changed.

- [ ] **Step 8: Commit** (temp GIT_INDEX_FILE)
```
feat(db): a shared block library, filled when a plan is saved

blocks (insert-only, id = hash of content and tags), block_owners,
plan_reviews; progress_entries.block_id and plan_day_times.blocks.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 5: The plan review, stored

**Files:**
- Modify: `src/features/plan/model/types.ts`, `state.ts`, `schedule.ts`, tests `plan.test.ts`
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `data.ts`, test `data.test.ts`
- Modify: `src/features/userData/README.md`, `src/features/plan/README.md`

**Interfaces:**
- Consumes: `plan_reviews` table (Task 4), `writeDoc`'s plan branch (Task 4).
- Produces:
  - `export interface PlanReview { stars: Stars; why?: string; at: string }`; `StoredPlan.review?: PlanReview`.
  - `cleanReview(raw: unknown): PlanReview | null` (state.ts, exported) — valid `stars` and non-empty `at`; `why` trimmed, cut to `MAX_REVIEW_WHY = 1000` chars, kept only when stars ≤ 2 and non-empty. `cleanPlan` keeps `review` only when `cleanReview` gives one.
  - `reviewPlan(plan: StoredPlan, review: { stars: Stars; why?: string } | null, at: string): StoredPlan` (schedule.ts) — sets `review` (through `cleanReview`) or removes it.
  - Repo: `interface PlanReviewRow { planId: string; libraryPlanId: string | null; title: string; stars: Stars; why: string | null; at: Date }`;
    `syncPlanReviews(userId: string, planIds: string[], rows: PlanReviewRow[]): Promise<void>` — upsert on (user_id, plan_id), updating only when `at` differs; delete the user's rows whose `plan_id` is in `planIds` but not in `rows`. Rows for plans not in `planIds` (dropped from the history) are left.
    `listPlanReviews(limit: number): Promise<(PlanReviewRow & { userId: string })[]>` — every user's, newest `at` first.
  - `data.ts`: `reviewRowsOf(state: PlanState): PlanReviewRow[]` (pure; `libraryPlanId: null` until a stored plan records its library plan; `title` from `config.title`); `writeDoc` for `plan` also calls `syncPlanReviews(userId, [current, ...history].map(p => p.id), reviewRowsOf(state))`.

- [ ] **Step 1: Write the failing tests**

```ts
// plan.test.ts
it("cleanReview keeps stars and date, trims why, keeps why only under 3 stars, cuts it at 1000", () => {
  assert.deepEqual(cleanReview({ stars: 2, why: "  too fast ", at: AT }), { stars: 2, why: "too fast", at: AT });
  assert.deepEqual(cleanReview({ stars: 4, why: "kept?", at: AT }), { stars: 4, at: AT });
  assert.equal(cleanReview({ stars: 2, why: "x".repeat(5000), at: AT })!.why!.length, 1000);
  assert.equal(cleanReview({ stars: 6, at: AT }), null);
  assert.equal(cleanReview({ stars: 3 }), null);
});
it("reviewPlan sets and clears a review; sanitiseState drops a broken one and keeps a good one, history too", ...);
it("raising the stars from 2 to 4 drops the why; back to 2 the why is empty", ...);
// data.test.ts
test("a reviewed plan becomes a plan_reviews row with its title", ...);
test("changing the stars replaces the row; clearing the review removes it", ...);
test("a plan dropped from the history keeps its review row", ...);
test("listPlanReviews lists every player's, newest first", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tsx --test src/features/plan/model/plan.test.ts src/features/userData/server/data.test.ts`
Expected: FAIL (`cleanReview`, `reviewPlan`, `listPlanReviews` missing).

- [ ] **Step 3: Implement as in Interfaces**

- [ ] **Step 4: Run them to verify they pass**

Same command, then the suites from Task 4 Step 5. Expected: PASS; tsc clean.

- [ ] **Step 5: Docs**

plan README: `StoredPlan.review` (types.ts line), `reviewPlan` in schedule.ts. userData README: a plan save also syncs `plan_reviews`; `listPlanReviews`.

- [ ] **Step 6: Commit** (temp GIT_INDEX_FILE)
```
feat(plan): a plan review, kept on the plan and in plan_reviews

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 6: The review on Plan next week

**Files:**
- Create: `src/features/plan/ui/PlanReviewStep.tsx`
- Modify: `src/features/plan/ui/PlanFlow.tsx`, `src/features/plan/PlanApp.tsx`
- Modify: `src/features/plan/README.md` (the player's path, step 4)

**Interfaces:**
- Consumes: `PlanReview`, `reviewPlan` (Task 5), `weekOver` (schedule.ts), `StarRating` (`@/components/ui`).
- Produces:
  - `PlanReviewStep({ review, onReview }: { review: PlanReview | null; onReview: (r: { stars: Stars; why?: string } | null) => void })` — the stars (`StarRating`, its own five labels), and under 1 or 2 stars a textarea labelled exactly "Can you tell us why?". The textarea holds its own text (local state, seeded from `review.why`) and sends the trimmed text up on change, so typing spaces works; it empties when the stars go to 3 or more.
  - `PlanFlow` gets `review: PlanReview | null` and `onReview` props; when `mode === "next"` and the week is over (decided once at mount, in `useState`, so the step list and the saved step number stay stable), the review step is first, before "How did this week go?". `canNext` is always true (optional).
  - `PlanApp` passes `current.review ?? null` and `onReview={(r) => setPlan((p) => reviewPlan(p, r, new Date().toISOString()))}`; the save goes with the plan document (save notice and retry as for every plan change).

- [ ] **Step 1: Load the copy skills, then write the words**

Load `design:ux-copy` (if not installed, say so in the report and use "Words about the app" alone) and `teaching-voice` (its "Words about the app"). Write: the step title, its hint (says it's optional and that it is for the team who pick plans, not for the AI), the five star labels for how much they liked the plan (not the exercise scale's "Can't do it yet"…), and nothing celebratory after a pick. "Can you tell us why?" exactly. No exclamation marks, no score.

- [ ] **Step 2: Build `PlanReviewStep` and wire `PlanFlow` and `PlanApp` as in Interfaces**

- [ ] **Step 3: Check it on the dev server**

Local DB as in Task 4 Step 6. With a plan whose `startedOn` is 8+ days back (on the local DB only: change `data->'current'->>'startedOn'` in `user_documents` with psql; keep the user's localStorage, memory browser-test-keep-user-data), open **Plan next week**: the review is the first screen; 2 stars shows "Can you tell us why?"; type "too fast " (the space stays); 4 stars hides it; Next without stars works; reload mid-flow returns to the same step. Week not over: no review screen. `psql -c 'select * from plan_reviews'` shows the row with the plan's title; pick 1 star → the row changes. Phone width (CDP, memory worktree-dev-and-screenshots): the box fits the fixed body height.

- [ ] **Step 4: Run the checks**

Run: `npx tsx --test src/features/plan/model/*.test.ts; npx tsc --noEmit 2>&1 | grep -v '^.next/'; npx eslint src/features/plan/ui/PlanReviewStep.tsx src/features/plan/ui/PlanFlow.tsx src/features/plan/PlanApp.tsx`
Expected: tests pass, tsc and eslint print nothing.

- [ ] **Step 5: Docs**

plan README step 4: once the week is over, the first screen asks how the plan was (stars; under 1–2 stars "Can you tell us why?"), optional, kept as `StoredPlan.review` and in `plan_reviews`, separate from the exercise stars and from "How did this week go?".

- [ ] **Step 6: Commit** (temp GIT_INDEX_FILE)
```
feat(plan): Plan next week asks how the plan was

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
Report the new strings (none existed before: "— → <new>").

---

### Task 7: /dev/plan-reviews

**Files:**
- Create: `src/app/dev/(local)/plan-reviews/page.tsx`, `src/features/devtools/reviews/PlanReviewsTable.tsx`
- Modify: `src/features/devtools/registry.ts`, `src/features/devtools/README.md`

**Interfaces:**
- Consumes: `drizzleUserDataRepo(db).listPlanReviews(500)` (Task 5), `getDb()`.
- Produces: a local-only page (`dynamic = "force-dynamic"`, inside `DevShell`) listing every review newest first: date, stars (as a number), plan title, why, plan id, library plan id, user id. No charts. Without a database it says so in one line. Registry entry `{ href: "/dev/plan-reviews", label: "Plan reviews", tone: "prompt", desc: … }` (not `live`).

- [ ] **Step 1: Run the gate test (it checks the page sits in the folder its `live` flag says)**

Add the registry entry first. Run: `npx tsx --test src/features/devtools/gate.test.ts`
Expected: FAIL (no page under `(local)/plan-reviews`).

- [ ] **Step 2: Build the page and the table**

- [ ] **Step 3: Run the gate test, tsc and eslint**

Run: `npx tsx --test src/features/devtools/*.test.ts; npx tsc --noEmit 2>&1 | grep -v '^.next/'; npx eslint src/app/dev/\(local\)/plan-reviews/page.tsx src/features/devtools/reviews/PlanReviewsTable.tsx src/features/devtools/registry.ts`
Expected: PASS, nothing printed.

- [ ] **Step 4: Open `/dev/plan-reviews` on the dev server (local DB)**

Expected: the review made in Task 6 is listed first with its title.

- [ ] **Step 5: Commit** (temp GIT_INDEX_FILE)
```
feat(devtools): /dev/plan-reviews lists every plan review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 8: Seed the library from the examples and practice_plans

**Files:**
- Create: `src/features/userData/server/seedBlocks.ts`, test `src/features/userData/server/seedBlocks.test.ts`
- Create: `scripts/db-seed-blocks.ts`
- Modify: `package.json` (`"db:seed-blocks": "npx tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/db-seed-blocks.ts"`)
- Modify: `src/features/userData/README.md`

**Interfaces:**
- Consumes: `parsePlanConfig`, `parseExercise` (model/config.ts), `catalogue()`, `sanitiseState`, `libraryBlocksOf` (Task 4), `addBlocks(null, …)` (Task 4), `EXERCISE_EXAMPLES`, `PLAN_EXAMPLES`.
- Produces:
  - `exampleBlocks(): NewBlock[]` — every exercise example and every plan example's exercises, `source: "example"`, `enabledForReuse: false`.
  - `libraryPlanBlocks(replies: string[]): NewBlock[]` — each `practice_plans.reply` parsed with `parsePlanConfig`, `source: "seed"`, `enabledForReuse: true`; a reply that doesn't parse is skipped and named in the script's output.
  - Both pass each config through `sanitiseState({ current: { id, startedOn, done: {}, config } })` before `libraryBlocksOf`, so a seeded id is exactly the id a player's stored plan of the same exercise gets.
  - `seedBlocks(repo: UserDataRepo, replies: string[], now: Date): Promise<{ library: number; examples: number }>` — library blocks first, then examples, so a block in both stays `seed`, enabled.
  - Script: reads `practice_plans.reply` (all rows) with Drizzle, calls `seedBlocks(drizzleUserDataRepo(db), …)`, prints the counts. Refuses to run without `DATABASE_URL`; prints the host it writes to first.

- [ ] **Step 1: Write the failing tests**

```ts
test("an example's block id is the id a started plan of the same exercise gets", () => {
  const [b] = exampleBlocks().filter((x) => x.key.content.title === firstExampleTitle);
  const s = startPlan(EMPTY_STATE, parsedWeekOf(EXERCISE_EXAMPLES[0].exercise), randomId, "2026-11-15");
  assert.equal(s.current!.config.days[0].exercises[0].blockId, b.id);
});
test("seedBlocks: library blocks are owned by the app as seed, enabled; examples as example, not enabled", ...);
test("seedBlocks run twice adds nothing", async () => { await seedBlocks(repo, replies, now); const n = repo.peekOwners().length; await seedBlocks(repo, replies, now); assert.equal(repo.peekOwners().length, n); });
test("a reply that doesn't parse is skipped", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tsx --test src/features/userData/server/seedBlocks.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `seedBlocks.ts` and the script**

- [ ] **Step 4: Run the tests, then the script locally twice**

Run: `npx tsx --test src/features/userData/server/seedBlocks.test.ts`, then `DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit npm run -s db:seed-plans && DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit npm run -s db:seed-blocks` twice.
Expected: tests PASS; the second run's `select count(*) from block_owners where user_id is null` equals the first's.

- [ ] **Step 5: Commit** (temp GIT_INDEX_FILE)
```
feat(db): npm run db:seed-blocks puts the examples and library plans in the block library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 9: Move existing ratings and time over to blocks

**Files:**
- Create: `src/features/userData/server/moveOver.ts`, test `src/features/userData/server/moveOver.test.ts`
- Create: `scripts/db-move-over-blocks.ts`
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts` (`planUserIds`)
- Modify: `package.json` (`"db:move-over-blocks": "npx tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/db-move-over-blocks.ts"`)
- Modify: `src/features/userData/README.md`

**Interfaces:**
- Consumes: `readDoc` (gives block ids through `sanitiseState`), `storePlanBlocks` (Task 4), `slotBlocks` (Task 4), `listProgress`/`putProgress`, `listPlanTimes`/`putPlanTime`, `parseDayTime`.
- Produces:
  - Repo `planUserIds(): Promise<string[]>` — users with a `plan` document.
  - `moveOverUser(repo: UserDataRepo, userId: string, now: Date): Promise<{ blocks: number; entries: number; days: number }>` — stores the document's blocks and owner rows (`storePlanBlocks`); for each progress entry without `blockId` whose `exerciseId` is in `slotBlocks`, `putProgress` with `blockId` (also fills the column); for each plan in the document, each day time without `blocks` gets `blocks` for its slots with seconds and a known block. Entries and days whose plan is gone are left as they are. Nothing is deleted. Counts are what it changed.
  - Script: prints the database host, loops `planUserIds()`, prints per-user counts and totals. Not run against Supabase by the task.

- [ ] **Step 1: Write the failing tests**

```ts
test("moveOverUser fills block ids on entries and day times from the plan document", ...);
test("an entry whose plan is gone keeps no block id, and is not removed", ...);
test("nothing is deleted: entries, day times and documents count the same before and after", ...);
test("running it twice changes nothing the second time", async () => { await moveOverUser(repo, "u1", now); assert.deepEqual(await moveOverUser(repo, "u1", now), { blocks: 0, entries: 0, days: 0 }); });
test("planUserIds lists only users with a plan document", ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx tsx --test src/features/userData/server/moveOver.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `moveOverUser`, `planUserIds` (memory and Drizzle) and the script**

- [ ] **Step 4: Run the tests, then the script on the local DB twice**

Run: `npx tsx --test src/features/userData/server/*.test.ts`, then `DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit npm run -s db:move-over-blocks` twice.
Expected: PASS; the second run prints all zeros.

- [ ] **Step 5: Docs**

userData README: `moveOver.ts` and the script ("one-off; fills `progress_entries.block_id` and `plan_day_times.blocks` from each player's plan document; nothing deleted; safe to run again"). The run on the release database is the user's to start.

- [ ] **Step 6: Commit** (temp GIT_INDEX_FILE)
```
feat(db): a one-off move-over gives existing ratings and time their blocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 10: Whole-branch check

**Files:** none new; any doc found untrue.

- [ ] **Step 1: Run every check**

Run: `npm test` (or the cached tsx with the same globs), `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, `npx eslint` on every file changed since the plan began (`git diff --name-only <first commit>^ -- '*.ts' '*.tsx'`).
Expected: all pass, nothing printed.

- [ ] **Step 2: Read the docs against the code**

`src/features/plan/README.md` + `CLAUDE.md`, `src/features/progress/README.md`, `src/features/userData/README.md` + `CLAUDE.md`, `src/features/devtools/README.md`, `src/lib/db/schema.ts` comments: each names `blockId`, `parentBlockId`, `withBlockIds`, `DayTime.blocks`, `StoredPlan.review`, the three tables and the two scripts as built. Fix and commit any that aren't (temp GIT_INDEX_FILE, `docs: …`, Co-Authored-By line).

- [ ] **Step 3: Report**

State: tests/tsc/eslint results, what was seen on the dev server (Tasks 4, 6, 7), what wasn't, the copy strings from Task 6, that the blocks migration, `db:seed-blocks` and `db:move-over-blocks` ran only on the local DB, and offer to update the DB schema artifact (memory db-schema-artifact).
