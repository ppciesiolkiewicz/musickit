# NEW15 Seed AI Autoplans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The examples folder becomes Seed AI Autoplans and seed blocks in `src/features/library/seed`, the one source; the
prompt carries no examples and tells the agent to use the library tools; players lose copy-and-paste and the AI extension.

**Architecture:** Seed JSON files are the source. `db:seed-plans` / `db:seed-blocks` copy them into the database for
agents (MCP tools); pages (/demo, dev pages) import the same files through `library/seed/index.ts`. The prompt gains a
"Find models in the library" part and loses `selectExamples`.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routes), TypeScript, Drizzle/Postgres,
`node:test` via cached tsx (see memory `tsx-not-installed`), Claude Code CLI for the devtools runner.

**Spec:** `docs/superpowers/specs/2026-11-17-seed-autoplans-design.md`

## Global Constraints

- One source: nothing outside `library/seed` reads plan or exercise JSON; `src/features/plan/examples` is deleted.
- Seed files move as they are: teaching text unchanged, versions as written. `npm run -s seed -- check` may fail on them
  (user: "fail and fix later", NEW17). No test runs `seed check` over the folder.
- `SeedVersions.prompt` becomes `number | null` (moved files record no prompt version).
- Plan ids stay the same (/demo slugs map to them). Block ids are content hashes and change; nothing names one by hand.
- `PROMPT_VERSION` 4 → 5 with a changelog entry in `src/features/plan/model/CHANGELOG.md` (dated 2026-11-17).
- `DOC_VERSIONS` stays `{ agents: 2, teaching: 5 }`; it moves file, not value. No teaching-skill version raise for paths.
- Interface copy: load `design:ux-copy` and `teaching-voice` ("Words about the app") before writing a word; no hype, no
  exclamation marks; report strings old → new.
