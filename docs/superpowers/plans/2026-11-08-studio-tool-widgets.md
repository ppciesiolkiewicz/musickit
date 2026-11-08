# Studio widgets from the learning components: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The studio and the notes creator add learning components (the AI plan's tools) as `tool` widgets from a family-based spotlight with a props step, "Add another", and an on-stage list whose rows edit in an accordion.

**Architecture:** A new plan-free `Tool` renderer is shared by the plan and the stage. A new `Subject` kind `tool` wraps a parsed `PlanTool`; a curated `FAMILIES` list in `stage/model` says which components are offered, their main controls and how a row is named. `Palette.tsx` gains a step-two view, an on-stage section and an accordion on top of it. `caged` gains `shapes`. Old subject kinds are untouched, so saved stages and widget videos load as before.

**Tech Stack:** Next.js (breaking-changes version: read the relevant guide in `node_modules/next/dist/docs/` first), React, TypeScript, `tsx --test` (the cached tsx; `npx tsx` hangs here), Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-08-studio-widget-families-design.md` (tickets: `2026-11-08-studio-ux-tickets.md`)

**Branch:** work on a branch (`studio-tool-widgets`) in a worktree (using-git-worktrees; in worktrees run `next dev --webpack`, no heredocs or chained git), then land on main as one squashed commit. Not pushed unless asked.

## Global Constraints

- `Subject` is plain JSON: a new kind needs `Subject`, `sanitiseSubject`, `subjectTitle`/`subjectName`, `defaultRect`, the renderer (`StageWidget` + its `WIDTH` table) and a test (`stage/CLAUDE.md`).
- Old kinds (`position`, `caged`, `neck`, `section`, `plugin`...) and the old `caged.shape` field keep loading unchanged; no migration.
- `stage` never imports the looper, the studio page, recording, the editor, or the plan store/React context. `Tool` must be usable without `usePlan`.
- The palette stays outside the recorded frame (`data-chrome`); shortcuts use `KeyboardEvent.code` and never fire while typing.
- The master key moves a tool widget's key (tonic, a pitch class number) only; its scale never follows the master; `pinned` on a tool can only hold `"tonic"`.
- A `tool` subject stores the parsed plan form (`key` number, `scale` slug), parsed with `TOOLS[type].parse`.
- Mic tools (`staff`, singers) use the studio's one audio input and the mic badge (`takesMic`).
- Typing "pent pos 2" or "e shape" must still add that single widget with one Enter.
- Music facts come from `npm run -s theory -- ...` / `lib/chordKit`.
- Plan tests and `docs.generated.json` (`npm run docs:exercises`) stay green. Type check: `npx tsc --noEmit` (ignore `.next/` lines) and lint. Tests: `tsx --test src/features/stage/model/*.test.ts src/features/plan/model/*.test.ts src/features/exercises/**/*.test.ts` (cached tsx).
- Update `spec/studio.md`, `stage/CLAUDE.md` (import rule), `spec/creator.md` if the creator's palette changes.

## Review Focus

- A saved stage with only old kinds loads and renders identically (test: sanitise a fixture of every old kind).
- A `tool` subject with a bad type, bad props or an unoffered type is dropped by `sanitiseSubject`, not crashing the stage.
- Master key change with a pinned and an unpinned tool widget: only the unpinned moves (test in `subject.test.ts`).
- Two identical tool widgets are both kept and independently editable (ids differ; identity ticks both).
- Typing a mode/key ("ionian", "a dorian") returns family rows, never an empty list or a camera command first.

---

### Task 1: Plan-free `Tool` renderer

**Files:**
- Create: `src/features/plan/ui/Tool.tsx`
- Modify: `src/features/plan/ui/ExerciseTool.tsx` (the `Tool` function and its view imports move out; it keeps `ExerciseTool`, `params`, `usePlan`, DevName)
- Modify: importers of `Tool` from `ExerciseTool` (grep `from ".*ExerciseTool"`, e.g. the /dev/stories canvas)

**Interfaces:**
- Produces: `export function Tool({ tool, voice }: { tool: PlanTool; voice?: Voice }): JSX.Element` in `plan/ui/Tool.tsx`, identical behaviour to today, importing nothing from `store/` or `usePlan`. `ExerciseTool.tsx` re-exports it (`export { Tool } from "./Tool"`) so existing imports keep working.

- [ ] **Step 1:** Run the plan and exercises tests and `npx tsc --noEmit`; record that they pass (baseline).
- [ ] **Step 2:** Move `Tool`, the view imports and the `PlayAlong` dynamic import into `Tool.tsx`; `ExerciseTool.tsx` imports and re-exports `Tool`.
- [ ] **Step 3:** Run the same tests and tsc; Expected: same results as baseline. Add an assertion in a plan test (or a lint-level import check) that `Tool.tsx` does not import `../store`: `readFileSync` the file and `assert.ok(!/store\//.test(src))`.
- [ ] **Step 4:** Commit on the branch: `refactor(plan): Tool in its own file, free of the plan store`.

### Task 2: The `tool` subject

**Files:**
- Modify: `src/features/stage/model/subject.ts` (type, `sanitiseSubject`, `subjectName`, `subjectTitle`, `subjectIdentity`, `keyOf`/`withMaster`/`withOwnKey`/`followMaster`/`pinAgainst`, `takesMic`), `src/features/stage/model/layers.ts` (`defaultRect`, wherever per-kind defaults live)
- Test: `src/features/stage/model/subject.test.ts`

**Interfaces:**
- Produces: `Subject` gains `{ kind: "tool"; tool: PlanTool; pinned?: ["tonic"] }`.
- Produces: `STAGE_TOOLS: ToolName[]` (the types a stage may hold: `scale-neck`, `position-neck`, `arpeggio-neck`, `chord-shapes`, `staff`; the list Task 3's families draw from) and `toolKey(tool: PlanTool): number | null`, `withToolKey(tool: PlanTool, pc: number): PlanTool` in `stage/model/toolKey.ts` (tools without a `key` field return null / are unchanged; `arpeggio-neck`'s key is its chord's root, so `withToolKey` re-roots the chord symbol).

- [ ] **Step 1: Failing tests** in `subject.test.ts`: (a) `sanitiseSubject({kind:"tool", tool:{type:"scale-neck", scale:"minor-pentatonic", key:9, boxes:[1,2]}}, ids)` returns a tool subject equal to the parsed tool; (b) a bad scale, an unknown `type`, or a `type` not in `STAGE_TOOLS` gives `null`; (c) `withMaster` with a master tonic of D moves an unpinned scale-neck widget's `key` to 2 and leaves a `pinned: ["tonic"]` one at 9; (d) `withOwnKey` on a tool sets `pinned: ["tonic"]`; (e) `subjectIdentity` of two tools with different keys but equal scale/boxes is equal; (f) `takesMic` is true for a `staff` tool with `mic: true`; (g) a fixture holding one subject of every old kind round-trips through `sanitiseSubject` unchanged.
- [ ] **Step 2:** Run `tsx --test src/features/stage/model/subject.test.ts`; Expected: FAIL.
- [ ] **Step 3:** Implement. Parse with `TOOLS[type].parse` (import `TOOLS`, `PlanTool`, `ToolName` from `@/features/plan/model/tools`; type-only for the rest). Name/title: filled in by Task 3's `describeTool`, here a plain fallback `"<type> · <key name>"`. `defaultRect`: wide components (`scale-neck`, `position-neck`) 0.6 × 0.5 of the frame, others 0.4 × 0.4.
- [ ] **Step 4:** Run subject and layers tests; Expected: PASS.
- [ ] **Step 5:** Commit: `feat(stage): tool subject wrapping a plan tool`.

### Task 3: Families: the curated list and row naming

**Files:**
- Create: `src/features/stage/model/families.ts`, `src/features/stage/model/families.test.ts`
- Modify: `src/features/stage/index.ts` (export)

**Interfaces:**
- Consumes: `Subject`, `STAGE_TOOLS`, `toolKey`, `withToolKey` (Task 2), `docOf` from `@/features/exercises/docs`.
- Produces in `families.ts`:
  - `interface Family { id: string; title: string; words: string[]; sub?: string; make(values: FamilyValues, key: KeyChoice): Subject; controls: FamilyControl[]; read(s: Subject): FamilyValues | null; describe(s: Subject): string }`
  - `type FamilyValues = Record<string, string | number | number[] | string[]>`; `FamilyControl = { name: string; label: string; kind: "choice" | "multi" | "text"; options?: { value: string | number; label: string }[]; default: ... }` (the "main props"; everything else is under "More" via `docOf(type).props`).
  - `FAMILIES: Family[]` with ids `pentatonic` (scale-neck, scale minor/major pentatonic slug, control `boxes` multi 1..5), `scale-positions` (scale-neck or position-neck for full scales, boxes 1..5), `three-nps` (position-neck, positions 1..7), `caged` (wraps the `caged` subject, control `shapes` multi C/A/G/E/D plus "Overview"), `arpeggio` (arpeggio-neck, control `chord` text, `boxes`), `chord-shapes`, `staff`.
  - `familyOf(s: Subject): Family | null`, `describeSubject(s: Subject): string | null` ("Major pentatonic · C major · positions 1, 2"), `updateSubject(s: Subject, values: FamilyValues): Subject` (same key and pins, new props).
- [ ] **Step 1: Failing tests** (names and assertions): `describeSubject` of a major-pentatonic scale-neck, key 0, boxes [1,2] equals `"Major pentatonic · C major · positions 1, 2"`; with no boxes it omits the positions part; a `caged` subject with `shapes: ["E","A"]` equals `"CAGED · C major · E, A shapes"` (key per the CAGED widget's `cagedQualityOf`); `familyOf` of each family's `make(...)` result is that family; `updateSubject` keeps `pinned` and `key`; `make` with the minor pentatonic and key A gives scale slug `minor-pentatonic` (check the slug against `npm run -s theory -- scale A minor-pentatonic` and `lib/chordKit/scalePositions`).
- [ ] **Step 2:** Run `tsx --test src/features/stage/model/families.test.ts`; Expected: FAIL.
- [ ] **Step 3:** Implement. Box counts and CAGED letters come from `POSITION_COUNT` (search.ts; move to a shared const) and `CAGED_LETTERS`. Main-control defaults: boxes `[1]`. Wire `subjectName`/`subjectTitle` for `tool` to `describeSubject`.
- [ ] **Step 4:** Run; Expected: PASS. Commit: `feat(stage): widget families`.

### Task 4: CAGED `shapes`

**Files:**
- Modify: `src/features/stage/model/subject.ts` (caged variant, sanitise, name/title), `src/features/stage/render/StageWidget.tsx` (the `caged` case), `src/features/stage/model/families.ts` (caged family uses `shapes`)
- Test: `subject.test.ts`

**Interfaces:**
- Produces: `{ kind: "caged"; shape: CagedLetter | null; shapes?: CagedLetter[] } & Keyed`. `shapes` (non-empty, deduped, in CAGED order) wins over `shape` when both exist; `shape` alone behaves as today.

- [ ] **Step 1: Failing tests:** sanitise keeps `shapes: ["E","A"]` as `["A","E"]` (CAGED order C A G E D); drops unknown letters; empty `shapes` falls back to `shape`; an old `{kind:"caged", shape:"E"}` is unchanged; `subjectIdentity` ignores key and includes shapes.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement; in `StageWidget`, render `CagedBoxPanels` once per letter in a column (reuse the existing single-shape render per letter). **Step 4:** Run; PASS.
- [ ] **Step 5:** Commit: `feat(stage): several CAGED shapes in one widget`.

### Task 5: Render `tool` widgets

**Files:**
- Modify: `src/features/stage/render/StageWidget.tsx` (`WIDTH.tool`, a `tool` case), `src/features/stage/index.ts`

**Interfaces:**
- Consumes: `Tool` (Task 1), `MicContext`/studio input (`takesMic`).

- [ ] **Step 1:** Add `tool: 980` to `WIDTH` (TypeScript fails until it exists) and a `case "tool"` rendering `<Tool tool={subject.tool} />` inside the same bordered box the `plugin` case uses, with `KeyTags`-style key/ scale tags only if they exist for other keyed kinds (reuse, don't invent). Mic tools read the studio input via `MicContext` rather than starting their own: if `Staff` needs a prop, add `externalMic?: boolean` handled in `staff/index.tsx`, off by default so plan output is unchanged.
- [ ] **Step 2:** Add a render test only if the project has render tests for other widgets (check `stage/render`); otherwise verify in the browser in Task 8.
- [ ] **Step 3:** `npx tsc --noEmit`; Expected: no new errors. Commit: `feat(stage): draw tool widgets`.

### Task 6: Search over families

**Files:**
- Modify: `src/features/stage/model/search.ts`, `src/features/stage/model/subject.ts` (`PALETTE_GROUPS` if rows move group), `search.test.ts`

**Interfaces:**
- Produces: `paletteCatalog` rows for families are `PaletteResult` with `action: { type: "family"; familyId: string; key: KeyChoice }` (new action variant next to `add` and `command`); an "Add another" row per repeatable family uses `{ type: "family", familyId, key, another: true }`. Typed single-widget searches ("pent pos 2", "e shape", "a pentatonic") still return `add` results with `tool` subjects (pentatonic/position kinds) or the `caged` subject.
- Produces: `searchPalette("ionian", ...)` returns one `family` row per family that takes a mode, with the typed key; no flat per-box rows.

- [ ] **Step 1: Failing tests:** (a) catalog contains exactly one row each for pentatonic, scale-positions, three-nps, caged, and none of the old per-box rows; (b) `searchPalette("e minor pent pos 1")[0]` is an `add` of a scale-neck tool, minor-pentatonic, key 4, boxes [1], `pinned: ["tonic","scale"]` replaced by `["tonic"]`; (c) `searchPalette("e shape")[0]` is the `caged` subject with `shapes: ["E"]`; (d) `searchPalette("ionian")` is non-empty, all `family` rows, none a studio command; (e) `searchPalette("a dorian")` family rows carry `key` A dorian; (f) existing assertions in `search.test.ts` that count per-box rows are rewritten to the new counts.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement in `entries()`/`parse()`: replace the position and caged loops with family entries; keep `parse` for typed boxes/shapes. Update `Palette.tsx`'s `PaletteResult` handling for the new action type in Task 7 (type-level only here: `toggle` ignores unknown actions until then).
- [ ] **Step 4:** Run stage tests; PASS. Commit: `feat(stage): palette searches families`.

### Task 7: Palette UI: step two, on-stage section, accordion

**Files:**
- Modify: `src/features/teachers/studio/Palette.tsx`, `src/features/teachers/studio/StudioApp.tsx` (pass `onUpdate`), the creator's palette use (`src/features/creator/CreatorApp.tsx` if it mounts `Palette` with `notes`)
- Create: `src/features/teachers/studio/FamilyStep.tsx` (step two + the accordion form, shared)
- Test: pure helpers in `families.test.ts` (Task 3); this task is mostly UI, verified in the browser (Task 8)

**Interfaces:**
- Consumes: `FAMILIES`, `familyOf`, `describeSubject`, `updateSubject`, `FamilyControl`.
- Palette props gain `onUpdate: (layerId: string, subject: Subject) => void`.
- `FamilyStep({ family, key, initial?, onAdd, onChange, onBack }: ...)`: renders the family's `controls` (multi = toggle chips with "All"; choice = select; text = input) and a collapsed "More" section generated from `docOf(type).props` for the remaining props as JSON-validated text inputs; `onAdd(values)` for a new widget, `onChange(values)` for an existing one.

- [ ] **Step 1:** Palette top section "On the stage": one row per layer whose subject has `describeSubject`, label from it, an accordion toggle revealing `FamilyStep` bound to that layer (`onUpdate(layer.id, updateSubject(...))`), and a remove button (`onRemove`). Other layers keep today's ticked rows.
- [ ] **Step 2:** A `family` result opens step two in the same dialog (state `step: {family, key} | null`); Enter adds via `onPick({ action: { type: "add", subject: family.make(values, key) } })` and returns to step one; Esc or a "Back" row returns without closing; "Add another …" rows open step two with nothing preselected. Keep the search input focus and the `stopPropagation` keyboard handling.
- [ ] **Step 3:** In the notes creator (`notes` prop) the family rows exclude `isLive` subjects as the catalog filter already does.
- [ ] **Step 4:** `npx tsc --noEmit` and lint; Expected: clean. Commit: `feat(studio): family step, on-stage list and accordion in the spotlight`.

### Task 8: Docs and browser check

**Files:**
- Modify: `spec/studio.md`, `src/features/stage/CLAUDE.md` (stage may import `@/features/exercises` and the plan's `Tool` and `model/tools`, not the plan store), `spec/creator.md` if touched, `docs/superpowers/specs/2026-11-08-studio-ux-tickets.md` (mark ticket 1 done, note caged-neck as a later ticket)

- [ ] **Step 1:** Update the docs above.
- [ ] **Step 2:** Run the app (the `run` skill; in a worktree `next dev --webpack`) at `/teachers/studio` and `/cheatsheet` (use the real-browser rules in memory: back up and restore localStorage keys). Check: palette shows one row per family; pentatonic step two toggles boxes 1 and 2 and Enter adds one widget; the on-stage row reads "Major pentatonic · C major · positions 1, 2"; the accordion changes boxes live; "Add another" adds a second widget; "ionian" lists family rows; "e shape" Enter adds one CAGED widget; CAGED with two shapes shows two panels; changing the master key moves an unpinned tool widget only; a staff widget uses the studio mic; an old saved stage still loads. Screenshot the spotlight.
- [ ] **Step 3:** Run all tests, tsc, lint (Global Constraints). Squash-merge the branch to main as one commit `feat(studio): learning components as widgets, with families in the spotlight`, via the temp-index procedure; do not push.
