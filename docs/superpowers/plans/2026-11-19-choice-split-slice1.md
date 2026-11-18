# ChoiceSplit, first slice: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A block states what may change about it (`moves`: key, tempo); the composer rolls a version per exercise from the player's last rating and stores it on the slot (`given`); the card draws that version; three seed blocks use it.

**Architecture:** Three new pure modules in `src/features/plan/model/`: `moves.ts` (the block's `moves`, the slot's `given`, drawing a block in a version), `keyStages.ts` (a track's key order and which keys are open or earned), `roll.ts` (the weighted roll). `explainDay` calls the roll after the picks, where it gives keys today. The reader draws chips and fills text params. Old-shape blocks (a Key selector inside a section) keep working through `withKeys`.

**Tech Stack:** TypeScript, React (Next.js: read `node_modules/next/dist/docs/` before touching a page), node's test runner through tsx.

**Spec:** `docs/superpowers/specs/2026-11-18-choice-split-design.md`. Read all of it. This plan builds its "First slice" section only: no position moves, no key order on tracks other than `pentatonic-positions`, no /dev/library version switcher, no mass rewrite.

## Global Constraints

- Read `AGENTS.md`, `src/features/plan/CLAUDE.md` and `README.md`, `src/features/library/seed/CLAUDE.md` and `README.md` first. Keep each README true in the commit that changes its feature.
- Tests: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (`npx tsx` hangs here). Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. ESLint on changed files.
- Commits go straight to main through a temporary index (`GIT_INDEX_FILE`, `read-tree HEAD`, add only your files, `write-tree`, `commit-tree`, `update-ref`, then `git reset -q -- <files>`). Never `git add` in the main checkout: other sessions commit the shared index. Don't push.
- Every word a player reads is written with a skill loaded first: seed text with `exercise-example` then `review-teaching-text`; interface copy with `design:ux-copy` plus "Words about the app" in `teaching-voice`.
- Music facts come from `npm run -s theory -- help`, never by hand.
- A block id is of the block as written: `moves` is in it, `given` never is.
- All numbers of the roll live in one exported table (`ROLL`), nowhere else.
- No backfill or migration script for stored data. Never run a migration against Supabase (`DATABASE_URL` in `.env.local`): write it, run it on the local database only, and report.
- A rule change that changes what seed files or the prompt must contain raises a version with a `CHANGELOG.md` entry in the same commit (AGENTS.md, "Version"). Seed `versions` are never raised by hand, only by a rewrite.
- Player-facing word for a scale shape is "position", never "box".

## Review Focus

1. A block with `moves` drawn with no `given` (a shared plan, /dev/library, /dev/block, a plan stored before this change): drawn as written, params filled from its tools, no chips, no crash. Test in Task 2.
2. A stored `given` that no longer fits the block (bpm above `to`, a `back` value equal to `now`, not numbers): `cleanGiven` drops the bad part, the block draws from what is left. Test in Task 1.
3. Progress rows with no `given` (every row written before this change) for a block that now has `moves`: read as the first-play version, `moved` 0, and they count for the step as today. Tests in Tasks 4 and 5.
4. A rating cleared after a move (its row is removed): the roll reads the row before it, and the version is the same on every compose until a new rating. Test in Task 4 (same history, same seed, same result; different newest row id, possibly different result).
5. A tempo move on a block where one tool pins `bpm` or sits at its tool's top tempo: that tool stays or clamps, the others move, `{{=bpm}}` reads the first unpinned tool. Test in Task 2.

---

### Task 1: `moves` on the block, `given` on the slot

**Files:**
- Create: `src/features/plan/model/moves.ts`, `src/features/plan/model/moves.test.ts`
- Modify: `src/features/plan/model/types.ts` (`Block.moves`, `ExerciseMeta.given` in place of `keys`), `config.ts` (`parseBlock`, `parseExercise` read `moves`, warnings), `blockId.ts` (`blockKeyOf` content includes `moves`), `cleanExercise.ts` (`given` in place of `keys`), `compose.ts` and `ui/ExerciseCard.tsx` (rename only: `keys` → `given.keys`), their tests
- Test: `moves.test.ts`, `plan.test.ts` (block id), `cleanExercise` tests

**Interfaces:**
- Produces:
  ```ts
  export interface Moves { key?: "any"; bpm?: { from: number; to: number; step: number } }
  export interface Stepped { now: number; back: number[] }
  export interface Given { keys?: PlayerKeys; bpm?: Stepped; moved?: number }
  export function parseMoves(raw: unknown, tools: PlanTool[]): { moves: Moves | null; warnings: string[] }
  export function cleanGiven(raw: unknown, moves: Moves | undefined): Given | null
  ```
  `Block.moves?: Moves`; `ExerciseMeta.given?: Given`.

- [ ] **Step 1: Failing tests** in `moves.test.ts`:
  - `parseMoves({ key: "any", bpm: { from: 60, to: 90, step: 10 } }, tools)` returns it with no warning when the first tool with a bpm is at 60.
  - `bpm.from` 70 with the first bpm tool at 60: warning `moves: bpm starts at 70 but the first tool with a tempo is at 60.` and `from` set to 60.
  - `to < from`, `step < 1`, a `key` other than `"any"`, an unknown part (`position` in this slice): that part dropped with a warning naming it.
  - `key: "any"` with no tool that can change key (`canFollowPart`): dropped, warning `moves: no tool that can change key.`
  - `cleanGiven({ keys: { now: [9], back: [] }, bpm: { now: 120, back: [60] } }, { bpm: { from: 60, to: 90, step: 10 } })` → `{}` → `null` (keys with no key move dropped; bpm outside `from..to` dropped).
  - `cleanGiven` keeps `moved` only as a whole number ≥ 0; drops a `back` entry equal to `now` or repeated; caps `back` at 2 for bpm.
  - Block id: two exercises equal but for `moves` have different `blockIdOf(blockKeyOf(e))`; equal but for `given` have the same.
- [ ] **Step 2:** Run `tsx --test src/features/plan/model/moves.test.ts`; expect failures on the missing module.
- [ ] **Step 3:** Implement. `parseBlock` / `parseExercise` call `parseMoves` with `toolsOf` of every cell (sections' too) and push its warnings; a block with `moves` and an `options` choice that sets key or bpm gets the warning `has moves and a choice that sets the same part; the choice is left out.` and loses that choice. `cleanExercise` replaces its `keys` lines with `cleanGiven` (an old stored `keys` is dropped, not read). `cleanGiven` keeps `given.keys` for a block with no `moves` when the block `hasKeySelector` (the old shape).
- [ ] **Step 4:** Run the model tests (`src/features/plan/model/*.test.ts`), tsc, eslint. All pass.
- [ ] **Step 5:** Commit `feat(plan): a block's moves and the slot's given`.

### Task 2: Drawing a block in a version

**Files:**
- Modify: `src/features/plan/model/moves.ts`, `moves.test.ts`

**Interfaces:**
- Consumes: `Moves`, `Given` (Task 1); `transposeTool`, `follows` and the bpm clamp of `choice.ts` (export what is needed, don't copy it).
- Produces:
  ```ts
  export type MovePart = "key" | "bpm";
  export interface Selector { part: MovePart; values: number[]; back: number }   // values: now first, then back; `back`: index where the earlier ones start, values.length when none
  export type At = Partial<Record<MovePart, number>>;                             // index into a selector's values; absent: 0
  export function selectorsOf(block: Pick<Block, "moves">, given: Given | null | undefined): Selector[]   // only parts with more than one value
  export function written(block: Pick<Block, "moves" | "cells">): { key: number | null; bpm: number | null } // first tool that follows the part
  export function applyGiven<B extends Pick<Block, "title" | "moves" | "cells">>(block: B, given: Given | null | undefined, at?: At): B
  ```
  `applyGiven` returns the block with tools moved to the values at `at`, and `{{=key}}` / `{{=bpm}}` filled in the title, section headings, text cells and list items. A block with no `moves` is returned as it is.

- [ ] **Step 1: Failing tests:**
  - Key: a block written in A (9) with `given.keys = { now: [7, 9], back: [] }`: every scale-neck and backing-band is in G at `at = {}` and in A at `{ key: 1 }`; a tool with `pinned: ["key"]` stays in A.
  - Tempo by distance: tools at 60 and 80, `moves.bpm.from` 60, `given.bpm.now` 70 → 70 and 90. A `backing-track` at its top tempo stays at the top (clamped). A tool with `pinned: ["bpm"]` stays.
  - Params: title `"{{=key}} minor pentatonic"` → `"G minor pentatonic"`; text `"at {{=bpm}}"` → `"at 70"`; `{{1}}` and `{{c-sharp}}` are untouched.
  - No `given`: tools unchanged, `{{=key}}` → the written key's name (`keyName`), `{{=bpm}}` → the written bpm (Review Focus 1).
  - A param with no value (a `{{=bpm}}` in a block with no bpm tool) is left out of the text, never shown raw.
  - `selectorsOf`: `given.bpm = { now: 70, back: [60] }` → `[{ part: "bpm", values: [70, 60], back: 1 }]`; one key and no back → no key selector.
  - Review Focus 5 as written above.
- [ ] **Step 2:** Run; expect failures.
- [ ] **Step 3:** Implement in `moves.ts`.
- [ ] **Step 4:** `parseMoves` gains: a `{{=key}}` or `{{=bpm}}` in a block with no such move → warning `text names {{=bpm}} but the block has no tempo move.` (test it). Run model tests, tsc, eslint.
- [ ] **Step 5:** Commit `feat(plan): draw a block in a given version, with text params`.

### Task 3: Key order on a track, key stages

**Files:**
- Create: `src/features/plan/model/keyStages.ts`, `keyStages.test.ts`
- Modify: `src/features/plan/model/path.ts` (`Track.keys?: number[][]`, pitch classes, groups, first key first; an optional last argument of `g` / `v` / `t`)

**Interfaces:**
- Consumes: `KEY_LADDERS` (`keys.ts`), `stepAt` (`path.ts`), `ProgressEntry` with `given` (typed in Task 5; here read as `(row as { given?: Given }).given`, tightened in Task 5).
- Produces:
  ```ts
  export function trackKeys(track: Track): number[][]                       // track.keys, else KEY_LADDERS[track.area]
  export function keyTrackOf(steps: readonly string[], tracks?: Track[]): { track: Track; step: string } | null  // the first step named
  export interface TrackKeys { first: number; open: number[]; earned: number[] }
  export function playerKeys(track: Track, step: string, rows: ProgressEntry[], start: number): TrackKeys
  ```
  `start` is the stage the keys answer starts the player on (`answers.keys ?? 0`, capped to the last group). `first`: the first key of group `start`. `open`: the keys of groups `0..n` in order, where `n` starts at `start` and goes up by one for each stage `k ≥ start` that has a row naming `step`, with 4 or 5 stars, whose `given.keys.now[0]` is in group `k`. `earned`: every key that is `given.keys.now[0]` of a 4-or-5-star row naming any step of the track, in track order.

- [ ] **Step 1:** Set `pentatonic-positions` keys to `[[9], [7, 4]]` followed by groups you propose after checking each key's position 1 fret with `npm run -s theory -- box <key> minor <root>` / `help` (frets within reach of a beginner first). List the groups you chose in the task report for the user to read.
- [ ] **Step 2: Failing tests:**
  - `trackKeys` of `pentatonic-positions` starts `[[9], [7, 4]]`; of a guitar track without keys equals `KEY_LADDERS.guitar`.
  - No rows, start 0: `{ first: 9, open: [9], earned: [] }`.
  - A row on `pentatonic-positions:1`, 5 stars, opened in A: for step `:1` `open` is `[9, 7, 4]`, `earned` `[9]`; for step `pentatonic-positions:3` (position 2) `open` is `[9]` and `earned` `[9]` (a stage opens per step, keys are earned per track).
  - The same row with 3 stars opens and earns nothing. A row with no `given` earns nothing.
  - Start 1: `first` is 7 and `open` is `[9, 7, 4]` with no rows.
- [ ] **Step 3:** Implement. Run the tests, the path tests (`path.test.ts` if present), tsc, eslint.
- [ ] **Step 4:** Commit `feat(plan): a track's key order and key stages`.

### Task 4: The roll

**Files:**
- Create: `src/features/plan/model/roll.ts`, `roll.test.ts`

**Interfaces:**
- Consumes: `Moves`, `Given`, `MovePart` (Tasks 1-2), `TrackKeys` (Task 3).
- Produces:
  ```ts
  export const ROLL = { low: { back: 0.7 }, mid: { move: 0.3 }, high: { move: 0.8 }, weights: { bpm: 3, key: 2 }, earnedOnFirst: 0.5, maxNow: 3, maxBack: 2 };
  export interface VersionRow { id: string; stars: number; given?: Given }           // this block's rated rows, newest first
  export interface MoveIn { part: MovePart; weight: number; to: number }
  export interface RollTrace { last: { stars: number; given: Given } | null; outcome: "first" | "back" | "same" | "move"; odds: { back: number; same: number; move: number }; movesIn: MoveIn[]; moved: MovePart | null; draws: number[] }
  export interface RollInput { moves: Moves; written: { key: number | null; bpm: number | null }; keys: TrackKeys | null; history: VersionRow[] }
  export function firstVersion(input: RollInput, rng?: () => number): Given
  export function rollVersion(input: RollInput, rng: () => number): { given: Given; trace: RollTrace }
  ```
- Rules (spec, "The composer: rolling a version"), pinned here:
  - A row with no `given` stands for `firstVersion(input)` with no rng (no earned keys added).
  - First play: keys `{ now: [keys.first], back: [] }` when `moves.key` and `keys`; with earned keys other than `first`, one draw: `< ROLL.earnedOnFirst` → `now` is `first` then the earned ones, at most `maxNow`. bpm `{ now: from, back: [] }`. `moved` absent.
  - Later: one draw `r` for the outcome. Stars 1-2: `r < 0.7` back, else same. Stars 3: `r < 0.3` move, else same. Stars 4-5: `r < 0.8` move, else same.
  - Back: the `given` of the newest earlier row that differs (deep-equal) from the last one's; none: `firstVersion(input)`.
  - Move: `movesIn` = bpm when `now + step <= to`; key when `open` has a key not in the last version's `now` or `back` (`to`: the first such key in `open` order). None in: outcome "same". Else a second draw picks by weight in the order bpm, key. bpm: `now += step`, old `now` first in `back`, cut to `maxBack`. key: the new key first in `now`, cut to `maxNow`, the cut ones first in `back` (cut to 3). `moved` is the last version's plus 1.
  - `draws` records every rng value used, in order.

- [ ] **Step 1: Failing tests,** with `const seq = (...v: number[]) => { let i = 0; return () => v[i++]; }`, `moves = { key: "any", bpm: { from: 60, to: 90, step: 10 } }`, `keys = { first: 9, open: [9, 7, 4], earned: [9] }`:
  - No history → `{ keys: { now: [9], back: [] }, bpm: { now: 60, back: [] } }`, outcome "first".
  - Last 5 stars at the first version, `seq(0.5, 0.1)` → bpm move: `bpm { now: 70, back: [60] }`, `moved: 1`, trace `movesIn` `[{ part: "bpm", weight: 3, to: 70 }, { part: "key", weight: 2, to: 7 }]`.
  - Same, `seq(0.5, 0.7)` → key move: `keys { now: [7, 9], back: [] }`, bpm unchanged, `moved: 1`.
  - Same, `seq(0.9)` → same version, outcome "same", `moved` absent.
  - Last 1 star at the moved version (bpm 70, `moved: 1`), an earlier row at the first version, `seq(0.2)` → the first version; `seq(0.8)` → the 70 version again.
  - Last 3 stars, `seq(0.2, 0)` → a move; `seq(0.4)` → same.
  - bpm at `to` and every open key played, 5 stars, `seq(0.1)` → outcome "same".
  - `keys: null` or no `moves.key`: `given.keys` absent, key never in `movesIn`.
  - Rows with no `given` (Review Focus 3): treated as the first version, a 5-star one can move from it.
  - Same input and same rng values give the same result twice (Review Focus 4).
- [ ] **Step 2:** Run; expect failures. **Step 3:** Implement. **Step 4:** Run, tsc, eslint.
- [ ] **Step 5:** Commit `feat(plan): roll a block's next version from the last rating`.

### Task 5: The rating remembers its version

**Files:**
- Modify: `src/features/progress/log.ts` (`ProgressEntry.given?: unknown`-shaped record: progress knows nothing of plans, so type it as `{ keys?: { now: number[]; back: number[] }; bpm?: { now: number; back: number[] }; moved?: number }` and clean it structurally in `cleanEntry`), `log.test.ts`, `src/features/progress/README.md`
- Modify: `src/features/plan/model/progressLog.ts` (`entryFor` copies `e.given`), its tests
- Modify: `src/features/plan/model/moves.ts`: `export function scoringRows<T extends { stars: number; given?: { moved?: number } }>(rows: T[]): T[]` (without rows of 1 or 2 stars whose `given.moved >= 1`)
- Modify: the three step readers to read `scoringRows(entries)`: `outcome()` (`model/outcome.ts`), `solidRatedAt` (`model/daySteps.ts`), `raisedAnswers` (`model/topicLevels.ts`); and the server's `playerProgress` if it scores steps itself (`src/features/library/server/query.ts`: check)
- Modify: the server's progress storage. Read `src/app/api/me/progress/route.ts` and `src/features/userData/server/data.ts`: if a row is stored as one JSON value, `given` rides along once `cleanEntries` keeps it; if it is columns, add a nullable jsonb `given` column to the schema with the next numbered migration, run it on the local database only (`docker start musickit-db`, `npm run db:migrate` after checking `DATABASE_URL` is local), and say in the report that Supabase needs it run by the user.

**Interfaces:**
- Produces: `ProgressEntry.given`, `scoringRows`. Task 3's cast is replaced by the typed field.

- [ ] **Step 1: Failing tests:** `cleanEntries` keeps a well-formed `given` and drops a malformed one (keeping the row); `entryFor` copies `given`; `scoringRows` drops `{ stars: 2, given: { moved: 1 } }` and keeps `{ stars: 2 }`, `{ stars: 2, given: { moved: 0 } }`, `{ stars: 3, given: { moved: 2 } }`; `solidRatedAt` and `outcome` give the same answer with and without a skipped row added.
- [ ] **Step 2:** Run; fail. **Step 3:** Implement. **Step 4:** Run `src/features/progress/*.test.ts`, the plan model tests, the library server tests, tsc, eslint.
- [ ] **Step 5:** Commit `feat(progress): a rating keeps the version it was played in`.

### Task 6: The composer rolls

**Files:**
- Modify: `src/features/plan/model/compose.ts`, `compose.test.ts`; `src/features/plan/server/composeToday.ts`, `composeStudentWeek.ts`, their tests; `src/features/plan/README.md` (compose.ts and keys.ts lines, a line each for the three new files)

**Interfaces:**
- Consumes: `rollVersion`, `RollTrace`, `written`, `keyTrackOf`, `playerKeys`.
- Produces: `ComposeInput.history?: ProgressEntry[]` (every row of the player; absent: none) and `ComposeInput.player?: string` (absent: the part of `seed` before the first `:`); `TracedPick.given?: Given` in place of `keys`, and `TracedPick.roll?: RollTrace`.

- [ ] **Step 1: Failing tests** in `compose.test.ts`:
  - A picked block with `moves` and no history gets `given` equal to `firstVersion`; with `moves.key` on a `pentatonic-positions:1` block its `given.keys.now` is `[9]` whatever `answers.keys`-less level the player has (not E).
  - The same player, block and history: the same `given` for two different `seed` values (another date, another attempt). A new newest row id for that block may change it; assert the rng seed string is `${player}:${blockId}:${newestRowId}` by spying or by exporting a `rollSeed(player, blockId, rowId)` helper and testing it.
  - A block without `moves` but with an old Key selector still gets `given.keys` from `exerciseKeys` as today (the existing keys tests, renamed).
  - A block with neither gets no `given`.
  - `composeWeek`: a block appearing on two days has the same `given` on both.
  - A kept exercise (`keep`) keeps its `given` untouched.
- [ ] **Step 2:** Run; fail.
- [ ] **Step 3:** Implement where `keysFor` is called: for a block with `moves`, history = `input.history` rows with that `blockId`, newest first by `at`; keys from `keyTrackOf(e.steps)` and `playerKeys(track, step, input.history, answers.keys ?? 0)`, null when the block names no step. `composeToday` and `composeStudentWeek` pass the entries they already read and the player id.
- [ ] **Step 4:** Run plan model and server tests, tsc, eslint. **Step 5:** Commit `feat(plan): the composer rolls each exercise's version`.

### Task 7: The card draws the version

**Files:**
- Modify: `src/features/plan/ui/reader/BlockArticle.tsx` (`BlockBody`, `BlockTitle`: an optional `given?: Given` prop), `src/features/plan/ui/ExerciseCard.tsx` (passes `e.given`; `withKeys(block, e.given?.keys)` stays for old-shape blocks), a reader test beside the existing ones
- Modify: `src/features/plan/README.md` (the reader paragraph, "The choice" section gains a "Moves" paragraph)

**Interfaces:**
- Consumes: `selectorsOf`, `applyGiven`, `At`; `ChoiceChips` (already used by `BlockArticle` for a choice, with its `back` / "Earlier" drawing).

- [ ] **Step 1:** Load `design:ux-copy` and `teaching-voice` ("Words about the app"). Write one line per part, shown under that part's chips: what the chips change, that the values after "Earlier" are the ones from before, and what Play starts again after a change. Name the selectors as the screen does today (read the labels `ChoiceChips` draws for a Key selector and a stage). Report the strings.
- [ ] **Step 2: Failing tests** (render tests, as the existing reader tests do):
  - A block with `moves` and `given.bpm = { now: 70, back: [60] }`: one row of chips "70", "Earlier", "60" before the block's first tool, the line under it, the text reads "at 70"; pressing "60" turns the text to "at 60" and the tool's bpm to 60.
  - The same block with no `given`: no chips, no line, text "at 60" (Review Focus 1).
  - A title with `{{=key}}` is drawn filled, in the card and in `BlockTitle`.
  - A block with no `moves` draws exactly as before (snapshot or the existing tests untouched).
- [ ] **Step 3:** Implement: the reader holds `at` in state (reset when `given` changes), draws from `applyGiven(block, given, at)`, and puts the selectors' chips once, before the first tool of the block, in the place a block's own choice chips go today. A tool's React key includes `at`, as it includes the pick today, so a tool restarts on a change.
- [ ] **Step 4:** Run the feature's tests, tsc, eslint.
- [ ] **Step 5:** Commit `feat(plan): the exercise card draws the given version with its chips`.

### Task 8: Seeing the roll

**Files:**
- Modify: `src/features/devtools/compose/ComposeLab.tsx`, `src/features/devtools/path/JourneyView.tsx` (the Path view; `PathView.tsx` if the data is prepared there), `src/features/devtools/README.md`

**Interfaces:**
- Consumes: `TracedPick.roll`, `TracedPick.given`, `ROLL`, `trackKeys`, `playerKeys`.

- [ ] **Step 1:** /dev/compose: for every pick with a `roll`, a row under the pick: the last version and its stars (or "first play"), the odds row used (`ROLL`), the draws, the moves in with their weights and targets, the move taken, the `given` that came out (keys by name with `keyName`, bpm). Add a control that gives the made-up player a rating history for one picked block: stars 1 / 3 / 5 on the version shown, applied in the browser only, so pressing it re-composes and shows the next roll. The `ROLL` table is shown once at the top of the section.
- [ ] **Step 2:** /dev/path, Path view: a step whose track has `keys` shows its key stages as a short row of key names in groups; with a made-up player chosen (`who`), the open keys are lit and the earned ones marked. The Keys view stays as it is.
- [ ] **Step 3:** Read both pages on the dev server (`next dev` may exit once on an upgrade notice: start it again; don't run `next upgrade`). tsc, eslint. Report what you saw.
- [ ] **Step 4:** Commit `feat(devtools): the version roll on /dev/compose, key stages on /dev/path`.

### Task 9: The rules, the check, the versions

**Files:**
- Modify: `src/features/library/seed/README.md` ("Writing rules"), `.claude/skills/exercise-example/SKILL.md` and the other three teaching skills' `version:` (they move as one), `src/features/plan/model/promptCore.ts` (the exercise format and the rules name `moves` and the params; `PROMPT_VERSION` 8), `src/features/plan/model/tools.ts` if the prompt's interface is generated from a schema there (add `moves` to it), `src/features/library/seed/versions.ts` (`DOC_VERSIONS.teaching` 7), `src/features/plan/model/CHANGELOG.md`, `scripts/seed.ts` (`check`), `src/features/library/seed/versions.test.ts` expectations
- Test: `prompt.test.ts`, `versions.test.ts`, a test for the new check rules beside the seed tests

**Interfaces:**
- Consumes: `parseMoves` warnings (a parser warning already fails `seed check`).

- [ ] **Step 1:** Rules, written with `teaching-voice` loaded (they steer what authors write): a block that can be played in other keys or tempos states `moves` and writes its tools at the starting values; it has no `options` choice that sets a key or a tempo; its title, headings and text name the key and tempo only as `{{=key}}` and `{{=bpm}}`; its text never mentions a selector. The rules for a Key selector and for `"label": "stage"` tempo ladders are marked as the old shape, still read, not to be written. Scale and level choices are unchanged. Position choices are unchanged in this slice.
- [ ] **Step 2: Failing tests:** `seed check` on a file at the current versions fails with a named problem when an `options` choice sets `key` or `bpm`, and when the text of a block with `moves` contains "selector"; passes for a file at older versions with the same content (old files are not broken by the new rule). `versions.test.ts` holds the new numbers.
- [ ] **Step 3:** Implement, raise the versions with changelog entries dated today, regenerate the docs the prompt is built from if the repo has a command for it (`npm run docs:exercises`).
- [ ] **Step 4:** Run seed tests, plan model tests, tsc, eslint. **Step 5:** Commit `feat(seed): moves and text params in the writing rules (teaching 7, prompt 8)`.

### Task 10: Three blocks in the new shape

**Files:**
- Modify: `src/features/library/seed/blocks/guitar-beginner-pentatonic-box1.json`, `guitar-beginner-down-up-picking.json`, and one guitar block whose tools include `chord-shapes` or `strum-along` with a tempo (choose one at level new or beginner; name it in the report)
- Modify: `tasks.txt` (ChoiceSplit: what is built, what is left)

- [ ] **Step 1:** Load `exercise-example`. Rewrite each file by the seed CLAUDE.md's "A rewrite keeps the file" rule (same id, area, topic, concepts, steps, minutes; new `model`, `versions`, `note`):
  - pentatonic: `"moves": { "key": "any", "bpm": { "from": 60, "to": 90, "step": 10 } }`, the roots section's Key selector and its selector sentence removed, title and headings with params, the band section's tool still written 20 above the first.
  - down-up picking: `moves.bpm` from its written tempo, its stage choice removed, no `key` move unless its tools can change key and the drill is not about one key.
  - the chord block: `moves.bpm` only; its key is the lesson.
- [ ] **Step 2:** `npm run -s seed -- check <file>` for each until ✔; `npm run -s gen:json-index` if any id changed (none should); seed tests.
- [ ] **Step 3:** `review-teaching-text` on the three files; fix what it finds.
- [ ] **Step 4:** Read each drawn at `/dev/library?item=<id>` on the dev server, and on /dev/compose give the made-up player a 5-star rating on the pentatonic block and read the next version's card text and chips. Don't paste test plans into `/plan`.
- [ ] **Step 5:** Don't reseed Supabase. Report that block ids changed for the three files, so `npm run -s db:seed-blocks` is needed (the user's go), and which migration from Task 5, if any, is waiting.
- [ ] **Step 6:** Commit `feat(seed): three blocks state their moves`. Final report: what was checked and what was not, per AGENTS.md "Before you call it done".
