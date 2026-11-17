# Plan Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player opens `/plan` and today's one-day plan is there, composed from library blocks by their path steps, with no AI.

**Architecture:** Picking is pure code in `src/features/plan/model` (which steps, which blocks, how many minutes), tested with plain data. A server route gathers its input (the player's stored plan, ratings and the library's blocks with their default minutes) and returns the composed exercises; the page puts them into the plan document through `usePlan().update`, as every other change does. Plans a player was given move to their own list and their own page.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before route or page code, per AGENTS.md), TypeScript, Drizzle + Postgres, `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-18-plan-composer-design.md`. Read it with this plan.

## Global Constraints

- No AI anywhere in the route or the page. No whole library plan used as it is.
- Not rating is different from a low rating: only a newest rating of 1 to 3 stars brings a block back. "Had" means rated.
- Solid is a newest rating of 4 or 5 (`SOLID_STARS` in `outcome.ts`); low is 1 to 3.
- The same block never appears two days running.
- Minutes a day set how much a day holds, nothing more. Nothing shortens the next day.
- `/plan` is the player's own plan. A given plan is never `current` and never composed over.
- No old data is read or moved: no migration of stored plan documents, no fallbacks for the seven-day `current`.
- Every failure shows on the page with what to do next; every `fetch` has a timeout (15 s, `AbortSignal.timeout`).
- Words on the screen: load `design:ux-copy` and `teaching-voice` ("Words about the app") before writing any. No hype, no exclamation marks, one name per control. Report strings old → new.
- Tests: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)`, then `$TSX --test <files>` (`npx tsx` hangs here). Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Eslint on changed files.
- Commits: other sessions share this checkout's index. Never `git add` into it; commit through a temporary `GIT_INDEX_FILE` (see the memory note "Shared index staging"). Commit to main, don't push.
- The database in `.env.local` is Supabase. Run nothing against it (migrate, seed, wipe) without asking in that moment.
- Keep `README.md` and `CLAUDE.md` of each touched feature true in the same commit.

## Review Focus

1. A player with no topic answered (persona `guitar-new`): gets a full day from the first steps of their areas, not an empty one (Task 3, Task 4).
2. A library whose blocks have no default minutes (seeded before Task 1) or no blocks at all: the route answers with an error the page shows, never a plan of zero exercises (Task 5, Task 7).
3. `/plan` open in two tabs, or the compose answer arriving twice: the second answer for the same date does not replace or double today's plan (Task 6).
4. The player's date differs from the server's (time zones, just past midnight): the route takes the player's local date when it is within one day of the server's and refuses any other (Task 5).
5. "Another plan" when the library has no other block for the day's steps: the page keeps the plan and says so; it never shows a turned-down block again that day and never loops (Task 4, Task 7).

**Order of work:** Tasks 1, 2, 3, 4, then 6 (the stored state), then 5 (the route, which reads today's plan through
Task 6's `ownDay`), then 7, 8, 9.

---

### Task 1: A block's default slot in the library

A block row has no minutes, why or lessons; a composed plan needs them.

**Files:**
- Modify: `src/lib/db/schema.ts` (`blocks`), new migration `drizzle/0025_block_slot.sql` via `npm run db:generate`
- Modify: `src/features/userData/server/repo.ts` (`NewBlock`), `repo.drizzle.ts` and the memory repo (`addBlocks`), `seedBlocks.ts`
- Modify: `src/features/library/server/types.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `fixture.ts`
- Test: `src/features/userData/server/seedBlocks.test.ts` (or the file that tests `seedBlocks` today), `src/features/library/server/repoContract.ts`

**Interfaces:**
- Produces:
  ```ts
  /** What a block needs to stand in a plan on its own. */
  export interface BlockSlot { minutes: number; why?: string; learnBefore?: string[]; exploreMore?: string[] }
  // NewBlock gains:  slot?: BlockSlot
  // BlockDetail gains:  slot: BlockSlot | null
  ```
  Columns on `blocks`: `minutes integer`, `why text`, `learn_before text[]`, `explore_more text[]`, all nullable.

