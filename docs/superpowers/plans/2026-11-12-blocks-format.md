# Blocks format Implementation Plan (plan 1 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The plan's exercise becomes a block: a title with hashtags, an optional choice, and cells (text, list, notice, tool, section), parsed, prompted, stored and drawn, with the examples and the teaching documents rewritten to it.

**Architecture:** The content types move to `plan/model`: `Block`, `Cell`, `SectionCell`, `Choice`; `PlanExercise = Block & ExerciseMeta & { id? }`. The parsers stay context-free and the choice stays a layer applied on draw (`applyChoice`), with `pinned` on a tool opting it out. Old shapes are not read: the legacy readers go, and a stored plan without `cells` is dropped on load. Nothing of the editor, the article reader, the new tools or the WebMCP tools is in this plan; they are plans 2–6 and build on these types.

**Tech Stack:** TypeScript, Next.js, node:test through the cached `tsx` (`~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>`; `npx tsx` hangs on this machine).

**Spec:** `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md` (sections "The format", "What exists today", "What the player sees: the plan", "Interfaces").

## Global Constraints

- Work in the worktree `/Users/pio/projects/musickit/.claude/worktrees/blocks-notes-plan-merge`; one git command per Bash call, no heredocs; scripts go in the scratchpad and are run by absolute path.
- The cell kinds are exactly `text`, `list`, `tool`, `notice`, `section`. No `heading` cell. A section holds no section.
- A choice has two shapes: `options` (2–4, every option the same parts, as `step-choice` today) and `open` (the parts themselves, any value). Parts: `key`, `scale`, `bpm`, `position`, `level`.
- A tool is stored complete (its own key, scale, tempo); `pinned: PartName[]` on a tool keeps those parts from following.
- `focus` no longer exists anywhere: not in the types, the parser, the prompt, the examples, the progress log row, the screen.
- Hashtags: `#<area>`, `#<level>` and `#<kind tag>` at the end of a title are read into `area`, `level`, `tags`; the stored title has no hashtags. Fields written as fields are read too; both doors may write either.
- Limits stay: text 700, heading 100, list item 240, 8 items, 24 cells per block (sections' cells counted too), 8 exercises a day, 6 tools, 3 kind tags, 4 concepts, minutes 1–120, section minutes 1–60.
- Stored plans without `cells` on every exercise are dropped by the store, with the backup rule as today (`musickit.plan.backup` kept once). The progress log is untouched.
- Teaching version 4 → 5 in the four skills, `DOC_VERSIONS.teaching`, and every example's `docs.teaching`, in one commit with the examples' rewrite. `DOC_VERSIONS.agents` stays 1.
- Every word a player reads is written with the skills named in `AGENTS.md` (this plan changes almost none: the hashtag line on the card).
- Before the last commit: the touched tests, `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on changed files, and `/plan` with a demo plan and `/dev/examples` read on the screen (`npx next dev --webpack -p 3017`).

## Review Focus

1. An AI reply written with `sections` (the old key) instead of `cells`: the exercise warns "has no cells (did you write \"sections\"?)" and gets its title as one text cell, never a crash or a silent empty block. (Task 6)
2. A section inside a section: the inner one is left out with the reason "a section inside a section", its cells not lost silently into the warning count. (Task 4)
3. A title that is only hashtags, or carries an unknown hashtag (`#foo`): the title keeps a word, the unknown tag is dropped with a warning naming it, a known one is read. (Task 5)
4. A tool pinned to a part it cannot follow (`chord-shapes` pinned `key`): the pin is dropped with a note; a valid pin keeps the tool's own value under an open choice. (Tasks 2, 6)
5. A stored plan from before this format in `musickit.plan`: the player sees Start, the document is backed up once, the progress log still lists the old rows. (Task 9)

---

### Task 1: The types

**Files:**
- Modify: `src/features/plan/model/types.ts`
- Modify: `src/features/plan/model/tools.ts` (the `Section` type block at ~641, `StepOption`, `ChoiceLabel`)
- Test: `src/features/plan/model/plan.test.ts` (compiles only; no new test)

**Interfaces:**
- Produces, in `tools.ts`:
  ```ts
  export type PartName = "key" | "scale" | "bpm" | "position" | "level";
  export const PART_NAMES: PartName[] = ["key", "scale", "bpm", "position", "level"];
  export interface ChoiceOption { key?: number; scale?: string; bpm?: number; position?: number; level?: number }
  export type Choice = { label?: ChoiceLabel; options: ChoiceOption[] } | { open: ChoiceOption }; // open: at least one part
  export type Pinned = { pinned?: PartName[] };            // intersected into every PlanTool member
  export type Cell =
    | { type: "text"; text: string }
    | { type: "list"; items: string[] }
    | { type: "notice"; notice: "headphones" }
    | { type: "tool"; tool: PlanTool }
    | SectionCell;
  export interface SectionCell { type: "section"; heading: string; minutes?: number; choice?: Choice; cells: Exclude<Cell, SectionCell>[] }
  ```
  `step-choice` leaves `PlanTool`; `StepOption` is renamed `ChoiceOption`.
- Produces, in `types.ts`:
  ```ts
  export interface Block { title: string; choice?: Choice; cells: Cell[] }
  export interface ExerciseMeta { minutes: number; why?: string; level?: Level; area?: Area; tags?: string[]; topic?: string; concepts?: string[]; learnBefore?: string[]; exploreMore?: string[] }
  export type PlanExercise = Block & ExerciseMeta & { id?: string };
  ```
  `focus`, `sections`, `how`, `steps`, `tools`, `link` are gone from `PlanExercise`.

- [ ] **Step 1: Write the types** as above. Move `PartName` / `PART_NAMES` from `stepChoice.ts` into `tools.ts` (stepChoice.ts re-exports them until Task 6 replaces it).
- [ ] **Step 2: Run `npx tsc --noEmit 2>&1 | grep -v '^.next/' | wc -l`** and note the count. Expected: many errors (every consumer); this task only lands the types. Commit anyway so the tasks that follow have one base.
- [ ] **Step 3: Commit** `git add src/features/plan/model/types.ts src/features/plan/model/tools.ts` then `git commit -m "refactor(plan): block, cell, section and choice types"`.

### Task 2: `pinned` on a tool

**Files:**
- Modify: `src/features/plan/model/tools.ts` (`parseToolDiag`, ~613)
- Test: `src/features/plan/model/plan.test.ts`, `describe("tools")`

**Interfaces:**
- Consumes: `canFollow(tool, part)` from Task 6 is not ready; use the existing `PARTS[p].follows` by importing `canFollowPart` below.
- Produces: `export function canFollowPart(tool: PlanTool, part: PartName): boolean` in `tools.ts` (key: `canTranspose`; scale: `"scale" in tool`; bpm: today's `hasBpm` from stepChoice.ts moved here; position: `"boxes" in tool || "positions" in tool`; level: `hasLevel`). `parseToolDiag` reads `raw.pinned`: a list of `PART_NAMES` the tool can follow; others are left out with the note `"pinned" had parts it cannot follow (chord-shapes: key); left them out.`; an empty result stores no `pinned`.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it("pinned keeps the parts a tool can follow and notes the rest", () => {
    const p = parseToolDiag({ type: "scale-neck", scale: "major", key: "g", pinned: ["key", "bpm", "nope"] });
    assert.deepEqual(p.tool?.pinned, ["key"]);
    assert.ok(p.notes.some((n) => n.includes("cannot follow (scale-neck: bpm, nope)")));
    assert.equal(parseToolDiag({ type: "chord-shapes", chords: ["C"], pinned: ["key"] }).tool?.pinned, undefined);
  });
  ```
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/plan.test.ts` → FAIL (`pinned` undefined / no note).
- [ ] **Step 3: Implement** `canFollowPart` and the `pinned` read at the end of `parseToolDiag`, applied to every parsed tool (not in each parser).
- [ ] **Step 4: Run the test** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(plan): pinned parts on a tool"`.