- Commits: straight to main via a temporary `GIT_INDEX_FILE` (memory `shared-index-staging`); never `git add` in the
  main checkout. Each commit leaves `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, the touched features' tests and eslint
  on changed files clean.
- Database reset (Task 9) is allowed for this session only; ask again in any later session.

## Review Focus

1. A /demo slug whose seed plan is missing or fails to parse: the page shows its not-found state, and a test fails first
   (Task 3).
2. A player mid-flow from before the change (a saved `sessionStorage` flow whose `step` points past the new last step):
   the flow opens on a valid step, not a blank modal (Task 7).
3. A player with a current plan opening "Next week": answers and feedback are saved, the current plan is untouched
   (Task 7).
4. The devtools runner when the dev server's MCP route is unreachable or the database empty: the run still returns, and
   the tool error is visible in its output, not a hang (Task 6).
5. Seeding twice: the second `db:seed-blocks` adds no rows and `practice_plan_blocks` rows are the same (Task 9).

---

### Task 1: DOC_VERSIONS moves to the library seed

**Files:**
- Create: `src/features/library/seed/versions.ts`
- Modify: `src/features/plan/examples/index.ts` (re-export from the new file until Task 4 deletes it),
  `src/features/devtools/server/history.ts:3`, `scripts/seed.ts:14`, `src/features/library/seed/index.ts`
- Move test: the DOC_VERSIONS ↔ AGENTS.md / skills checks in `src/features/plan/examples/examples.test.ts` →
  `src/features/library/seed/versions.test.ts`

**Interfaces:**
- Produces: `export interface DocVersions { agents: number; teaching: number }`, `export const DOC_VERSIONS: DocVersions`
  in `library/seed/versions.ts`. `SeedVersions.prompt: number | null`.

- [ ] Step 1: Create `versions.ts` with the two exports (same doc comments). Move the version-agreement tests into
  `versions.test.ts`, importing from `./versions`.
- [ ] Step 2: Point `history.ts`, `scripts/seed.ts` and `examples/index.ts` (re-export) at it. Change
  `SeedVersions.prompt` to `number | null`; fix the compile errors it shows (`seedFileBlocks`, `seedLibraryRows` pass
  it through as is).
- [ ] Step 3: Run `tsx --test src/features/library/seed/*.test.ts src/features/plan/examples/*.test.ts`; expect PASS. Run tsc.
- [ ] Step 4: Commit `refactor(library): DOC_VERSIONS lives with the seed`.

### Task 2: Convert the 29 example files into seed files

**Files:**
- Create: `src/features/library/seed/plans/<id>.json` × 7, `src/features/library/seed/blocks/<id>.json` × 22,
  regenerated `plans/index.gen.ts`, `blocks/index.gen.ts` (`npm run -s gen:json-index`)
- Modify: `src/features/library/seed/index.ts` (`SeedBlockFile.showcase?`)
- One-off converter in the scratchpad (not committed)

**Interfaces:**
- Produces: `SeedBlockFile.showcase?: "blocks" | "pick" | "progression" | "stages" | "variants"`; seed ids equal the
  example ids.

- [ ] Step 1: Write the converter. Plan file: `{ id, answers: exampleAnswers(e, parsed.days), model, versions:
  { prompt: null, agents: e.docs.agents, teaching: e.docs.teaching }, note: e.note, plan: e.plan }`
  (`exampleAnswers` from `devtools/model/library.ts`). Block file: `{ id, model, versions (same), note, exercise,
  showcase? }`. `model` falls back to `"unknown"` where the example has none (count them and report).
- [ ] Step 2: Run it, then `npm run -s gen:json-index`. Expect 7 + 22 new files and no id clash with existing seed files
  (fail loudly on a clash).
- [ ] Step 3: Run `npm run -s seed -- check src/features/library/seed/plans/guitar-beginner.json`; expect ✖ with step
  and version problems (recorded for NEW17, not fixed).
- [ ] Step 4: Run `tsx --test src/features/devtools/model/stepBlocks.test.ts` and tsc; expect PASS.
- [ ] Step 5: Commit `feat(library): the example plans and exercises as seed files (NEW15)`. Both copies exist until
  Task 4.

### Task 3: Readers move to the seed index

**Files:**
- Modify: `src/features/plan/demos.ts`, `src/features/devtools/stories/stories.ts:169-173`,
  `src/features/devtools/model/path.ts:28-31`, `src/features/devtools/model/stepBlocks.ts:76-83`,
  `src/features/devtools/model/library.ts`, `src/features/userData/server/seedBlocks.ts`, `scripts/db-seed-plans.ts`,
  `scripts/db-seed-blocks.ts` (doc comment), `src/features/devtools/questionnaire/QuestionnaireLab.tsx`
- Tests: `src/features/plan/demos.test.ts` (create if missing), `devtools/model/library.test.ts`,
  `devtools/model/preview.test.ts`, `devtools/model/comments.test.ts`, `userData/server/seedBlocks.test.ts`,
  `plan/model/plan.test.ts`, `plan/model/exerciseIds.test.ts`

**Interfaces:**
- Consumes: `SEED_PLANS`, `SEED_BLOCKS`, `SeedBlockFile.showcase` (Task 2).
- Produces: `DEMO_PLANS: Record<string, { plan: string; label: string; level: Level }>`; `demoPlan(slug)` and
  `demoCards()` unchanged in shape (area and minutes from the seed plan's `answers`). `seedBlocks()` returns
  `{ library, planBlocks, promoted }` (no `examples`). `exampleBlocks`, `exampleLibraryRows`, `exampleAnswers` deleted
  (the converter in Task 2 was their last user).

- [ ] Step 1: Write failing test `demos.test.ts`: "every demo slug names a seed plan that parses":
  `for (const slug of Object.keys(DEMO_PLANS)) assert.ok(demoPlan(slug), slug)`; and "cards are easiest first, one per
  slug": `assert.equal(demoCards().length, 6)`.
- [ ] Step 2: Switch `demos.ts` to `SEED_PLANS`; run the test; expect PASS.
- [ ] Step 3: Switch stories, path (`exercises` from `SEED_BLOCKS` with `exercise.concepts`, `plans` from `SEED_PLANS`
  with their exercises' concepts), stepBlocks (drop the two example loops; seed loops already cover them),
  library rows (`db-seed-plans` uses `seedLibraryRows()` only; a former example plan is now `source: "seed"`),
  `seedBlocks.ts` (drop `exampleBlocks` and the `addBlocks(null, examples)` call), QuestionnaireLab (drop "the examples
  picked" panel; registry text at `devtools/registry.ts:55` loses "the examples picked").
- [ ] Step 4: Port each listed test from `EXERCISE_EXAMPLES` / `PLAN_EXAMPLES` to `SEED_BLOCKS.map(f => f.exercise)` /
  `SEED_PLANS.map(f => f.plan)`. `seedBlocks.test.ts`: the "examples are stored not enabled" case goes; add "a moved
  example block is seeded enabled": a block from `SEED_BLOCKS.find(f => f.id === "showcase-stages-tempo-ladder")` is in
  `seedFileBlocks()` with `enabledForReuse: true`, `source: "seed"`.
- [ ] Step 5: Run `tsx --test src/features/plan/*.test.ts src/features/plan/model/*.test.ts src/features/devtools/model/*.test.ts src/features/userData/server/*.test.ts`; expect PASS except tests that read the prompt's examples (Task 4). tsc, eslint.
- [ ] Step 6: Commit `refactor: demos, dev pages and seeding read the seed files`.

### Task 4: The prompt reads the library, not examples

**Files:**
- Modify: `src/features/plan/model/prompt.ts`, `src/features/plan/model/CHANGELOG.md`
- Delete: `src/features/plan/model/exampleSelection.ts`, `exampleSelection.test.ts`, `src/features/plan/examples/`
  (whole folder: JSON, `index.ts`, `examples.test.ts`, `staffLabels.test.ts`, `README.md`, `CLAUDE.md`; move the staff
  label check to `library/seed/staffLabels.test.ts` over `SEED_BLOCKS` and `SEED_PLANS`; move the README rules into
  `library/seed/README.md` under "Writing rules", and `CLAUDE.md` to `library/seed/CLAUDE.md`)
- Modify: `src/features/devtools/server/git.ts` (`EXAMPLES` → `src/features/library/seed`, dirs `blocks`, `plans`)
- Test: `src/features/plan/model/prompt.test.ts`

**Interfaces:**
- Consumes: `SEED_BLOCKS` and `showcase` (Task 2); `blockIdOf`, `blockKeyOf` (`plan/model/blockId.ts`), `parseExercise`.
- Produces: `export function showcaseBlocks(): { feature: string; id: string; title: string }[]` in
  `plan/model/prompt.ts` (block id computed from the seed file at build time, so it never goes stale). `PromptPartKind`
  loses `"plan-example"` and `"exercise-example"`, gains `"library"`. `PROMPT_VERSION = 5`.

- [ ] Step 1: Write failing tests in `prompt.test.ts`:
  - "the prompt carries no example": no part has kind `plan-example` or `exercise-example`; `buildPrompt` contains no
    `### Example:`.
  - "the library part names the tools": one part `id === "library"` whose text contains `find_blocks`, `get_block`,
    `find_plans`, `get_plan`, `library_coverage`, `player_progress`.
  - "each showcase is named by its current block id": for every `f` in `SEED_BLOCKS` with `showcase`, the prompt
    contains `blockIdOf(blockKeyOf(parseExercise(f.exercise, f.id, catalogue()).block!))`.
  - "skipped questionnaire": `promptParts(null, ...)` has a student part and no "ask them" sentence.
  - Replace the two example-id assertions at lines 58 and 65.
- [ ] Step 2: Run `tsx --test src/features/plan/model/prompt.test.ts`; expect FAIL.
- [ ] Step 3: In `prompt.ts`: drop `selectExamples`, `examplePart`, the examples heading; add part `library`
  ("Find models in the library") after "How to plan": call `player_progress` when it answers; `find_blocks` by the
  student's current and next step per concept, then `get_block` the closest two or three and write like them; a block
  that fits as it is may be used as it is; `find_plans` + `get_plan` one plan at their level for its shape; one line per
  showcase feature with its id from `showcaseBlocks()`. With no questionnaire answers, the student part says to plan
  from `DEFAULT_ANSWERS` and the ratings. Raise `PROMPT_VERSION` to 5; changelog entry "5, 2026-11-17: examples out;
  the library part; showcases by block id; no ask-first branch".
- [ ] Step 4: Delete the examples folder and `exampleSelection*`; move README/CLAUDE.md rules and the staff-label test
  as listed. `grep -rn "plan/examples" src scripts .claude/skills AGENTS.md` returns only Task 8's files.
- [ ] Step 5: Run all plan, devtools, library and userData tests; expect PASS. tsc, eslint.
- [ ] Step 6: Commit `feat(plan): prompt v5 reads the library; the examples folder is gone (NEW15)`.

### Task 5: /dev/examples folds into /dev/library

**Files:**
- Move: `src/features/devtools/examples/ExampleViewer.tsx` → `src/features/devtools/library/SeedViewer.tsx`
- Create: `src/app/dev/library/seed/page.tsx`
- Delete: `src/app/dev/examples/page.tsx`
- Modify: `src/features/devtools/registry.ts:57` (href `/dev/library/seed`, label "Seed files", desc "Every seed plan
  and block, drawn as the player would see it, with the versions it was written to."), the link from
  `LibraryPage` to it, `src/features/devtools/model/comments.ts` doc comment, `src/features/devtools/README.md`

**Interfaces:**
- Consumes: `SEED_PLANS`, `SEED_BLOCKS`, `DOC_VERSIONS`, `PROMPT_VERSION`.

- [ ] Step 1: Re-point the viewer at the seed files: items are `{ id, kind, json, versions }`; version pills read
  `versions.teaching`, `versions.agents`, and a prompt pill (`v—` when null) against the current values; showcase files
  show their feature. Comments keep working on the same ids (`exampleSections` over the seed items).
- [ ] Step 2: Run `tsx --test src/features/devtools/model/*.test.ts`, tsc, eslint.
- [ ] Step 3: Open `/dev/library/seed` on the dev server (memory `worktree-dev-and-screenshots`); check one plan and one
  showcase draw, pills show, a comment can be added. `/dev/examples` is a 404.
- [ ] Step 4: Commit `feat(devtools): seed files viewer under /dev/library`.

### Task 6: The devtools runner gets the library tools

**Files:**
- Modify: `src/features/devtools/server/claude.ts`, the dev route that calls `runClaude` for prompt runs,
  `scripts/compare-models.ts`
- Test: `src/features/devtools/server/claude.test.ts`

**Interfaces:**
- Produces: `RunOptions.mcpUrl?: string`. `claudeArgs(o)` with `mcpUrl` adds
  `--mcp-config {"mcpServers":{"musickit-library":{"type":"http","url":<mcpUrl>}}}` and
  `--allowedTools mcp__musickit-library`, keeps `--strict-mcp-config` and `--tools ""`. Without it, unchanged.

- [ ] Step 1: Failing tests: "claudeArgs adds the library server when given a url" (args contain `--mcp-config` with
  that url and `--allowedTools`, `mcp__musickit-library`); "without a url it has no MCP server" (no `--mcp-config`).
- [ ] Step 2: Implement; the dev route passes `new URL("/api/dev/mcp", request.url).href`; compare-models takes
  `--mcp <url>` (default `http://localhost:3000/api/dev/mcp`) and passes it for Claude runs only. Update the doc comment
  ("sees only the prompt" → "sees the prompt and the library tools"). No `player` or `include_not_enabled` is passed:
  every seed row is enabled after Task 9.
- [ ] Step 3: Run the tests; expect PASS. Then one real run from `/dev/prompt` with Haiku and check the output's tool
  calls include `find_blocks` (Review Focus 4: stop the dev server's DB and confirm the run still returns with the
  tool's error text).
- [ ] Step 4: Commit `feat(devtools): prompt runs reach the library over MCP`.

### Task 7: /plan loses copy-and-paste and the AI extension

**Files:**
- Modify: `src/features/plan/ui/PlanFlow.tsx`, `src/features/plan/PlanApp.tsx`, `src/features/plan/ui/PromptAndPaste.tsx`
  (drop `CopyPrompt`; keep `PasteBox`, `DebugList` for devtools), `src/app/terms/page.tsx` (+ UPDATED date),
  pricing copy (`src/features/account/pricing.ts` and the home pages' Pricing section), `src/features/plan/CLAUDE.md`
  (the "AI extension" / "any AI chat" copy rule goes), `src/features/plan/README.md`
- Delete: `src/features/plan/ui/useBrowserAgentTools.ts` (check `hasBrowserAgentApi` users first:
  `teachers/notes/NotesApp.tsx` imports it from `useBlockAgentTools`, which stays)
- Test: `src/features/plan/model/*.test.ts` for any flow helper touched; the flow is checked in the browser

**Interfaces:**
- Produces: `PlanFlow` prop `onAnswers(answers: PlanAnswers, feedback: string | undefined, asked: boolean): void`
  replacing `onPlan`; `PlanApp` saves answers (`recordAnswers` when asked) and feedback on the current plan, starts no
  plan.

- [ ] Step 1: Load `design:ux-copy` and `teaching-voice`. Write the last step's copy: title, one or two sentences that
  new plans are not ready yet, the answers are saved, and the six demo plans are at /demo (a link). Finish button label
  replaces "Build my plan". `/terms`: remove the paste-your-own-AI promise; raise UPDATED.
- [ ] Step 2: Remove the two prompt steps, `buildPrompt`, `useBrowserAgentTools`, `text` state; add the closing step;
  `onFinish` calls `onAnswers`. A saved flow whose `step` is past the last step opens on the last step (Review Focus 2).
- [ ] Step 3: tsc, eslint, plan tests.
- [ ] Step 4: Browser (back up and restore the user's localStorage keys, memory `browser-test-keep-user-data`): start
  flow → last step shows the copy and the /demo link → finish saves answers; with a current plan, "Next week" → finish
  keeps the plan and saves the feedback (Review Focus 3); a saved flow at step 9 opens.
- [ ] Step 5: Commit `feat(plan): players no longer paste prompts or use the AI extension (NEW15)`; report copy old → new.

### Task 8: Skills, AGENTS.md and feature docs point at the seed

**Files:**
- Modify: `.claude/skills/exercise-example/SKILL.md` (name stays; it writes `library/seed` files, gate is
  `npm run -s seed -- check`, reads blocks through the library tools), `.claude/skills/teaching-voice/SKILL.md`,
  `.claude/skills/review-teaching-text/SKILL.md`, `AGENTS.md` (skill table row, "Version" section: `DOC_VERSIONS` in
  `src/features/library/seed/versions.ts`, seed files record `versions`), `src/features/library/seed/README.md`,
  `src/features/library/README.md`, `src/features/plan/README.md`, `src/features/devtools/README.md`
- Modify: `tasks.txt` NEW15 progress note

- [ ] Step 1: Edit each; no rule changes, so no version raise (state that in the commit body).
- [ ] Step 2: `grep -rn "plan/examples\|/dev/examples\|EXERCISE_EXAMPLES\|PLAN_EXAMPLES" src scripts .claude/skills AGENTS.md` → nothing.
- [ ] Step 3: Commit `docs: skills and READMEs write to the library seed`.

### Task 9: Reset and reseed the library on the dev database

Permission for this reset was given in this session (2026-11-17) only.

- [ ] Step 1: Check `.env.local` `DATABASE_URL` host (memory `local-login-db`) and say which database before touching it.
- [ ] Step 2: In one transaction, delete `practice_plan_blocks`, `block_owners` where `user_id is null`, then blocks no
  owner row references, then `practice_plans`. Player-owned blocks and rows stay.
- [ ] Step 3: `npm run -s db:seed-plans && npm run -s db:seed-blocks`; note counts. Run `db:seed-blocks` again: zero new
  blocks, same plan-block count (Review Focus 5).
- [ ] Step 4: With the dev server up, call `find_plans` (expect the 7 former examples plus existing seed plans),
  `get_plan guitar-beginner`, `find_blocks { level: "beginner", area: "guitar" }`, and `get_block` on a showcase id from
  `showcaseBlocks()`.
- [ ] Step 5: Add a NEW15 progress note to `tasks.txt` (done, where; left: NEW17). No commit of `tasks.txt` lines that
  aren't ours.
