# Block ids and choice rows: curated blocks that keep their progress and serve many levels

Date: 2026-11-19. Task: tasks.txt, "TaskSeries ChoiceSplit" (ChoiceSplit2, reshaped). Builds on the first slice of
docs/superpowers/specs/2026-11-18-choice-split-design.md (`moves`, `given`, the roll, text params), which stays true
except where this page says otherwise.

Lines marked **(user)** were decided by the user. Lines marked **(call)** are the designer's and can be overruled.

## Why

- The user curates block text by hand: wording, grammar, meaning, so it reads right in every version the composer
  rolls (user). Today a block's id is the hash of its content (`plan/model/blockId.ts`) and `blocks` is insert-only, so
  every text fix makes a new row. Players' ratings, use counts and library plan rows stay on the old id, and the
  composer sees the fixed block as new and never rated.
- Near-copies: the same exercise at another tempo range, key or level is a whole new block today. The user wants one
  block, written once, with its alternatives as rows in the database, so blocks are reused more and the composer gets
  more out of each curated one (user).
- After launch the database is no longer disposable, so the ids have to be fixed before launch (call; user agreed to
  "ids before launch, rows follow").

## What it is

- A **block** is curated text and tools, with text params (`{{=key}}`, `{{=bpm}}`, …), under a fixed, human-readable
  id written in its seed file (user). Editing it keeps the id; nothing a player has on it changes (user).
- A **choice** is a row of its own, linked to one block: which step or level the block serves with this row, and that
  level's moves (tempo range, keys, later positions). "Moves per level of student" (user). One block can have several
  choices, for example down-up picking: beginner on `picking:2` at 60-100, intermediate on `picking:4` at 100-140.
- The **composer** picks choices, not blocks, for the steps a player needs, then rolls the version inside the
  choice's moves as it does today (`roll.ts`).
- **`enabled_for_reuse` goes** (user, 2026-11-19: "maybe we drop it?"; designer agreed). A choice has `active`, set by
  the seed only: listed in a seed file and not `"draft": true` means active. One level of a block can be switched off
  in its file while the others stay in the library.
- A **rating** is stored against the choice and the version played, and counts toward the choice's own step (user).

## Goals

- A curated block's id never changes; a text or tool edit updates the row in place; ratings, history and use carry
  over (user).
- Ids are readable: the seed file's name, e.g. `guitar-beginner-down-up-picking` (user).
- A new alternative of a block (another level, tempo range, fixed key) is a choice row, not a copied block (user).
- A choice may put its block on a different step or level from its other choices (user).
- Each choice keeps its own ratings and step; a first play of a choice opens at that choice's starting values (user).

## Non-goals

- No stable ids for blocks players edit in their own plans or for old AI-written blocks: they keep the content hash,
  which is how duplicates are spotted (call).
- No moving old rows over: before launch the database is reset and reseeded (memory: prelaunch DB disposable; the user
  gives the go each time). Ratings on today's hash ids are lost; only test accounts have them.
- No teacher or player editing of choices. Choices are written in seed files by the user and agents.
- No new move kinds beyond what the first slice and its planned position move cover, except the per-choice tool
  props and text params below.

## Anti-goals

- A text fix that makes a player's history disappear.
- A block forced to serve levels its words don't fit: a block whose text has to say different things per level stays
  separate blocks (call, from the talk: "one text across levels only works for drills").
- An edit that changes what a block is (another tool, another exercise) kept under the same id, so old stars rate
  something else. That needs a new block or a new choice; the `exercise-example` skill says so (call).

## Two parts, in order

### Part 1, before launch: fixed ids, and a choices table with one row per block

All schema changes happen here, so Part 2 adds rows and content but no migration of player data after launch (call).

**Ids**
- Every seed block file's `id` becomes its `blocks.id`. `db:seed-blocks` upserts by id: content, tags and provenance
  are updated in place; nothing is deleted (call).