### Task 3: Parsing a choice

**Files:**
- Create: `src/features/plan/model/choiceParse.ts` (moves `stepChoiceTool` and `optionOf` out of `tools.ts`)
- Modify: `src/features/plan/model/tools.ts` (remove `"step-choice"` from `PARSERS`, `TOOLS`, `toolInterface()`, `OFFERED` descriptions)
- Test: `src/features/plan/model/choice.test.ts` (new)

**Interfaces:**
- Produces: `export function parseChoiceDiag(raw: unknown, d: Diag): { choice: Choice | null; dropped?: string }`.
  Options shape: `raw.options` present → today's `stepChoiceTool` rules (2–4 options, same parts, label `stage`/`variant`, the notes word for word) returning `{ label?, options }`. Open shape: no `options` → read `key` (`keyOf`), `scale` (a slug `findModePage` or `findPentatonic` knows, else dropped with a note), `bpm` 30–240, `position` 1–7, `level` 0..`TOOL_LEVELS.length-1`; at least one part or `dropped: "a choice with no part it could read"`. `export function choiceSchema(): object` for the prompt: one JSON schema with `oneOf` the two shapes.

- [ ] **Step 1: Write the failing tests** in `choice.test.ts`: options shape parses as today's `step-choice` tests in `plan.test.ts` (move them: search `step-choice` there); `{ key: "a", scale: "minor-pentatonic" }` → `{ open: { key: 9, scale: "minor-pentatonic" } }`; `{ scale: "nope" }` → dropped with a note naming `"nope"`; `{ bpm: 500 }` → dropped.
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/choice.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `choiceParse.ts`; delete the `step-choice` parser from `tools.ts` and `TOOL_DOCS`/the offered list; the `exercises/basics/step-choice` component keeps its `COMPONENT_DOCS` but is no longer a tool (Task 10 rewires it).
- [ ] **Step 4: Run** both test files → PASS for choice; `plan.test.ts` fails only where it still names `step-choice` as a tool (fixed in Task 4).
- [ ] **Step 5: Commit** `git commit -m "feat(plan): choice parsing, options and open"`.