- [ ] **Step 1: Failing tests.** In the seedBlocks test: (a) a seed block file's exercise with `minutes: 5, why: "w", learnBefore: ["/course/3/x"]` is stored with that slot; (b) the same block in a block file (4 minutes) and in two plans (`b-plan` 6 minutes, `a-plan` 8 minutes) keeps 4; (c) a block only in those two plans keeps 8 (`a-plan`, first by id); (d) running `seedBlocks` twice changes no slot. In `repoContract.ts`: `getBlock` returns `slot` equal to what was stored, and `null` for a block stored without one.
- [ ] **Step 2: Run them, expect FAIL** (`slot` unknown).
- [ ] **Step 3: Implement.** Add the columns and generate the migration. `addBlocks` writes the slot on insert and, for a row already there, fills it only while `minutes` is null (the same "filled once" rule provenance has). `seedBlocks` passes `slot` from each parsed exercise and feeds block files before plans, plans in id order, so the first writer is the right one. `getBlock` reads it.
- [ ] **Step 4: Run tests, expect PASS;** `npm run -s test:library-db` only if `LIBRARY_TEST_DATABASE_URL` points at a local `_test` database, else say it was not run.
- [ ] **Step 5: Commit** `feat(library): a block keeps its default minutes, why and lessons`.

### Task 2: The composer's blocks from the library

**Files:**
- Modify: `src/features/library/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `repoContract.ts`, `types.ts`

**Interfaces:**
- Consumes: `BlockSlot` (Task 1).
- Produces:
  ```ts
  /** A block the composer may pick: owned by the app, enabled for reuse, with a slot. */
  export interface ComposeBlock {
    id: string; content: Block; area: string; topic: string | null; concepts: string[]; steps: string[];
    level: string | null; tags: string[]; slot: BlockSlot;
    /** all players together, counted for these blocks only */
    use: { times: number; seconds: number };
    /** this player's newest rating of the block; null when never rated */
    mine: { stars: Stars; ratedAt: string } | null;
  }
  // LibraryRepo gains:
  composeBlocks(player: string, areas: string[]): Promise<ComposeBlock[]>;
  ```

- [ ] **Step 1: Failing contract tests** in `repoContract.ts` (they run on the memory repo in `npm test`): returns only app-owned, enabled blocks of the given areas that name at least one step and have a slot; leaves out a block only another player owns; `mine` is the player's newest rating by `at` and null for a block they opened but never rated; `use` counts every player's time on the block.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement in both repos.** In Drizzle, narrow the time and rating totals to the candidate ids (`block_id = any(...)`) instead of summing the whole tables (NEW8's note). No limit: the library is hundreds of blocks.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(library): composeBlocks, the blocks a plan can be made from`.

### Task 3: Which steps a day works on

**Files:**
- Create: `src/features/plan/model/daySteps.ts`
- Test: `src/features/plan/model/daySteps.test.ts`

**Interfaces:**
- Consumes: `reach` (`reach.ts`), `stepAt`, `PATH` (`path.ts`), `topicsFor` (`intake/topics.ts`), `reachIndex` (`outcome.ts`), `ProgressEntry`.
- Produces:
  ```ts
  export interface DaySteps {
    /** within reach and not solid, one per topic before any topic's second; the opening topic rotates with the date */
    fresh: string[];
    /** ahead only because the topic's cap is full (`open`), same order */
    open: string[];
    /** solid steps, rated longest ago first */
    review: string[];
  }
  /** When each solid step was last rated: the newest rating that counts for it (`reachIndex`), as an ISO datetime. */
  export function solidRatedAt(entries: ProgressEntry[]): Map<string, string>;
  export function daySteps(input: { answers: PlanAnswers; solid: Map<string, string>; date: string }, tracks?: Track[]): DaySteps;
  ```

- [ ] **Step 1: Failing tests**, with small hand-made `tracks` where the real `PATH` would be noise:
  - `guitar-new` persona (no topics answered, real `PATH`): `fresh` is not empty, every ref is a guitar track's, and no topic appears twice before every topic with a within-reach step has appeared once.
  - areas `["voice"]`: no guitar or theory ref in `fresh`, `open` or `review`.
  - a step in `solid` is in `review`, not in `fresh`; two solid steps rated 2026-11-01 and 2026-11-10 come out in that order.
  - a solid step of an area the player did not pick is not in `review`.
  - `date` "2026-11-18" and "2026-11-19": the same set of `fresh` steps, a different first topic (when two or more topics have one).
  - `solidRatedAt`: a 5-star entry naming `breath:4` dates `breath:1` to `breath:4`; a later 2-star entry on `breath:4` removes it; an entry with no `steps` adds nothing.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** `reach({ topics: answers.topics, solid: solid.keys() })`, keep refs whose track's area is in `answers.areas`. Topic order: `answers.areas` in order, each area's `topicsFor`, rotated by the day number of `date` (days since 1970-01-01) modulo the number of topics that have a step. Inside a topic keep the order `reach` returns (starting steps first, then the slope).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(plan): the steps a day's plan works on`.

