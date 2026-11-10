# Step choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `key-choice` exercise tool with `step-choice`: one row of chips per step whose options set key, tempo and position together, shown as "Stage 1…", "Variant 1…" or plain values, and known to the AI plan prompt.

**Architecture:** As today, the chooser is a tool section with no behaviour: `Sections.tsx` holds the picked option per step and a pure function rewrites the props of the step's other tools, which remount. A `PARTS` table (one entry per part: parse, chip text, apply) replaces the key-only code, with `transposeTool` kept as the `key` part's apply. Old `key-choice` data is rewritten to the new tool in `migrateTool`.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching app code), React, TypeScript, `node:test` through tsx, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-10-step-choice-design.md`

## Global Constraints

- Read `AGENTS.md`, `src/features/plan/README.md`, `src/features/exercises/CLAUDE.md` + `README.md`, `src/features/plan/examples/CLAUDE.md` + `README.md` first; keep the READMEs true in the commit that changes what they describe.
- Tests: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1); $TSX --test <files>` (`npx tsx` hangs here). Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Lint: `npx eslint <changed files>`.
- Commit to `main` through a temp `GIT_INDEX_FILE`; never `git add` in the real index. The tree has other sessions' uncommitted work: commit only your own files and hunks.
- Every word a player reads is written with its skill loaded first: chip words and the tour step with `design:ux-copy` + "Words about the app" in `teaching-voice`; prompt writing rules with `teaching-voice`; examples with `exercise-example`, then `review-teaching-text`.
- Prompt text about a tool's props comes from `COMPONENT_DOCS` (`npm run docs:exercises`), never hand-listed.
- Music facts (which position holds what, a key's notes) come from `npm run -s theory -- …`.
- `options`: 2 to 4. Parts: `key` (key slug), `bpm` (30-240), `position` (1-5). `label`: `"stage"`, `"variant"` or absent.
- Chip second line joins parts with " · " in the order key, tempo, position: `A · 80 bpm · Position 2`.
- The chooser does not count toward the 6-tool cap. One per step; the first counts.

## Review Focus

1. A plan stored with `key-choice` (or a heading's `keys`) opens with the same chips and the same moved tools, and never warns. → Task 3.
2. Picking a chip while a tool plays stops the sound (the tool remounts on every pick, also when only `bpm` changed). → Task 3, checked on screen in Task 6.
3. Option 1 that disagrees with the written tools: the screen still shows what chip 1 says (bpm and position are set from option 1 too), and the paste warns. → Task 1.
4. A `bpm` outside a backing-track's own range is clamped, not passed through. → Task 1.
5. A `position` option in a step whose neck can't take one position (a `position-neck` with `cross`) warns and leaves that tool as written. → Task 1.

---

### Task 1: The model

**Files:**
- Modify: `src/features/plan/model/tools.ts` (the `PlanTool` union, near line 78)
- Create: `src/features/plan/model/stepChoice.ts`
- Test: `src/features/plan/model/stepChoice.test.ts`

**Interfaces:**
- Consumes: `transposeTool`, `canTranspose`, `stepsOf`, `Step` from `./transpose`; `BACKING_MIN_BPM`, `BACKING_MAX_BPM` as `tools.ts` imports them.
- Produces, in `tools.ts` (`key-choice` stays in the union until Task 3):
  ```ts
  export type ChoiceLabel = "stage" | "variant";
  export interface StepOption { key?: number; bpm?: number; position?: number }
  // PlanTool gains: | { type: "step-choice"; label?: ChoiceLabel; options: StepOption[] }
  ```
- Produces, in `stepChoice.ts`:
  ```ts
  export type PartName = "key" | "bpm" | "position";
  export const PART_NAMES: PartName[];                     // in chip order: key, bpm, position
  export function partsOf(options: StepOption[]): PartName[];          // the parts option 1 holds
  export function canFollow(tool: PlanTool, part: PartName): boolean;
  export function applyOption(sections: Section[], options: StepOption[], index: number): Section[];
  export function stepChoice(sections: Section[], step: Step): Extract<PlanTool, { type: "step-choice" }> | null;
  export function choiceWarnings(sections: Section[]): string[];
  ```

- [ ] **Step 1: Write the failing tests** in `stepChoice.test.ts` (build tools with `parseTool`, as `transpose.test.ts` does):
  - `key`: `applyOption([staff in d, backing-band in d], [{key:2},{key:9}], 1)` gives both tools `key: 9`; index 0 returns them unchanged.
  - `bpm`: options `[{bpm:60},{bpm:80}]`, index 1 → `backing-band.bpm === 80`, `strum-along.bpm === 80`; a staff with `click: true` gets 80, a staff without `click` is unchanged.
  - `bpm` index 0 on a band written at 70 → 60 (Review Focus 3).
  - `bpm: 240` on a `backing-track` → `BACKING_MAX_BPM` (Review Focus 4).
  - `position`: `[{position:1},{position:4}]`, index 1 → `scale-neck.boxes` deep-equals `[4]`, `position-neck.positions` deep-equals `[4]`; a `position-neck` with `cross` is unchanged.
  - mixed `[{key:7,position:1},{key:0,position:4}]`, index 1 → scale-neck `key: 0`, `boxes: [4]`.
  - text and heading sections, and the `step-choice` section itself, come back as they were.
  - `canFollow`: `note-finder`/`key` false; `chord-shapes`/`bpm` false; `backing-band`/`bpm` true; `position-neck` with `cross`/`position` false.
  - `stepChoice` returns the first chooser of a step, null for a step without one.
  - `choiceWarnings`, one `assert.match` each: `/more than one step-choice/`; `/no tool for it to move/`; `/note-finder can't change key/`; `/no tool with a tempo/`; `/no neck that shows one position/`; `/option 1 should match the tools as written/` for a staff in d under `[{key:9},{key:2}]` and for a band at 70 under `[{bpm:60},{bpm:80}]`; `[]` for a clean step.

- [ ] **Step 2: Run** `$TSX --test src/features/plan/model/stepChoice.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Add the types to `tools.ts` and implement `stepChoice.ts`.** One `PARTS: Record<PartName, { follows(tool): boolean; apply(tool, value, first): PlanTool; written(tool): number | null }>` table drives `canFollow`, `applyOption` and `choiceWarnings`. `key.apply` is `transposeTool(tool, value - first)`; `bpm` and `position` set the value outright. Warnings name the step as `keyWarnings` does (`"Heading text"` or `the intro`).

- [ ] **Step 4: Run** the test file. Expected: PASS. Then `tsc` and eslint on the two files.

- [ ] **Step 5: Commit** `feat(plan): step-choice model (options that set key, tempo and position)`.

### Task 2: The component, its parser and its docs

**Files:**
- Create: `src/features/exercises/basics/step-choice/index.tsx`, `src/features/exercises/basics/step-choice/step-choice.props.ts`
- Modify: `src/features/plan/model/tools.ts` (`PARSERS`), `src/features/devtools/stories/stories.ts`, `src/features/guide/toolTours.ts`, `src/features/guide/toolTours.test.ts`, `src/features/exercises/README.md`
- Generated: `src/features/exercises/docs/docs.generated.json` (`npm run docs:exercises`)
- Test: `src/features/plan/model/diagnose.test.ts`

**Interfaces:**
- Consumes: `StepOption`, `ChoiceLabel`, `PART_NAMES`, `partsOf` (Task 1).
- Produces:
  ```ts
  // step-choice/index.tsx
  export function optionText(o: StepOption): string;   // "A · 80 bpm · Position 2"
  export function View(p: { options: StepOption[]; label?: ChoiceLabel; value?: number; onChange?: (index: number) => void }): JSX.Element;
  ```
  `value` / `onChange` are the option **index**. Without them (a story) the view keeps its own.
- `parseTool({ type: "step-choice", … })` returns the stored shape of Task 1.

- [ ] **Step 1: Write the failing parser tests** in `diagnose.test.ts`, replacing nothing yet:
  - `{ options: [{ key: "g" }, { key: "a" }] }` → `{ type: "step-choice", options: [{ key: 7 }, { key: 9 }] }`, no notes.
  - `{ label: "stage", options: [{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }] }` keeps `label` and the three options.
  - five options → four kept, a note matching `/at most 4 options/`.
  - `[{ key: "g", bpm: 60 }, { key: "a" }]` → the second option dropped with a note matching `/every option needs the same parts/`; one option left → `dropped` is `"a step-choice (it needs 2 to 4 different options)"`.
  - two equal options → dropped the same way.
  - `label: "level"` → no label, note matching `/label/`; no label with two parts → `label: "variant"`, note matching `/variant/`.
  - `bpm: 500` → `240` with a note; `position: 9` → that option dropped with a note.
  - with `stored: true` none of these notes appear.

- [ ] **Step 2: Run** `$TSX --test src/features/plan/model/diagnose.test.ts`. Expected: FAIL.

- [ ] **Step 3: Write the props file and the component.** `StepChoiceProps { options: {key?: string; bpm?: number; position?: number}[]; label?: "stage" | "variant" }` with an `@component step-choice basic` doc that states, for the AI: what a chip does (moves every tool in the same block, heading to heading), the parts and what each sets, same parts in every option, option 1 is how the block's tools are written, stage vs variant in one line each, one per block, where to put it (right before the tool it moves). Load `design:ux-copy` and `teaching-voice` before writing the on-screen words: row names `Key`, `Tempo`, `Position`; named chips `Stage 1` / `Variant 1` over `optionText`. Keep `role="radiogroup"`, the chip classes of `key-choice/index.tsx`, and `data-tour="step-choice-options"`.

- [ ] **Step 4: Add the `step-choice` entry to `PARSERS`**, run `npm run docs:exercises`, add three stories (plain keys, stages by tempo, variants by key and position) beside the `key-choice` story, and a `step-choice` tour step in `toolTours.ts` (+ its line in `toolTours.test.ts`).

- [ ] **Step 5: Run** `diagnose.test.ts`, `src/features/guide/*.test.ts`, `src/features/exercises/docs/*.test.ts`, `tsc`, eslint. Expected: PASS, clean. Open `/dev/stories` and read the three stories.

- [ ] **Step 6: Commit** `feat(exercises): step-choice chips (stages, variants, plain values)`.

### Task 3: The swap (key-choice out)

**Files:**
- Modify: `src/features/plan/model/migrate.ts`, `src/features/plan/model/tools.ts` (drop `key-choice` from `PlanTool` and `PARSERS`, `keysOf`, `liftHeadingKeys`), `src/features/plan/model/transpose.ts` (delete `transposeStep`, `stepKeys`, `keyWarnings`, and `"key-choice"` in `canTranspose` → `"step-choice"`), `src/features/plan/model/config.ts`, `src/features/plan/model/prompt.ts` (`settingsOf` only), `src/features/plan/ui/Sections.tsx`, `src/features/plan/ui/Tool.tsx`, `src/features/devtools/stories/stories.ts`, `src/features/guide/toolTours.ts` + test, `src/features/plan/README.md`, `src/features/exercises/README.md`
- Delete: `src/features/exercises/basics/key-choice/`
- Generated: `docs.generated.json`
- Test: `src/features/plan/model/transpose.test.ts`, `diagnose.test.ts`, `prompt.test.ts`, `stepChoice.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 and 2.
- Produces: `migrateTool({ type: "key-choice", keys })` → `{ type: "step-choice", options: keys.map((key) => ({ key })) }`; no `key-choice` anywhere in `src/` outside `migrate.ts`, `liftHeadingKeys` and their tests.

- [ ] **Step 1: Write the failing tests.**
  - `stepChoice.test.ts`: `parseSection({ type: "tool", tool: { type: "key-choice", keys: ["d", "a"] } })` deep-equals a `step-choice` with `[{ key: 2 }, { key: 9 }]`; the same from already-stored numbers `[2, 9]` with `stored: true` and no notes (Review Focus 1).
  - `transpose.test.ts`: the heading-`keys` test now expects a `step-choice` before the step's first tool; move the `transposeStep` / `keyWarnings` cases that Task 1 did not already cover into `stepChoice.test.ts` and delete the rest.
  - `prompt.test.ts` (near line 242): `settingsOf` of an exercise with `step-choice` `[{ key: 4, bpm: 60 }, { key: 6, bpm: 80 }]` lists both keys and `60-80 bpm`, and does not list `step-choice` among the tool names.
  - `diagnose.test.ts`: replace the three `key-choice` assertions with the old shape arriving through migration.

- [ ] **Step 2: Run** the four test files. Expected: FAIL.

- [ ] **Step 3: Model swap.** `migrateTool` case; `liftHeadingKeys` emits `step-choice`; `config.ts` calls `choiceWarnings` and skips `step-choice` in the tool count; `settingsOf` reads `options`.

- [ ] **Step 4: UI swap.** `Sections.tsx`: `picked` becomes the option index per step (`Record<number, number>`, default 0), the body comes from `applyOption`, the remount key is `` `${i}-${index}` `` for every tool of a step with a chooser, the chooser section renders with `{ value: index, onChange }`. `Tool.tsx`: `case "step-choice"`, prop renamed `choicePick`. Delete `basics/key-choice/`, its story and its tour; rerun `npm run docs:exercises`.

- [ ] **Step 5: Run** `$TSX --test src/features/plan/model/*.test.ts src/features/guide/*.test.ts src/features/exercises/*/*.test.ts src/features/devtools/*.test.ts src/features/devtools/*/*.test.ts`, `tsc`, eslint. Expected: the examples tests are not in this run and still fail until Task 5 only if they parse without migration; if `src/features/plan/examples/*.test.ts` passes here, migration is carrying the examples, which is what Review Focus 1 wants. `grep -rn "key-choice" src --include=*.ts --include=*.tsx` shows only migration code and tests.

- [ ] **Step 6: Commit** `feat(plan): step-choice replaces key-choice; old plans are read as the new tool`.

### Task 4: The prompt

**Files:**
- Modify: `src/features/plan/model/prompt.ts` (lines 212, 216, 286 as of this plan), `src/features/plan/README.md`
- Test: `src/features/plan/model/prompt.test.ts`

**Interfaces:**
- Consumes: the generated `step-choice` doc (Task 2).
- Produces: a prompt with no `key-choice` in it.

- [ ] **Step 1: Write the failing test:** the built prompt contains `step-choice`, `"stage"` and `"variant"`, and does not contain `key-choice`.

- [ ] **Step 2: Run** `$TSX --test src/features/plan/model/prompt.test.ts`. Expected: FAIL.

- [ ] **Step 3: Rewrite the three lines** with `teaching-voice` loaded. They must say:
  - which-tool list: the same drill again with one thing changed (faster, another key, another position) is a `step-choice` right before the tool it moves.
  - tools header: the student has no settings to change apart from a step-choice's chips; a step-choice does not count toward the 6.
  - writing rules: **stage** when each option is harder than the last and the student gets one right before moving on (a tempo ladder: say what "right" is); **variant** when the options are equals to compare (keys, positions) and the text asks what stays the same; plain key chips for a pattern that comes back in a second key, with "The notes change, the pattern doesn't." Point at a chip by its words on the screen ("tap Stage 2 above the neck", "tap A in the Key row above the staff"). In a step with a step-choice the text does not name one tempo, key or position as fixed. When the change comes with a new task, write a later block instead.

- [ ] **Step 4: Run** the prompt tests and read the built prompt on `/dev/prompt`. Expected: PASS; the tool's generated section and the three lines agree.

- [ ] **Step 5: Commit** `feat(plan): the prompt teaches step-choice, stages and variants`.

### Task 5: Examples, skills, versions

**Files:**
- Modify: the 7 example files that hold `key-choice` (`grep -l key-choice src/features/plan/examples/*/*.json`), one of them reworked to variants; `.claude/skills/exercise-example/SKILL.md` (lines 47 and 65), `src/features/plan/examples/README.md` (line 69), the four teaching skills' `version:`, `src/features/plan/examples/index.ts` (`DOC_VERSIONS.teaching: 2`), `AGENTS.md` ("Version" section: what teaching version 2 is)
- Create: `src/features/plan/examples/exercises/showcase-stages-tempo-ladder.json`
- Test: `src/features/plan/examples/examples.test.ts`

**Interfaces:**
- Consumes: the finished tool and prompt.
- Produces: no `key-choice` in any example; `docs.teaching` is 2 only in the examples rewritten here.

- [ ] **Step 1: Write the failing test** in `examples.test.ts`: no example section holds a tool of type `key-choice`; at least one example has a `step-choice` with `label: "stage"` and one with `label: "variant"`.

- [ ] **Step 2: Run** `$TSX --test src/features/plan/examples/*.test.ts`. Expected: FAIL.

- [ ] **Step 3: Change the rules, then the versions,** in one commit with the examples: the second-key rule in the skill and the README names `step-choice` and carries the stage / variant guidance of Task 4; the four skills go to `version: 2`, `DOC_VERSIONS.teaching` to 2, AGENTS.md says what changed.

- [ ] **Step 4: Move the examples** with `exercise-example` loaded. The plain second-key ones change only the tool (`{"type": "step-choice", "options": [{"key": "g"}, {"key": "a"}]}`): the "Key row" text stays true, and their `docs` tags stay as they are (they are not rewritten). Rework `guitar-beginner-pentatonic-box1.json` (it has two choosers) so one is a `"variant"` and its text asks what stays the same; write the new showcase as a `"stage"` tempo ladder on a guitar drill. Those two get `updated`, `model`, `docs: { agents: 1, teaching: 2 }` and a new `note`. Check every fact with `npm run -s theory`.

- [ ] **Step 5: Run** `review-teaching-text` on the two rewritten examples and fix what it finds. Run the examples tests, `tsc`. Expected: PASS.

- [ ] **Step 6: Commit** `docs(examples): step-choice in the examples and the writing rules (teaching v2)`.

### Task 6: On the screen

- [ ] **Step 1:** `next dev` (the first run may exit on an upgrade notice: run it again). In the user's Chrome, back up the `musickit.*` localStorage keys before pasting a plan and restore them after.
- [ ] **Step 2:** `/dev/stories`: the three `step-choice` stories at desktop and phone width. `/dev/examples`: the stage showcase and the variant example; every moved example still shows its Key row.
- [ ] **Step 3:** In the stage showcase, press Play, then tap Stage 2: the sound stops, the tool shows the new tempo, Play starts at it (Review Focus 2). In a key example, tap the second key: the staff or neck and the dots in the text move.
- [ ] **Step 4:** Paste a plan that still says `key-choice` into `/plan`: it builds with no warning about the tool and shows the Key row (Review Focus 1).
- [ ] **Step 5:** Report what was checked and what was not, with the strings written (old → new).