### Task 4: Parsing cells and sections

**Files:**
- Modify: `src/features/plan/model/tools.ts`: `parseSectionDiag` → `parseCellDiag`, `SECTIONS` → `CELLS`, `sectionInterface` → `cellInterface`; delete `legacySections`, `sectionsOf`, `StoredTool`, `liftHeadingKeys`
- Delete: `src/features/plan/model/migrate.ts` (and its tests in `plan.test.ts`: `describe("link slots")` keeps only the two-slot checks, which move to `config.ts`'s `parseSlots`)
- Test: `src/features/plan/model/plan.test.ts`, `describe("sections")` → `describe("cells")`

**Interfaces:**
- Produces:
  ```ts
  export interface CellParse { cell: Cell | null; dropped?: string; notes: string[] }
  export function parseCellDiag(raw: unknown, opts?: { inSection?: boolean }): CellParse
  export function cellInterface(): string[]   // the prompt's list: name, description, inputSchema per cell kind, section's schema naming `cells` and `choice` (choiceSchema())
  export const MAX_CELLS = 24;
  export const toolsOf = (cells: Cell[]): PlanTool[]   // every tool cell, sections flattened, in order
  export const cellsOf = (cells: Cell[]): Exclude<Cell, SectionCell>[]  // flattened, sections' cells inline, no section cells
  ```
  Section: `heading` (`MAX_HEADING`, required, empty → dropped "a section with no heading"), `minutes` 1–60 optional, `choice` through `parseChoiceDiag` (a dropped choice is a note, the section stays), `cells` each through `parseCellDiag({ inSection: true })`; a `section` with `inSection` → `dropped: "a section inside a section"`. Notice: `{ type: "notice", notice: "headphones" }`; any other `notice` value dropped "a notice of unknown kind". A `heading` cell → dropped `a cell of type "heading" (write a section instead)`.

- [ ] **Step 1: Write the failing tests**: a text, list, tool cell as today's section tests (rename); `{ type: "section", heading: "Position 1", minutes: 3, choice: { options: [{ key: "d" }, { key: "a" }] }, cells: [tool, list] }` parses with the choice; nested section dropped with that reason and the outer section kept; `heading` cell dropped with the "write a section" reason; notice kinds; `toolsOf` flattens in order.
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/plan.test.ts` → FAIL.
- [ ] **Step 3: Implement**, delete the legacy readers and `migrate.ts`, fix `tools.ts` imports.
- [ ] **Step 4: Run** → PASS for the `cells` and `tools` describes (`parsePlanConfig` tests still fail until Task 6).
- [ ] **Step 5: Commit** `git commit -m "feat(plan): cells and sections replace sections and headings; legacy readers removed"`.

### Task 5: Hashtags in the title

**Files:**
- Create: `src/features/plan/model/hashtags.ts`
- Test: `src/features/plan/model/hashtags.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TitleTags { title: string; area?: Area; level?: Level; tags: string[]; unknown: string[] }
  export function readTitle(title: string): TitleTags   // trailing `#word` tokens (any number, any order, case-insensitive) matched against EXERCISE_AREAS, EXERCISE_LEVELS, EXERCISE_TAGS keys; unknown ones listed; title trimmed; a title left empty keeps its first hashtag word as the title
  export function hashtagLine(meta: { area?: Area; level?: Level; tags?: string[] }): string  // "#guitar #beginner #technique" in that order; "" when none
  ```
  Only trailing hashtags count: `"Play #1 then #2 #guitar"` → title `"Play #1 then #2"`, area guitar (a `#` followed by a digit is never a tag).

- [ ] **Step 1: Write the failing tests** for the examples above, plus `readTitle("#voice")` → `{ title: "voice", area: "voice" }` and `readTitle("Drill #foo")` → `unknown: ["foo"]`, title `"Drill"`.
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/hashtags.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `git commit -m "feat(plan): hashtags in a title"`.

### Task 6: The choice as a layer; blocks, checks and the block parser

**Files:**
- Rename: `src/features/plan/model/stepChoice.ts` → `src/features/plan/model/choice.ts`
- Modify: `src/features/plan/model/blocks.ts`, `checks.ts`, `transpose.ts` (delete `stepsOf`, `Step`), `config.ts`
- Test: `src/features/plan/model/choice.test.ts`, `plan.test.ts` (`parsePlanConfig`, blocks, checks)

**Interfaces:**
- Produces, `choice.ts`:
  ```ts
  export function partsOf(choice: Choice): PartName[]                       // options: option 1's parts; open: the parts set
  export function valueOf(choice: Choice, index: number): ChoiceOption       // options[index] (outside: option 1); open: the open values
  export function applyChoice<T extends Cell>(cells: T[], choice: Choice, index: number): T[]  // every tool cell (not inside sections: the caller passes a section's cells for a section's choice) set to valueOf(choice, index) for each part it can follow and has not pinned; `scale` sets `tool.scale` when the slug fits the tool (a pentatonic on a scale-neck is fine; an interval-singer has no scale); option 1 / open written values are the base as `applyTo` does today
  export function resolvedChoice(block: Block, section?: SectionCell): Choice | undefined  // the section's, else the block's
  export function choiceWarnings(block: Block): string[]                     // today's rules per section and for the block's own cells, with the block named "the intro" and a section by its heading; plus for an open choice: a tool written in another value than the open one, not pinned: `scale-neck written in G under a choice in A; it will follow A.`
  ```
- Produces, `blocks.ts`: `blocksOf(cells: Cell[]): TimedBlock[]` where a timed block is a section cell with `minutes` (`{ title, minutes, index }`, `index` into `cells`); cells before the first timed section belong to block 1 as today; `fitBlocks(cells, minutes)` scales section minutes the same way; `blockAt` unchanged.
- Produces, `checks.ts`: `mixesSingAndPlay(cells)`, `tempoWithoutMetronome(cells)` over `toolsOf(cells)`.
- Produces, `config.ts`:
  ```ts
  export interface BlockParse { block: PlanExercise | null; warnings: string[] }
  export function parseExercise(raw: unknown, where: string, entries: CatalogueEntry[]): BlockParse  // one exercise: title + hashtags, minutes, choice, cells (MAX_CELLS over the flattened count), fitBlocks, the checks, choiceWarnings, level/area/tags (fields ∪ hashtags; unknown hashtags warned as unknown kind tags), topic/concepts, why, slots, tool count, learnBefore
  export function parsePlanConfig(text: string, entries: CatalogueEntry[]): ParseResult        // unchanged signature; days of parseExercise
  ```
  A raw exercise with `sections` and no `cells` warns `${where}: has no cells (did you write "sections"?).` and gets `[{ type: "text", text: title }]`.

- [ ] **Step 1: Write the failing tests**: `applyChoice` on an open choice moves an unpinned scale-neck's key and scale and leaves a pinned one; `choiceWarnings` wording for the open mismatch; `blocksOf` over sections with minutes; `fitBlocks` scaling section minutes; `parseExercise` reading hashtags (`"Barre drill #guitar #beginner #technique"` → fields set, title `"Barre drill"`); the `sections` → "did you write" warning; today's `parsePlanConfig` tests rewritten to cells (the fixture plans in `plan.test.ts` use sections with headings: replace each heading run with a section cell).
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/plan.test.ts src/features/plan/model/choice.test.ts` → FAIL.
- [ ] **Step 3: Implement**; delete `stepsOf`; `Sections.tsx` and devtools break further here (Task 10).
- [ ] **Step 4: Run** → PASS for both files.
- [ ] **Step 5: Commit** `git commit -m "feat(plan): the choice as a layer over cells; block parser"`.

### Task 7: The prompt

**Files:**
- Modify: `src/features/plan/model/prompt.ts` (`settingsOf`, `weekReport`'s about clause, the `how to plan`, `exercise-format`, `sections` → `cells`, `rules`, `mistakes`, `how to write`, `answer-format` parts)
- Test: `src/features/plan/model/prompt.test.ts`

**Interfaces:**
- Consumes: `cellInterface()`, `choiceSchema()`, `toolsOf`, `hashtagLine`.
- Produces: the part ids `exercise-format`, `cells` (was `sections`), the rest unchanged; `prompt.test.ts`'s documented order updated.

Copy the spec pins (write these lines; the rest of the part text is the builder's, in the same voice as the lines around it):
- Exercise format: "An exercise is a block: a title, an optional choice, and a list of \"cells\" shown top to bottom. A section is a cell with a heading, minutes and its own cells: write one section per step. A choice at the top of the block or in a section's header sets the key, scale, tempo, position or level of the tools under it; a tool that must keep its own value lists the part in \"pinned\"."
- The focus rule (`"- Every exercise has a \"focus\"…"`) is removed; the "One chart per step when the focus changes" mistake keeps its words (it is not the field).
- "The same drill again with one thing changed…: a section with a choice of options" replaces the step-choice line; "The selector a step-choice draws" → "The selector a choice draws"; the stages/variants paragraph names `choice` with `"label"`.
- Answer format `Exercise` type: `title: string; // may end with hashtags: #<area> #<level> #<tag>`, `choice?: Choice; // see Cells`, `cells: Cell[]; // see Cells`; `focus` gone; `sections` gone. The final check line "Block minutes add up…" → "Section minutes add up to the exercise's minutes, and an exercise over 5 minutes has 2 or more sections with minutes."
- `settingsOf`: over `toolsOf(e.cells)`; a choice's options add their keys and tempos as the step-choice did.

- [ ] **Step 1: Update the failing tests** (`prompt parts have unique ids in the documented order`, `the prompt teaches step-choice…` → `teaches choice…`, `legacy plans…` deleted, `settingsOf` fixtures to cells; add `the prompt names cells, sections, choice and hashtags, and never focus or step-choice`).
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/prompt.test.ts` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(plan): the prompt teaches blocks, cells, sections and choices"`.

### Task 8: Examples, README and the teaching version

**Files:**
- Create (scratchpad, not committed): `rewrite-examples.mjs`
- Modify: every `src/features/plan/examples/exercises/*.json` and `plans/*.json`, `examples/README.md`, `examples/index.ts` (`DOC_VERSIONS.teaching = 5`), `.claude/skills/{exercise-example,teaching-voice,course-article,review-teaching-text}/SKILL.md` (`version: 5`), `src/features/plan/examples/examples.test.ts`, `src/features/plan/demos.ts` if it reads `sections`
- Test: `examples.test.ts`

**Interfaces:** consumes `parsePlanConfig` / `parseExercise` for the zero-warnings check.

The script, per exercise (alone or in a plan): a `heading` section opens `{ type: "section", heading, minutes?, cells: [] }` that runs to the next heading; a `step-choice` tool in a step becomes that section's `choice` (`{ label?, options }`; in the intro: the block's `choice`); cells before the first heading are the block's own; `focus` deleted; `docs.teaching` set to 5; keys inside the step-choice's `keys`-on-heading form (6 files hold `"keys":`) are the old `key-choice` shape and are already converted by the parser today: check them by hand after the script. Written back with the repo's JSON style (2-space, same key order: use `JSON.stringify(v, null, 2)` and compare the diff for churn).

