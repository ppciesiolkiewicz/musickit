# NEW15: Seed AI Autoplans, and a prompt that reads the library

Date: 2026-11-17. Task: NEW15 in `tasks.txt`. Follows NEW8 (library query and MCP tools) and NEW10 (library seed);
leads into NEW7 (autoplans on the server).

## Why

The plan prompt was built for a player who copies it into their own AI, or whose browser AI writes the plan through the
page's tools. Neither has library tools, so the prompt pasted hand-tuned examples from `src/features/plan/examples`
into itself (`selectExamples`), which is most of its 187 KB.

That reader is gone. The prompt is now used by agents in Claude Code, which have the `musickit-library` MCP tools, and
later by the server (NEW7). The library database already holds blocks and plans, each with the path steps it practises.
So the examples folder stops being a second source: the database is the one place agents read exercises and plans from.

## Decisions (user, 2026-11-16 and 2026-11-17)

1. **Players lose both outside-AI routes**: copy the prompt into any AI and paste the reply back (`CopyPrompt`,
   `PasteBox` in `PlanFlow`), and the browser AI extension writing the plan through the page's tools
   (`useBrowserAgentTools` in `PlanFlow`).
2. **The prompt carries no examples.** It tells the agent to look blocks and plans up with the library tools, by the
   player's steps and level ("a block for barre:2", "a plan like this player's").
3. **The 7 example plans become Seed AI Autoplans**, kept only as whole 7-day plans. They live in the library database;
   their files are only what seeds it, like `src/features/library/seed/plans` today. They serve three jobs: the /demo
   pages, plans the composer can hand out whole (NEW7), and models an agent reads before writing a new plan.
4. **No single exercise examples.** The 22 exercises become ordinary seed blocks, so agents still find them by tool.
5. **New blocks are written by agents in Claude Code**, by hand, one at a time, as NEW10 does now. No template generator.
6. **The choice (stages, variants, pick-a-step) stays inside the block** for now. Splitting it out is its own series,
   ChoiceSplit in `tasks.txt`, after release.

## Goals

- The prompt names no example file and has no `selectExamples`. Its size drops to the rules, the tool catalogue and the
  player.
- An agent writing a plan or block in Claude Code gets its models through `find_blocks`, `get_block`, `find_plans`,
  `get_plan`, `library_coverage` and `player_progress`, with the prompt saying when to call which.
- `src/features/plan/examples` is gone. Its 7 plans and 22 exercises sit in `src/features/library/seed/` and seed the
  database with the existing `db:seed-plans` and `db:seed-blocks`.
- `/demo/<slug>` reads its six plans from the library (by id), not from files.
- `/dev/examples` is folded into `/dev/library`: a seed plan or block can be read drawn there, with its version tags.
- Players have no copy-and-paste or browser-AI route on `/plan`.

## Non-goals

- The server autoplan composer (NEW7). This design only makes sure the library holds what it will read.
- One-day plans (NEW7). Seed AI Autoplans stay seven days.
- Splitting the choice out of blocks (ChoiceSplit1).
- A template generator for block variants.
- Rewriting the 29 files' teaching text. They move as they are; their `docs` tags stay as written.

## Anti-goals (a failure even if it works)

- An agent that writes a plan with no idea what a good one looks like, because the prompt lost its models and says
  nothing about where to find them. The tool instructions in the prompt are the replacement, not an afterthought.
- A second source again: files that the prompt or a page reads directly beside the database.
- Losing a tool lesson. The five showcases each teach one tool feature (blocks, stages, variants, pick-a-step, a
  progression four ways); after the move an agent must still learn that feature, from the prompt's rules plus a seed
  block it can fetch by id.
- Player data touched by the move: seeding writes only app-owned rows (`user_id` null).

## What changes, part by part

### The prompt (`src/features/plan/model/prompt.ts`)

- Drop `selectExamples` (`exampleSelection.ts` and its test) and `examplePart`. The `plan-example` and
  `exercise-example` part kinds go.
- Add a part, "Find models in the library", for the agent: before writing, call `player_progress` (when a player is in
  scope) and `find_blocks` with the player's current and next steps per concept; `get_block` the closest ones and write
  like them; `find_plans` and `get_plan` for one whole plan at the player's level to copy its shape. A block that fits
  as it is may be used as it is (its id) rather than rewritten. The exact wording follows `teaching-voice` "Words about
  the app" only where it is player-facing; this part is not.