### Task 4: Composing a day, and seven

**Files:**
- Create: `src/features/plan/model/compose.ts`
- Test: `src/features/plan/model/compose.test.ts`

**Interfaces:**
- Consumes: `daySteps`, `DaySteps` (Task 3); `stepAt`; `mulberry32` from `@/lib/improv/schillinger`.
- Produces:
  ```ts
  /** A library block as the composer sees it. `exercise` is ready to sit in a plan (content, slot and tags together). */
  export interface Candidate {
    blockId: string; steps: string[]; minutes: number;
    use: { times: number; seconds: number };
    mine: { stars: Stars; ratedAt: string } | null;
    exercise: PlanExercise;
  }
  export interface ComposeInput {
    answers: PlanAnswers;
    solid: Map<string, string>;          // solidRatedAt
    blocks: Candidate[];
    date: string;                        // local yyyy-mm-dd
    /** block ids of the day before: never picked */
    yesterday: string[];
    /** exercises rated today, kept as they are (asking for another plan) */
    keep: PlanExercise[];
    /** block ids turned down today: never picked */
    declined: string[];
    /** who and which try: `${playerId}:${date}:${attempt}` */
    seed: string;
  }
  export interface ComposedDay {
    exercises: PlanExercise[];           // kept ones first, then new picks, review blocks last
    /** the steps the new picks work on, in order */
    steps: string[];
    /** under the minutes by more than 5: the library has no more for these steps */
    short: boolean;
  }
  export function composeDay(input: ComposeInput): ComposedDay;
  /** Seven days for a teacher's student: each day gets the days before it as its history; no ratings arrive in between. */
  export function composeWeek(input: Omit<ComposeInput, "keep" | "declined" | "yesterday">, days?: number): ComposedDay[];
  ```