- The ~266 exercises written inline in the 10 seed plan files get fixed ids too. They move out into block files under
  `seed/blocks` (one file each, ids made from the plan and title, deduped where two plans hold the same exercise, the
  same way the hash dedupes them today), and a plan's day names them by id and choice: `{ "block": "<id>", "choice":
  "<name>", "minutes": 6 }` (call). The move is mechanical (a script), not a rewrite; their `versions` stay as they are.
- A player-edited or AI-written block keeps the hash id. A player's edit of a curated exercise is a new hash block whose
  `parentId` is the curated id, as today.
- `blocks` gets a `kind` (or similar): `curated` for seed ids, `hashed` for the rest, so code and the dev pages can tell
  them apart and the insert-only rule holds for hashed blocks only (call; the name is the builder's).

**Choices**
- New table `choices`: `id` (text, `<blockId>/<name>`, e.g. `guitar-beginner-down-up-picking/beginner`), `block_id`,
  `name`, `level`, `steps`, `moves` (jsonb, today's shape), `set` (jsonb, empty in Part 1), `minutes`, `active`, `place` (order within the
  block), created and updated times (call on the columns; the builder may add the slot fields `why`, `learnBefore`,
  `exploreMore` here or keep them on the block).
- In Part 1 every curated block gets exactly one choice, named by its level (`beginner`, `new`, …), holding what sits on
  the block today: its `steps`, `level`, `moves`, default minutes. These leave the block's content and tags (call). In
  the seed file they move into a `choices` list.
- `block_owners.enabled_for_reuse` is dropped (user). The composer reads active choices only, and every choice comes
  from the seed, so nothing else needs the gate: a player's own blocks never reach the composer and stay private
  through `block_owners` (who has a block) alone. The library tools' dev argument `include_not_enabled` becomes "include
  inactive choices"; /dev/costs and the dev library pages stop reading the flag.
- A choice removed from a seed file, or marked `"draft": true`, is inactive, never deleted, since ratings may point at
  it. A block file removed: all its choices inactive (call).

**Where the choice id goes**
- `PlanExercise` gains `choiceId` beside `blockId`; `given` stays the slot's.
- `progress_entries` gains `choice_id`; the progress entry keeps `given` (first slice).
- `practice_plan_blocks` gains `choice_id`.
- The composer (`composeDay`, `composeWeek`, `explainDay`) picks choices: a choice serves its `steps`; least-used,
  reach and review rules read per choice. The roll's history is this player's rows for this choice (call: tempo and
  position are per choice; earned keys stay per track, as today).
- The step outcome (`outcome()`, `solidRatedAt`, `raisedAnswers`) reads the choice's steps, with the first slice's rule
  for low ratings on moved versions unchanged.
- The library tools (`find_blocks`, `get_block`, `library_coverage`, the MCP server) answer per choice where they
  answer per step today, and show a block with its choices (call; exact shape is the builder's).

**Then**: reset the library, plans and progress on Supabase (user's go), reseed, walk /plan signed in.

### Part 2, after Part 1: more choices per block

Built 2026-11-28: `set` and `params` on a seed choice, stored together in `choices.set` as `{ tools, params }` (no migration), applied by `applyChoiceSet` (`plan/model/choiceSet.ts`) in `exerciseOf` and `composeBlocks`. A choice's own starting tempo is `set` on the tools; `seed check` compares `moves.bpm.from` with the tools after it.

- A block file may list several choices. Each may set:
  - `level`, `steps`, `moves`, `minutes`, `draft` (as in Part 1);
  - `set`: tool props for that level, applied over the block's tools the way `given` is (for example
    `picking-drill.level`, `strings`), checked by `seed check` against the tool's props (call; the user raised "the slot
    could carry a tempo, a position or a level" on 2026-11-18);
  - `params`: text params of its own for the few words that differ by level (`{{=tip}}`), so one block's text can still
    say something per level without a copy (call). A block whose text differs more than that stays separate blocks.
- A first play of a choice opens at its own starting values, never carrying another choice's tempo (user).
- Agents fold near-copy blocks into one block with several choices, with `exercise-example` and `review-teaching-text`;
  the user reads a first batch before the rest (as in the first slice's rollout).
- /dev/library shows a block with its choices and draws each choice; /dev/compose stage 6 names the choice picked;
  coverage on /dev/path counts choices.

## Settled after the builder check (all calls)

- **Ids inside a stored plan.** Today `withBlockIds` (`plan/model/exerciseIds.ts`, from `sanitiseState` and
  `storedConfig`) recomputes every exercise's `blockId` from its content on each read, which would turn a curated id back
  into a hash. A composed exercise keeps its copy of the content and carries a trusted `blockId` and `choiceId`;
  `withBlockIds` leaves an exercise with a curated id alone. An edit by the player sets an explicit `edited` mark
  (no content comparison, since a curated block's text may have been fixed since the copy was made); only an edited
  exercise gets a hash id. Whether an existing copy is refreshed to the fixed text is the open question below.
- **Hashed blocks and the composer.** After the reset every library block comes from the seed, so every library block
  is curated. The composer reads choices only; hashed blocks never reach it. `choices.block_id` points at curated
  blocks only. `choice_id` on `progress_entries` and `practice_plan_blocks` is null only for a hashed block (a player's
  edit, an old AI block). An AI-written or pasted exercise identical to a curated one stays a hash: no mapping.
- **`practice_plans.reply`.** No whole library plan is handed to a player (NEW7). `db:seed-plans` writes the referenced
  blocks out in full into the reply, at the chosen choice's starting values, so `parsePlanConfig`, /dev/library and the
  library tools keep reading it as today; `practice_plan_blocks` carries `block_id` and `choice_id`. A stale reply is
  fixed by running the seed again.
- **A player's edit of a curated exercise.** The edit is a new hash block with `parentId` set to the curated id. It takes
  the choice's `steps` and `level` into its own tags and drops `choiceId`. Its ratings score the step on their own, and
  its roll history is its own.
- **Part 2 starting values.** A choice's `set` may set the tools' starting values, `bpm` included, and `seed check`
  compares `moves.bpm.from` with the tools after `set`. So two choices on one block can start at 60 and at 100. Part 1's
  choice shape already holds `set` (empty), so Part 2 needs no migration.

## Text fixes and plans already made (call)

- A text fix shows on the next plan made, not on a plan a player already has: stored exercises keep their copy. A
  player's day lives one day, so a fix reaches them the next day; a teacher's week picks it up with the next week. No new
  read path. Drawing curated exercises from the current block by id can be added later with no schema change.
- Before launch every player, plan and progress row is wiped and reseeded (user, 2026-11-19: "we can wipe all the data
  - it's pre-launch"). No migration of old rows.

## Seed files, rules, versions

- Block file shape (Part 1): `id`, the block (`title`, `cells`), a `choices` list (each: `name`, `level`, `steps`,
  `moves`, `set`, `minutes`, `draft`), `versions`, `model`, `note`. Plan files name blocks by id and choice.
- `seed check`: a choice id must be unique; a plan's block and choice must exist; `moves`, `set` and `params` are
  checked against the block's tools and text (the first slice's checks, per choice).
- Writing rules (`exercise-example`, `teaching-voice` where it touches params, seed README, `CLAUDE.md` beside the seed):
  one block per exercise; alternatives are choices; an edit that changes what the block is makes a new block or choice.
  This changes what gets written: raise the teaching version (and `PROMPT_VERSION` if the prompt's block format
  changes), with `CHANGELOG.md` entries, in the commit that changes the rule (AGENTS.md "Version"). Moving files in
  Part 1 does not raise any seed file's `versions`.
- Update the first-slice spec's "No connector table" and "No moves of `level`" non-goals to point here.

## Left to the builder

- Column names and types; whether `kind` is a column or derived; where the slot fields live.
- The move script for inline plan exercises (file naming, how dedupe is reported).
- How old `PlanExercise`s without `choiceId` are read (a reset makes this mostly moot).
- The library tools' answer shape and the dev pages' layout.
- Tests: upsert keeps the id and its progress; a text edit changes no player data; a removed choice is switched off;
  composer picks per choice; a rating counts for its choice's step; a hashed block still dedupes.