- [ ] **Step 1: Write and run the script** `node /abs/scratchpad/rewrite-examples.mjs` (reads and writes the 28 files).
- [ ] **Step 2: Update `examples.test.ts`**: "block minutes sum…" over sections; "no example holds the old key-choice; a choice is shown as stages and as variants"; "fits the parser's limits" counting cells flattened; "named notes are lit in the tool after the text" walking `cellsOf`; `DOC_VERSIONS` check reads `version: 5`.
- [ ] **Step 3: Run** `tsx --test src/features/plan/examples/examples.test.ts` → FAIL on the version line until the skills and `DOC_VERSIONS` are edited; then PASS, zero warnings on every example.
- [ ] **Step 4: Rewrite the documents** with the `exercise-example` skill loaded: `examples/README.md` "Format" (cells, sections with minutes, a choice in a section's header or on the block, hashtags allowed in a title, no focus), the `exercise-example` skill (step 3 "Shape the blocks" → sections; line 31 drops `focus`; lines 52–53 name the choice), one line in `teaching-voice` "The selector" if it names `step-choice`. Raise the four `version:` lines and `DOC_VERSIONS.teaching` to 5.
- [ ] **Step 5: Read two rewritten examples** (`showcase-stages-tempo-ladder`, `guitar-beginner.json`) by eye for a lost heading or a choice on the wrong section.
- [ ] **Step 6: Commit** `git add src/features/plan/examples .claude/skills` then `git commit -m "feat(examples): rewritten to cells and sections; teaching version 5"`.

### Task 9: The store and the progress log

**Files:**
- Modify: `src/features/plan/store/localPlanStore.ts` (`isPlan`), `src/features/plan/model/progressLog.ts` (drop `focus`), `src/features/progress/log.ts` (drop `focus` from the row type and sanitiser), `src/features/plan/model/exerciseIds.ts` (walks `days[].exercises[]`: unchanged unless it touches sections)
- Test: `src/features/plan/model/plan.test.ts` (store), `progressLog.test.ts`, `src/features/progress/*.test.ts`

**Interfaces:** `isPlan(p)` also requires every exercise of every day to have `Array.isArray(e.cells)`; a plan failing it is dropped from `current` and `history` (the existing backup rule stores the raw document once).

- [ ] **Step 1: Write the failing tests**: `sanitiseState` with a plan whose exercises have `sections` → `current: null`, `history: []`; the backup test in `exerciseIds.test.ts` (line ~132 builds an old document) updated to expect the drop; a progress row without `focus`.
- [ ] **Step 2: Run** the three test files → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(plan): old plans are dropped on load; focus leaves the progress log"`.

### Task 10: The screen and the dev tools compile and draw cells

**Files:**
- Modify: `src/features/plan/ui/Sections.tsx` → `Cells.tsx` (export `Cells({ cells, choice, address })`), `ExerciseCard.tsx`, `src/features/exercises/basics/step-choice/index.tsx` (→ `choice/index.tsx`, props `{ choice: Choice; index: number; onPick }`; an open choice draws nothing here), `src/features/devtools/model/comments.ts`, `preview.ts`, `stories/stories.ts`, `data/DataPage.tsx`, `src/features/plan/ui/AgentExerciseTools.tsx` (tool list no longer offers `step-choice`), `src/features/guide/toolTours.ts` if it keys `step-choice`
- Test: `src/features/devtools/*.test.ts`, `src/features/guide/*.test.ts`

**Interfaces:**
- `Cells`: draws the block's own cells, then each section as today's step (heading with its minutes, the rail, the chips of an `options` choice in the section header, `applyChoice` on pick); an `open` choice is applied with index 0 and not drawn (the spec: a plan exercise's key is the AI's business). `ExerciseCard`: title without hashtags, then `hashtagLine(e)` in small muted type where the focus line was (the article look itself is plan 2); the level / area / tag chips are gone. `comments.ts` addresses cells by their flattened index (`cellsOf`). `preview.ts` recognises an exercise by `Array.isArray(raw.cells)`.

- [ ] **Step 1: Make it compile**: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` → 0 lines.
- [ ] **Step 2: Run** `tsx --test src/features/devtools/*.test.ts src/features/devtools/*/*.test.ts src/features/guide/*.test.ts src/features/plan/model/*.test.ts src/features/plan/examples/*.test.ts src/features/progress/*.test.ts` → PASS.
- [ ] **Step 3: eslint** on every changed file → clean.
- [ ] **Step 4: Read it on the screen**: `npx next dev --webpack -p 3017`; `/demo/guitar-beginner` (sections with rails and minutes, a stages chooser's chips, the hashtag line under the title, no focus line, no chips); `/plan` paste of `plans/voice-advanced.json`'s `plan` object wrapped as a reply → Build my plan, the week shows; `/dev/examples` lists every example with no warning. Say what was checked.
- [ ] **Step 5: Commit** `git commit -m "feat(plan): the screen and dev tools draw cells and sections"`.

### Task 11: Documents

**Files:**
- Modify: `src/features/plan/README.md` ("The plan format", "Tools", the code map: `choice.ts`, `choiceParse.ts`, `hashtags.ts`, `Cells.tsx`; `migrate.ts` and `stepChoice.ts` gone), `src/features/plan/CLAUDE.md` where it names sections, headings or step-choice, `src/features/exercises/README.md` or `CLAUDE.md` where `step-choice` is listed as a tool.

- [ ] **Step 1: Rewrite** the format section of the plan README to the spec's JSON example and the rules above (cells, sections, choice shapes, pinned, hashtags, no old data).
- [ ] **Step 2: Commit** `git commit -m "docs(plan): the block format"`.