- [ ] **Step 1: Failing tests** (candidates built by a small helper `cand(id, steps, minutes, mine?)`):
  - minutes: 20 minutes of 5-minute blocks gives 4 exercises; total is never under 15 when blocks exist and never 20 + a whole extra block; `short` false.
  - new and review: with one solid step, exactly one exercise is on a `review` step and it is last; with `answers.minutes` 30, two; with nothing solid, none.
  - a block rated 2 stars on a fresh step is picked before an unrated one on that step; a block rated 5 is picked only when the step has no unrated and no low-rated block; an unrated block that was opened (no `mine`) is treated as new.
  - among unrated blocks the least used (`seconds`, then `times`, then id) few are the pool: with 10 unrated blocks on one step, across 30 seeds the pick is always one of the 3 least used and not always the same one.
  - `yesterday` and `declined` ids never appear, also when they are the only blocks on a step: then the nearest earlier step of that track with a block is used.
  - when fresh steps run out before the minutes: `open` steps next, then a second block on a step already in the day, then more review blocks, then `short: true`. One test per rung of that order.
  - `keep`: kept exercises come first and unchanged; with 8 of 20 minutes kept, new picks fill about 12; with every exercise rated (20 of 20 kept) a fresh set of about 20 is added; no new pick repeats a kept block.
  - Review Focus 1: `guitar-new` answers and a candidate per first step give a full day.
  - Review Focus 5: every block for the day's steps in `declined` and no earlier step: `exercises` equals `keep`, `short` true, and the call returns (no loop).
  - same input, same output; another `seed` may change the picks but not the steps.
  - `composeWeek`: 7 days; no block on two days running; day 2's `yesterday` is day 1's blocks.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Budget: `answers.minutes` minus the kept minutes; when 5 or less is left, the full `answers.minutes` again. Review count: 2 when `answers.minutes >= 30`, else 1, capped by the solid steps. A block is added only while the total is under the budget. The random pool for unrated blocks is the first `max(3, ceil(n / 5))` by use. Seed: FNV-1a 32-bit of `seed` into `mulberry32`. The pick for one step, in order: newest rating 1 to 3 (most recently rated first), unrated from the pool, rated 4 or 5 longest ago.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(plan): composeDay and composeWeek`.

### Task 5: The compose route

**Files:**
- Create: `src/features/plan/server/composeToday.ts`, `src/app/api/me/plan/compose/route.ts`
- Test: `src/features/plan/server/composeToday.test.ts`

**Interfaces:**
- Consumes: `composeDay`, `Candidate` (Task 4); `solidRatedAt` (Task 3); `composeBlocks` (Task 2); `readDoc`, `readEntries` (`userData/server/data.ts`); `signedIn`, `userData` (`userData/server/http.ts`); `ownDay` (Task 6: today's own plan in a `PlanState`, or null).
- Produces:
  ```ts
  export type ComposeAnswer =
    | { ok: true; day: ComposedDay; date: string; attempt: number }
    | { ok: false; code: "no-answers" | "bad-date" | "no-blocks" };
  export async function composeToday(
    d: { library: LibraryRepo; userData: UserDataRepo; today?: () => string },
    player: string, body: { date: string; another: boolean },
  ): Promise<ComposeAnswer>;
  ```
  `POST /api/me/plan/compose` with `{ date, another }` answers 200 with the `ok: true` shape, 409 `{ error, code }` for the three codes, and the usual 401/403/503 from `signedIn`.

- [ ] **Step 1: Failing tests** on memory repos:
  - no stored answers → `no-answers`.
  - `date` not `yyyy-mm-dd`, or more than one day from `today()` → `bad-date`; one day ahead and one day behind are taken (Review Focus 4).
  - the areas' blocks are none, or none has a slot → `no-blocks` (Review Focus 2).
  - first call of a day: `attempt` 0, `yesterday` is the block ids of the newest own day before `date`, `keep` and `declined` empty.
  - `another: true` with today's plan stored: `attempt` is the stored attempt + 1, `keep` is today's rated exercises, `declined` is the stored declined ids plus today's unrated block ids.
  - a given plan in `state.given` is never read as yesterday or today.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** A `Candidate`'s `exercise` is the block's content with its slot, area, topic, concepts, steps, level and tags. The route follows `src/app/api/me/plan/time/route.ts` (`runtime = "nodejs"`, `dynamic = "force-dynamic"`, `json(body, status, me.cookies)`). It writes nothing: the page stores the day.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(plan): the route that composes today's plan`.

### Task 6: One-day plans and given plans in the stored state

**Files:**
- Modify: `src/features/plan/model/types.ts`, `schedule.ts`, `state.ts`, `added.ts`, `reminders.ts`, `planTime.ts`
- Modify: `src/features/userData/server/shares.ts` (`claimInvite`), `data.ts` (`storePlanBlocks`, review rows), `src/features/library/server/query.ts` (`playerProgress`)
- Test: `schedule.test.ts`, the state tests, the shares tests, `reminders` tests

**Interfaces:**
- Produces:
  ```ts
  // StoredPlan gains, for a composed day only:
  composed?: { attempt: number; declined: string[]; short: boolean };
  // PlanState gains:
  given: StoredPlan[];                    // plans the player was given (`from` set), newest first; EMPTY_STATE has []
  export const planDays = (p: StoredPlan): number => p.config.days.length;
  /** Today's own plan when `current` is a composed day started on `date`, else null. */
  export function ownDay(s: PlanState, date: string): StoredPlan | null;
  /** Puts a composed day in as `current`; the day before moves to the front of `history`. Called again for the same
   *  date and attempt, it returns `s` unchanged. */
  export function startDay(s: PlanState, day: ComposedDay, meta: { date: string; attempt: number }, newId: () => string): PlanState;
  /** Today's plan replaced by another try: kept exercises keep their slot ids and their ratings, re-keyed to their new
   *  places; the block ids dropped join `declined`. */
  export function anotherDay(s: PlanState, day: ComposedDay, meta: { date: string; attempt: number }, newId: () => string): PlanState;
  export const givenPlan = (s: PlanState, id: string): StoredPlan | undefined;
  ```
  A composed day is a `StoredPlan` whose `config.days` has one day, `startedOn` its date, `config.title` and the day's `theme` set by Task 7.

