# Blocks by step: every block names the path steps it practises (design)

Tasks: NEW13 (steps inside a concept), NEW10 (seed the gaps), NEW16 (known / within reach / ahead), NEW7 (the plan
shortlist). Follows `2026-11-16-path-slope-design.md`.

## Why

The library finds exercises by concept and level (`BlockFilter.level`, `find_blocks level`, coverage by topic and
level). A block's level is whatever its writer typed on the exercise. Since the path, a concept is a track that spans
levels: "beginner barre" is either the small F (`barre:1`) or Bm (`barre:2`), and a level search can't tell which.
The path already says exactly what a player needs next: `reach()` returns step refs (`barre:2`). So the question the
library should answer is "which blocks practise `barre:2`?", and the level should follow from the step.

`stepOf` can read a step back from a block's tools only where the step has a ladder (56 of 216 steps). For the rest
nothing says which step a block is for. So a block has to name its steps itself.

The user's words: change level into step everywhere; to the player it is still shown as a level. Within a step there
can be several blocks that match: those are variations, and the plan writer or search picks among them.

Second need, from the user: in ear and singing work a new step must not stay isolated. After singing 6ths and 7ths on
their own, the player sings them mixed with everything before. Those become **mixing steps** on the path.

## Goals

1. **An exercise names its steps.** `PlanExercise.steps?: string[]`, step refs `"trackId:n"` (n from 1). It replaces
   `level` as what the writer sets. `level` is derived: the highest level of its steps. An exercise with no steps keeps
   its typed `level` (old plans, old blocks).
2. **Blocks store steps.** `blocks.steps text[]` (migration), filled from the exercise, part of the block key
   (`blockKeyOf`) in place of `level` when steps are present. `blocks.level` stays, written from the derived level.
3. **Search and coverage by step.** `BlockFilter.steps` (a block with any of them matches); `find_blocks steps`;
   `library_coverage` gains a row per step (blocks, plans, times, seconds; zeros included), in path order.
   `level` stays as a filter for blocks with no steps and for totals.
4. **Checks.** Parser: an unknown step ref is a warning and is dropped. `seed -- check` fails an exercise with no steps,
   a step not in one of its `concepts`' tracks, and a ladder step its tools don't match (`stepOf` disagrees).
5. **The writer names steps.** The prompt asks for `steps` instead of `level` and lists the step refs per track
   (`PROMPT_VERSION` 4, changelog entry). The examples gain `steps` as they are rewritten (no hand tagging, per AGENTS.md).
6. **Slope shows blocks.** On `/dev/path` → Slope, each step shows how many blocks practise it; a step with none is
   marked as a gap. Picking a step lists its blocks (title, provenance, use), each opening the block as
   `/dev/library` already shows it. Read from the library through the same query module, not from the seed files.
   Until then (2026-11-16): a badge per Slope step opens `/dev/block?step=` in a new tab, read from the code
   (`devtools/model/stepBlocks.ts`: seed files' `steps`, else `stepOf`, else track and level); it moves to the library
   once blocks store steps.
7. **Mixing steps.** Tracks whose material adds up get explicit mixing steps ("Mix: 5th, octave, 3rds") between new
   steps. They are ordinary steps (level, `after`, reach, coverage). Which tracks and where: from the agents'
   proposals (below), the user picks. A ladder step and its mixing step may point at the same tool level; the
   new-material block isolates (tool `custom` set), the mixing block uses the whole level.
8. **Level fixes the agents flagged** (reading the staff, natural minor, sus/add9, songs with four chords,
   fingerpicking, 7ths by ear), done with the mixing steps since both move steps between levels.
9. **The seed fills the gaps.** One block per step that has none (84 at the start, written by Fable agents in this
   session into `src/features/library/seed/blocks`, each with a top-level `steps` in the seed file until goal 1 lands),
   then blocks for the new mixing steps.

## Non-goals

- Players never see step refs or step names as such: the level stays the word on the screen.
- No new exercise tools. Gaps a tool can't cover are noted (`note`: "missing: ...") for NEW11.
- No hard gates: a step not rated solid is never a wall (as in the slope design).
- The teacher view and NEW7's shortlist are not built here; they read `steps` once it exists.

## Anti-goals

- A step on a block that the block's tools contradict (a ladder step whose tool sits on another level).
- Coverage that counts a block for a step because of its level alone.

## Constraints

- Prelaunch: the database can be reset; no backfill scripts (old blocks keep no steps and fall back to level).
- Block ids change for any exercise that gains `steps`; that is expected.
- Another session is working on `/dev/path` (example students, Slope). Coordinate on `SlopeView.tsx`.
- Every change keeps the plan, library and devtools tests, tsc and eslint clean; prompt version moves with its changelog.

## Decided

- Steps replace level as what is written; level is derived (user).
- Several blocks per step are variations (user).
- Mixing steps are separate steps, not a rule that every step mixes (user).
- Fable agents write the missing blocks now (user).

## My calls (check these)

- Level of a multi-step block is its highest step's level.
- The Slope block list reuses `/dev/library`'s block view instead of a new viewer.
- Rating a block counts for each of its steps (the outcome already counts a rating per concept; it moves to steps).
- The seed file carries `steps` at the top level until the exercise format has it; then it moves into `exercise`.
- **Step refs stay positional** (`trackId:n`). Mixing steps and level fixes change numbering, so they land as one
  change to `PATH` with an old → new ref map applied in the same commit to `after` links, `slopeProposal.ts`, the
  seed files' `steps` and the example students; a test fails on any ref that points at no step. Stored player data
  is prelaunch and can be reset, so no migration of it. Order: path changes (goals 7, 8) first, then the `steps`
  field (goals 1 to 5) with the seed files remapped.
- **Mixing steps and ladders** (changed when built, 2026-11-16): a mixing step carries no ladder; the ladder stays on
  the new-material step, so the blocks written before keep reading back to their step. A mixing block uses the tool at
  the level of the ladder step before it and names its mixing step in `steps`; read back by its tools it also counts
  for that ladder step ("read" on /dev/block), which is true of what it practises.
- **Built 2026-11-16:** 33 mixing steps (`mix: true`, "Mix: ..."), pentatonic 6 and 7 swapped, double-stops:1 to
  beginner, barre:5 after seventh-shapes:3; 50 refs moved by one old → new map. Not built: fingerpicking as its own
  track (a new concept id changes the prompt, so it waits for `PROMPT_VERSION` 4 with goal 5); seventh-shapes:2 keeps
  Dm7 (its block teaches the shape on its own); intervals:3 waits on MissingTools13.
- **The 84 gap blocks** are written in this session by six Fable agents (one brief, a list per agent) into
  `src/features/library/seed/blocks`, checked with `seed -- check`. Their mixing-step proposals come back with them;
  the user picks before goal 7 is built (a stop in the plan).

- **Built 2026-11-16 (goal 5):** `PROMPT_VERSION` 4: the exercise format asks for `steps` (1 to 3) and no `level`, and
  the answer format lists each concept's steps (`n name (level)`) under its topic. Fingerpicking is its own track
  (`fingerpicking:1`, was `strumming:7`; no renumbering, it was the last step). The 117 seed blocks were raised to
  prompt 4 by hand (user: they already name their steps); the prompt's examples still write `level` until rewritten.

## Left to the builder

Query and SQL shape, the Slope list's layout, the order of the prompt change against the migration.
