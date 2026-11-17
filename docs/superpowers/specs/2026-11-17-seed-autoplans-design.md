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
7. **One source: the seed files** (2026-11-17). The plans and blocks live as files in `src/features/library/seed/`.
   The seed scripts copy them into the database, where agents read them through the library tools. Pages that show them
   (/demo, the dev pages) import the same files through the seed index, not the database.
8. **Both player routes go now**, in NEW15, not with NEW7 (2026-11-17).
9. **The dev database may be reset and reseeded** (2026-11-17). The database in `.env.local` has never had a deployed
   schema change and holds no real player data.

## Goals

- The prompt names no example file and has no `selectExamples`. Its size drops to the rules, the tool catalogue and the
  player.
- An agent writing a plan or block in Claude Code gets its models through `find_blocks`, `get_block`, `find_plans`,
  `get_plan`, `library_coverage` and `player_progress`, with the prompt saying when to call which.
- `src/features/plan/examples` is gone. Its 7 plans and 22 exercises sit in `src/features/library/seed/` and seed the
  database with the existing `db:seed-plans` and `db:seed-blocks`.
- `/demo/<slug>` imports its six plans from the seed index (`library/seed/index.ts`), by id.
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
| `plan/demos.ts` (/demo) | imports the six plans from the seed index by id; a test fails when a `DEMO_PLANS` id has no seed plan |
| `userData/server/seedBlocks.ts`, `scripts/db-seed-blocks.ts`, `db-seed-plans.ts`, `seed.ts` | read only `library/seed` |
| `devtools/examples/ExampleViewer.tsx`, `/dev/examples` | folded into `/dev/library` |
| `devtools/stories/stories.ts`, `model/library.ts`, `model/path.ts`, `model/stepBlocks.ts` (block counts on path pages) | import from the seed index |
| `devtools/server/history.ts`, `server/git.ts` (prompt history) | stop listing example files; history of seed files if still useful |
| `devtools/questionnaire/QuestionnaireLab.tsx` | drop the examples it shows per answer set, or show `find_blocks` results for that player's steps |
| tests: `examples.test.ts`, `staffLabels.test.ts`, `exampleSelection.test.ts`, `prompt.test.ts`, `plan.test.ts`, `exerciseIds.test.ts`, `comments.test.ts`, `library.test.ts`, `preview.test.ts`, `seedBlocks.test.ts` | the checks still worth having (every file parses, staff labels, ids unique) run over `library/seed` |

### `/plan` for players

- Remove `CopyPrompt`, `PasteBox` and `useBrowserAgentTools` from `PlanFlow`, now. No server route writes a plan
  until NEW7, so after the questionnaire `/plan` says plainly that new plans aren't ready yet and points to /demo. The
  answers are still saved, so NEW7 can use them. A plan the player already has keeps working.
- `PromptAndPaste.tsx` stays only for what devtools import from it (`DebugList`, `PasteBox` in the prompt studio).
- `/terms` and the pricing copy promise the paste-your-own-AI way stays free (Selling1). That line changes; per
  `/terms`'s own rule a changed term raises its UPDATED date. Copy goes through `design:ux-copy` and "Words about the
  app".

## Open (the user's to answer)

Answered by the user, 2026-11-17:

1. **`/plan` until NEW7:** both routes go now (decision 8, and the `/plan` section above).
2. **The moved files fail `seed check`** (no steps on any exercise, 26 stepped tools without a level, old versions):
   "fail and fix later". They move as they are; `seed check` keeps failing on them, and the seed scripts seed them
   anyway. Fixing them is its own task (NEW17 in `tasks.txt`). The seed scripts record each file's own versions on its
   block rows (prompt version absent where the file has none). Until fixed, they are found by `level`, as blocks stored
   before steps are.
3. **Old example rows:** reset the library tables on the dev database and reseed (decision 9). The `example` value of
   `block_source` may then go, or stay unused: builder's call.
4. **/demo:** reads the seed files, not the database (decision 7), so it needs no production seeding.

## Left to the builder

- The exact text of the "Find models in the library" prompt part, within the rules above.
- How `/dev/library` shows what `/dev/examples` showed (drawn plan, version tags, behind-the-rules marker).
- Whether `DOC_VERSIONS` lives in `library/seed` or `plan/model`.
- Order of the work, as long as each commit leaves tests and types green.