- [ ] **Step 1: Failing tests:**
  - `startDay` twice with the same date and attempt leaves one plan and an unchanged history (Review Focus 3); a new date moves the old day to `history[0]`.
  - `history` keeps 60 days (was 20); `fitPlanState` still drops the oldest when the document is too big.
  - `anotherDay`: a day with exercises A (rated 4), B, C and a new day [A, D, E]: `rated` has only `0:0` with A's rating, A keeps its `id`, `composed.declined` holds B's and C's block ids, `composed.attempt` is the new one.
  - `weekOver`, `reminderDue` and `planTime` use `planDays(plan)`: a one-day plan is over the day after `startedOn`; a seven-day given plan behaves as before.
  - `sanitiseState` gives `given: []` to a document without it and drops a `given` entry with no `from`.
  - `claimInvite`: the copy goes to `given` whether or not `current` is set; `current` and `history` are untouched; claiming the same invite twice adds one.
  - `storePlanBlocks` and `playerProgress` count the plans in `given` too.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** `PLAN_DAYS` stays 7 and stays the rule for a parsed plan (`parsePlanConfig`, the prompt); everything that asks "how long is this plan" asks `planDays`. Nothing reads a seven-day `current` as the player's own plan any more.
- [ ] **Step 4: Run the plan, userData and library tests, expect PASS.**
- [ ] **Step 5: Commit** `feat(plan): one-day plans, and given plans in their own list`.

### Task 7: `/plan` shows today's plan

**Files:**
- Create: `src/features/plan/store/composeClient.ts`, `src/features/plan/ui/DayPlan.tsx`
- Modify: `src/features/plan/PlanApp.tsx`, `ui/PlanFlow.tsx` (last screen, `SavedNotice`), `ui/WeekView.tsx` (the one-day view shares its exercise list), `README.md`, `CLAUDE.md`
- Test: `src/features/plan/store/composeClient.test.ts`

**Interfaces:**
- Consumes: the route (Task 5), `startDay`, `anotherDay`, `ownDay` (Task 6), `usePlan`, `PlanStore.flush`.
- Produces:
  ```ts
  export type ComposeResult = { ok: true; day: ComposedDay; date: string; attempt: number } | { ok: false; code: "no-answers" | "bad-date" | "no-blocks" | "offline" | "failed" };
  /** Asks the server for today's plan. Never throws; 15 s timeout. */
  export function requestDay(body: { date: string; another: boolean }, fetcher?: typeof fetch): Promise<ComposeResult>;
  ```

- [ ] **Step 1: Load the copy skills** (`design:ux-copy`, `teaching-voice`) and write every string of this task first, in a list in the commit message draft: the day's title and theme (from its date and topics), the control that asks for another plan, the line while a plan is being made, the short-day line, the line when no other exercises exist for today's steps, the three error states (`no-blocks`, `offline`/`failed` with a retry control, `bad-date`), the flow's last screen now that plans are ready, the past-days heading.
- [ ] **Step 2: Failing tests** for `requestDay`: a 200 gives the day; a 409 gives its code; a thrown fetch gives `offline`; a non-JSON or 500 answer gives `failed`; an abort after the timeout gives `failed`.
- [ ] **Step 3: Implement the page.**
  - When the store is loaded, answers exist and `ownDay(state, localDate())` is null: flush the store, call `requestDay({ another: false })`, then `update((s) => startDay(...))`. It runs once per page view and date; a ref guards React's double effect.
  - With no answers: the intro and Start as today. Finishing the flow saves the answers and goes straight to the plan (no "New plans aren't ready yet" screen, no `SavedNotice` about plans not being ready).
  - `DayPlan` draws the one day's exercises (the list `WeekView` draws for a day, with ratings and the timer) with no day strip and no "Day N of 7".
  - The control for another plan: flush, `requestDay({ another: true })`, `update((s) => anotherDay(...))`. When the answer's new picks are none, the plan stays and the page says there are no other exercises for today's steps (Review Focus 5).
  - `composed.short` shows the short-day line under the plan.
  - Errors show inline where the plan would be, with what to do next; `no-blocks` is not retried automatically (Review Focus 2).
  - Past days: `history`'s composed days, newest first, the last 14, each opening read-only as the History list does today. The week report ("Review this week") and "Start anew" leave `/plan`.