- Keep one line per showcase feature in the rules ("Exercise format" or "Which tool for what"), each telling the agent
  to call `find_blocks` with `tags: ["showcase:<feature>"]` to see it. Not the block id: a block's id is a hash of its
  content (`plan/model/blockId.ts`) and changes with any edit. (Builder's call, 2026-11-17.)
- The "player skipped the questionnaire, ask them first" branch goes: no agent run has a player to ask.
- This is a rule change: raise `PROMPT_VERSION` by one, with a changelog entry.
- `npm run -s seed -- prompt` (used by NEW10 to write a seed plan) keeps working and gives the new prompt.

### The devtools Claude runner (`src/features/devtools/server/claude.ts`)

Today it runs the prompt with no tools and no MCP ("like a player's own AI"). With examples gone it must run with the
`musickit-library` MCP server, or its plans lose their models. `scripts/compare-models.ts` likewise. Ollama runs (no MCP)
get the prompt as it is and are expected to do worse; that is acceptable for a dev comparison.
Runs pass no `player` (the personas are not database users) and set `include_not_enabled`, so the agent sees the seed
library; results depend on what the dev database holds, which is fine for a dev comparison. (Builder's call.)

### The examples folder and its tooling

- Move `plans/*.json` to `src/features/library/seed/plans/` as `SeedPlanFile`s and `exercises/*.json` to
  `seed/blocks/` as `SeedBlockFile`s, mapping fields (`docs` → `versions`, `exercise` stays, `note` stays). Each must pass
  `npm run -s seed -- check`; an exercise with no step gets its steps (the two plans noted in NEW15 that tag no concepts
  get them too). Plan ids stay the same, so /demo links hold. Block ids are content hashes and change.
- The `showcase` field has no place in `SeedBlockFile`; it becomes a tag on the block (`showcase:<feature>`) so
  `find_blocks` can find it.
- `DOC_VERSIONS` and `isCurrentTeaching` move out of `plan/examples/index.ts` to the library seed (or `plan/model`); the
  AGENTS.md "Version" section is updated to point there. Blocks already store `docs_agents` and `docs_teaching`.
- The `exercise-example` skill becomes a skill for writing a library seed block or plan (aimed at `library/seed/`, with
  `seed check` as its gate). `course-article` and `review-teaching-text` stop pointing at `plan/examples`. The four
  teaching skills move as one, so this is a teaching version raise only if a writing rule changes, not for the path.
- AGENTS.md's skill table row "An example exercise or plan (`src/features/plan/examples`)" points at the seed folder.
- `src/features/plan/examples/CLAUDE.md` and `README.md`: their rules move into `library/seed/README.md` (and a
  `CLAUDE.md` beside it), not lost.

### Readers of the folder today

Each moves to the database or the seed index:

| Reader | After |
| --- | --- |
| `plan/demos.ts` (/demo) | reads the six plans from the library by id (`getPlan`, app scope with not-enabled included). A plan missing from the DB shows the /demo "not found" state, not a crash. |
| `userData/server/seedBlocks.ts`, `scripts/db-seed-blocks.ts`, `db-seed-plans.ts`, `seed.ts` | read only `library/seed` |
| `devtools/examples/ExampleViewer.tsx`, `/dev/examples` | folded into `/dev/library` |
| `devtools/stories/stories.ts`, `model/library.ts`, `model/path.ts`, `model/stepBlocks.ts` (block counts on path pages) | read the database through the library query, as `/dev/library` does |
| `devtools/server/history.ts`, `server/git.ts` (prompt history) | stop listing example files; history of seed files if still useful |
| `devtools/questionnaire/QuestionnaireLab.tsx` | drop the examples it shows per answer set, or show `find_blocks` results for that player's steps |
| tests: `examples.test.ts`, `staffLabels.test.ts`, `exampleSelection.test.ts`, `prompt.test.ts`, `plan.test.ts`, `exerciseIds.test.ts`, `comments.test.ts`, `library.test.ts`, `preview.test.ts`, `seedBlocks.test.ts` | the checks still worth having (every file parses, staff labels, ids unique) run over `library/seed` |

### `/plan` for players

- Remove `CopyPrompt`, `PasteBox` and `useBrowserAgentTools` from `PlanFlow`.
- `/terms` and the pricing copy promise the paste-your-own-AI way stays free (Selling1). That line changes; per
  `/terms`'s own rule a changed term raises its UPDATED date. Copy goes through `design:ux-copy` and "Words about the
  app".

## Open (the user's to answer)

From the builder check, 2026-11-17. The user said "continue" without answering, so each has a default below, marked as
the designer's call; the user can overturn any of them.

1. **`/plan` until NEW7.** No server route writes a plan yet. Call: NEW15 does the prompt, library and devtools work;
   removing `CopyPrompt`, `PasteBox` and `useBrowserAgentTools` from `PlanFlow`, and the `/terms` and pricing change,
   wait and ship with NEW7. Until then a pasted prompt has no examples and writes weaker plans; prelaunch, accepted.
2. **The moved files don't pass `seed check`** (no steps on any exercise, 26 stepped tools without a level, old
   versions). Call: the seed file formats get an `imported: true` marker. For an imported file `seed check` accepts the
   versions it was written to (prompt version may be absent) and reports a missing step or level as a warning, not a
   failure. Steps are added only where a tool's level or stage already says it (read with `stepOf`, no text changed);
   the rest stay stepless and are found by `level`, as blocks stored before steps are. A later rewrite to current rules
   drops `imported`. The seed scripts record the file's own versions on the block rows.
3. **Old example rows in the dev database.** Call: no reset (that needs the user's OK each time). Seeding adds the new
   rows; the old `source = 'example'` rows stay not enabled. Pages that read the seed (/demo, /dev/library, path block
   counts) read by `source = 'seed'`, so old example rows don't show there. A clean reseed waits for the user's OK.
4. **Production `/demo`.** Call: seeding production is a step in the plan's ship list, and a test or script fails when
   a `DEMO_PLANS` id is missing from the database it points at. Which database production reads: the user to confirm
   before the ship step.

## Left to the builder

- The exact text of the "Find models in the library" prompt part, within the rules above.
- How `/dev/library` shows what `/dev/examples` showed (drawn plan, version tags, behind-the-rules marker).
- Whether `DOC_VERSIONS` lives in `library/seed` or `plan/model`.
- Order of the work, as long as each commit leaves tests and types green.