- [ ] **Step 4: Run** the plan tests, tsc and eslint; expect clean.
- [ ] **Step 5: Read it on the dev server** as a signed-in player (mock `/api/auth/session` in Playwright if the user's server can't log in; don't create accounts on Supabase): a first day after the questionnaire, a rating, another plan, a reload. Say what was and wasn't seen.
- [ ] **Step 6: Commit** `feat(plan): /plan shows today's plan, composed from the library`.

### Task 8: A given plan on its own page

**Files:**
- Create: `src/app/plan/given/[id]/page.tsx`, `src/features/plan/GivenPlan.tsx`
- Modify: `src/features/plan/ui/InviteClaim.tsx` (lands on `/plan/given/<planId>` with a full page load), `PlanApp.tsx` (a list of given plans; the `?added=` handling and `AddedNotice` go), `model/added.ts` (removed if nothing reads it), `src/features/userData/server/shares.ts` (`sharePlan` shares the plan the page names: today's own day or a given plan), `src/features/plan/model/catalogue.ts` or `src/lib/publicPaths.ts` only if a path list needs the new route
- Test: the shares tests; a render test for `GivenPlan` (found, not found)

**Interfaces:**
- Consumes: `givenPlan`, `planDays` (Task 6); `WeekView`.

- [ ] **Step 1: Copy first** (skills as in Task 7): the heading of the list on `/plan`, the given plan's header, the not-found state ("this plan isn't in your account" in the app's words, with a link back to `/plan`).
- [ ] **Step 2: Failing tests:** `GivenPlan` with an id in `state.given` draws its week; with an unknown id draws the not-found state; ratings on a given plan write to `state.given`, not `current`.
- [ ] **Step 3: Implement.** `GivenPlan` is `PlanApp`'s seven-day view (day strip, "Day N of 7", ratings, timer, Share plan) reading and updating one plan in `given`. Read `src/features/plan/CLAUDE.md` on Share plan first: the invite page still claims, then loads the new address with `window.location.replace`.
- [ ] **Step 4: Run tests, tsc, eslint; read both pages on the dev server.**
- [ ] **Step 5: Commit** `feat(plan): a given plan opens at its own address`.

### Task 9: Data, docs, and the last read

- [ ] **Step 1: Ask the user** before each of these on the `.env.local` database, naming its host: `npm run db:migrate` (0025), the wipe of player data (`db:wipe`: read the script first and say what it deletes), the library reset and `db:seed-plans` + `db:seed-blocks`. After the reseed every app-owned block has minutes (`select count(*) from blocks where minutes is null` joined to app owners is 0); a second `db:seed-blocks` changes nothing.
- [ ] **Step 2: `/dev` check.** With a test player, call the route and compare with `find_blocks` by the day's steps (the `musickit-library` MCP tools).
- [ ] **Step 3: Docs.** `src/features/plan/README.md` (the player's path, storage, the code map), `src/features/library/README.md` (the slot, `composeBlocks`), `tasks.txt` NEW7 note (done, where; left: teacher screens, PricingFaq1, the six steps with no block). `/terms` and pricing texts are PricingFaq1, not this plan.
- [ ] **Step 4: Full run.** `npm test` through the tsx binary under bash with `nullglob`, tsc, eslint on every changed file. Report what was checked and what wasn't.
- [ ] **Step 5: Commit** `docs: the plan composer (NEW7)`.

## Calls made in this plan that the spec left open

- The route composes and returns; the page stores. The plan document is saved by the browser today, and a server write beside it would race it.
- A composed day is a `StoredPlan` with one day; past days are `history`, raised from 20 to 60. The spec says every past day is kept: the document has a size cap (`fitPlanState`), so the oldest days fall off when it is full. Ratings live in the progress log and are never dropped.
- Given plans live in `PlanState.given` and open at `/plan/given/<planId>`.
- "Another plan" counts kept minutes: with some exercises rated, only the rest of the minutes are refilled; with all rated, a full new set is added.
