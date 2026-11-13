# Blocks tools and one family table Implementation Plan (plan 3 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every widget the notes creator offers is a plan tool: eleven new learning components wrap the theory panels the stage drew as its own subjects, `position-neck` gains 3 notes per string, `arpeggio-neck` gains the arpeggios page's views, the families make tools for every row, and the stage-only subjects (`caged`, `arpeggio`, `section`, `bubble`, `plugin`, `position`, `neck`) are removed.

**Architecture:** A "key panel" tool is `{ type, key, scale }` (plus its own few props), parsed in `TOOLS` like `scale-neck`, drawn by a basic in `src/features/exercises/basics/<name>/` that turns the key and scale into a `KeyChoice` (`keyChoiceFor`) and renders the existing creator plugin or chordKit view inside a local `KeyScope`. Because the tools carry `key` and `scale`, they follow a choice and the stage master with no new code (`canFollowPart`, `toolKey`). The stage's families (`stage/model/families.ts`) become the one table that makes a tool for every palette row; `search.ts` lists families and tools only.

**Tech Stack:** TypeScript, React, Next.js 16, Tailwind; node:test through the cached tsx (`~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>`).

**Spec:** `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md` ("What each note widget becomes", "One family table", the paragraph after it on plan-only tools, "Interfaces"). Earlier plans: `2026-11-12-blocks-format.md` (1), `2026-11-13-blocks-reader.md` (2).

## Global Constraints

- "Every new tool is a learning component in `src/features/exercises` with `COMPONENT_DOCS`, so it enters `TOOLS`, the prompt's tool interface and "which tool for what" (`prompt.test.ts` fails otherwise), the stage's tool widget, and `/dev/stories`."
- "The teacher's family for it keeps the controls the palette row has today, no more." A family keeps 2–5 controls.
- "Tools are stored complete": every tool is written with its own key and scale; parsers stay context-free.
- The stage-only subjects (`caged`, `arpeggio`, `section`, `bubble`, `plugin`, `position`, `neck`) are removed from `Subject`, with their renderers and `arpLegacyValues`. A saved stage holding one is dropped on load (`sanitiseStage`), no migration.
- The studio's own extras (camera, screen share, tuner, audio input, video kinds) and its Free layout are untouched. `STAGE_TOOLS` becomes every tool.
- Nothing old is read: no migration code for old subjects or old tool shapes.
- Words: props JSDoc and the which-tool lines are prompt text → load `teaching-voice` before writing them. Palette labels and details are interface copy → `design:ux-copy` with "Words about the app". Text a player reads says "position", never "box".
- Theory facts in tests (chords of a key, triads) come from `npm run -s theory -- …`, not from memory.
- Layering: `src/features/exercises/basics/*` may now import the creator's public `index.ts` (`KeyScope`, `PLUGINS`, `keyChoiceFor`) and `src/components/chordKit`; update `exercises/CLAUDE.md` and `creator/CLAUDE.md` ("Nothing imports from the creator except …") in Task 2. Stage never imports exercises' internals beyond `@/features/plan/ui/Tool`.

## Decisions (my call)

- **One prop shape for the key panels:** `{ "key": "a", "scale": "aeolian" }`, written and parsed exactly as `scale-neck`'s (`scaleKey` in `tools.ts`). A pentatonic or blues slug is accepted and drawn in its parent mode (major → ionian, minor → aeolian).
- **Tool names** (the design's): `relative-modes`, `mode-intervals`, `key-chords`, `triads`, `progressions`, `chord-circle`, `circle-of-fifths`, `piano-keys`, `improvisation`, `tunings`, `caged-neck`.
- **What each draws** (the panel it replaces): `relative-modes` → `ScaleRelatives` (today's `section: "relatives"`); `mode-intervals` → `ScalePlugin` compact; `key-chords` → `ScaleChords` (`section: "chords"`); `triads` → `TriadsPlugin`; `progressions` → `ProgressionsPlugin`; `chord-circle` → `ChordBubble` (`bubble`); `circle-of-fifths` → `CirclePlugin`; `piano-keys` → `KeysPlugin`; `improvisation` → `ImprovPlugin`; `tunings` → `TuningsPlugin`; `caged-neck` → `CagedNeckMap` / `CagedBoxPanels` (the `caged` subject). The CAGED compact page (`CagedPlugin`) becomes `caged-neck` with no shapes (the neck map); the "Every interval of the mode" panel is `mode-intervals`.
- **A panel that changes the key from inside** (a mode picked in Same notes, a key on the circle) changes it for that tool on screen only (local state in the basic), as a shared note's widget does today; it never writes the tool.
- **`chord-circle`** takes `degree`, 1–7 in the JSON and in the parsed tool (the chord on that note of the scale). Default 1.
- **`caged-neck`** takes `shapes`: CAGED letters, in CAGED order, deduplicated; absent or empty = the five shapes on the whole neck. The quality (major / minor) comes from the scale, as `cagedQualityOf` does today.
- **`tunings`** takes `key` and `scale` like the rest (`TuningsPlugin` marks the key's notes when it has one).
- **`position-neck` 3 notes per string:** a new prop `kind: "3nps"` (absent: the scale's own positions, as today). With `kind`, `positions` count 1–7 and `cross` is refused (dropped with a note). Drawn as `PositionWidget` draws `3nps` today.
- **`arpeggio-neck` views:** new props `show` (`["neck"]`, `["positions"]` or both; absent = today's box view) and `roots` (root strings, 2–6, guitar numbering). With `show`, the tool is drawn by `ArpeggioOnGuitar` from a key context made from the chord itself: tonic = the chord root, ionian for a major-3rd chord and aeolian for a minor-3rd chord, degree 0, `type` = the chord's `ARP_QUALITIES` id (`arpTypeOf(chord)`). A chord with no `ARP_QUALITIES` match ignores `show` (box view) with a note.
- **The Arpeggio family** keeps its controls (Key, Scale, On, Type, Show, Root strings) and makes an `arpeggio-neck` whose `chord` is the scale chord it names (`arpChordSymbol`).
- **Plan-only tools as families**, controls (my call, from each tool's own props, 2–4 each): `backing-band` (Parts, Tempo); `note-finder`, `interval-ears`, `string-singer`, `interval-singer`, `breathwork` (Level); `finger-pattern`, `picking-drill`, `legato-trill` (Level, Tempo); `strum-along`, `guitar-play-along` (Tempo; the rest at the parser's defaults with a I–V–vi–IV progression in the key, written out as chord names). Palette section "Practice" (new `PALETTE_GROUPS` entry, before "Text").
- **`band` subject** (the studio's metronome) stays in the studio; the notes creator will offer `backing-band` (plan 4 filters rows per host). `text`, `headphones`, `logo`, `url` subjects stay (studio, and plan 4's concern for notes).

## Review Focus

1. A key panel in a minor pentatonic key: drawn as aeolian, never an empty panel (Task 1 test "a pentatonic draws in its parent mode").
2. A note's master key moved to F♯ with a `chord-circle` under it: the circle moves to F♯, degree unchanged (Task 1 test "the master moves a key panel").
3. A saved studio stage holding a removed subject: the stage loads without it, no crash (Task 6 test "a removed subject is dropped").
4. `arpeggio-neck` with `show` on a chord the arpeggios page has no quality for ("C13"): box view, with a parse note, not a blank (Task 4).
5. `position-neck` with `kind: "3nps"` and `positions: [7]`: position 7 drawn; `[8]` dropped to the default with a note (Task 3).

---

### Task 1: The key panel tools, parsed

**Files:**
- Modify: `src/features/plan/model/tools.ts` (the `PlanToolProps` union, `TOOLS`, `canTranspose` if it lists types)
- Modify: `src/features/creator/model/key.ts` (+ export in `src/features/creator/index.ts`)
- Test: `src/features/plan/model/plan.test.ts` (new `describe("key panel tools")`), `src/features/creator/model/key.test.ts` (create if absent)

**Interfaces:**
- Produces:
  ```ts
  // tools.ts
  export const KEY_PANELS = ["relative-modes", "mode-intervals", "key-chords", "triads", "progressions", "circle-of-fifths", "piano-keys", "improvisation", "tunings"] as const;
  export type KeyPanelName = (typeof KEY_PANELS)[number];
  // in PlanToolProps:
  | { type: KeyPanelName; key: number; scale: string }
  | { type: "chord-circle"; key: number; scale: string; degree: number /* 1..7 */ }
  | { type: "caged-neck"; key: number; scale: string; shapes?: CagedLetter[] }
  // creator/model/key.ts
  export function keyChoiceFor(pc: number, scale: string): KeyChoice; // mode page → its family/mode; pentatonic/blues → ionian or aeolian of the same tonic
  ```
- [ ] **Step 1: Write the failing tests:**
  - "every key panel parses like scale-neck": for each `KEY_PANELS` name, `parseTool({ type, key: "a", scale: "dorian" })` deep-equals `{ type, key: 9, scale: "dorian" }`; a missing scale → null with the same reason `scale-neck` gives.
  - "chord-circle degree": `degree: 5` kept; `degree: 9` → 1 with a note; absent → 1.
  - "caged-neck shapes": `["E","C","E"]` → `["C","E"]` (CAGED order, deduplicated); `["X"]` → absent, with a note.
  - "the master moves a key panel": `withToolKey({ type: "chord-circle", key: 9, scale: "aeolian", degree: 2 }, 6)` → `key: 6, degree: 2`.
  - "a choice's scale moves a key panel": `canFollowPart(triads tool, "scale") === true`.
  - `keyChoiceFor(9, "aeolian")` equals the `KeyChoice` whose `keyContext` names A aeolian; `keyChoiceFor(9, "minor-pentatonic")` equals `keyChoiceFor(9, "aeolian")`; `keyChoiceFor(0, "major-pentatonic")` equals `keyChoiceFor(0, "major-ionian")`.
- [ ] **Step 2: Run** `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/plan/model/plan.test.ts src/features/creator/model/key.test.ts` — FAIL.
- [ ] **Step 3: Implement** the parsers (reuse `scaleKey`, `intOr`) and `keyChoiceFor` (from `MODE_PAGES` / `findPentatonic`).
- [ ] **Step 4: Run** the same — PASS. Run the whole plan model suite; `transpose.test.ts` and `choice.test.ts` stay green.
- [ ] **Step 5: Commit** `feat(plan): key panel tools, chord-circle and caged-neck parsed`.

### Task 2: The key panel components

**Files:**
- Create: `src/features/exercises/basics/key-panel/KeyPanel.tsx` (the shared frame: `KeyScope` seeded from `keyChoiceFor`, local key state), and one folder per tool with `index.tsx` and `<name>.props.ts`: `relative-modes`, `mode-intervals`, `key-chords`, `triads`, `progressions`, `chord-circle`, `circle-of-fifths`, `piano-keys`, `improvisation`, `tunings`, `caged-neck`
- Move: `src/features/stage/render/SectionWidget.tsx`'s use of `ScaleRelatives` / `ScaleChords` into `relative-modes` and `key-chords` (the stage file is deleted in Task 6)
- Modify: `src/features/plan/ui/ExerciseTool.tsx` (a view per tool), `src/features/exercises/docs/docs.generated.json` (by `npm run docs:exercises`), `src/features/devtools/stories/stories.ts` (one story each), `src/features/exercises/CLAUDE.md`, `src/features/exercises/README.md`, `src/features/creator/CLAUDE.md`
- Test: `src/features/devtools/stories/stories.test.ts`, `src/features/exercises/docs/extract.test.ts` (existing)

**Interfaces:**
- Consumes: Task 1's types and `keyChoiceFor`.
- Produces: `export default function KeyPanel({ pc, scale, children }: { pc: number; scale: string; children: ReactNode })`; each basic `export default function View(tool: ToolOf<"<name>">)`.
- [ ] **Step 1: Load `teaching-voice`**, then write each `<name>.props.ts`: a `@component <name> basic` JSDoc saying what the student sees and when to use it over its neighbours (e.g. `key-chords` vs `triads`), and the documented props from Task 1.
- [ ] **Step 2: Write the views** (each a few lines: `KeyPanel` around the plugin or chordKit component; `chord-circle` passes `degree - 1` to `ChordBubble`; `caged-neck` picks `CagedNeckMap` / `CagedBoxPanels` as `StageWidget`'s `caged` case does). Frame as the stage did: `rounded-xl border border-slate-800 bg-slate-950 p-3`.
- [ ] **Step 3: Run** `npm run docs:exercises`, then the stories test and the docs freshness test — PASS (a missing story fails the first).
- [ ] **Step 4: Run** `npx tsc --noEmit 2>&1 | grep -v '^.next/'` (empty) and eslint on the new folders.
- [ ] **Step 5: Look** at `/dev/stories` for each new tool at 1280 and 390 px (no sideways scroll, no console errors).
- [ ] **Step 6: Commit** `feat(exercises): key panels, chord-circle and caged-neck as tools`.

### Task 3: position-neck in 3 notes per string

**Files:**
- Modify: `src/features/plan/model/tools.ts` (`positionNeck`), `src/features/exercises/basics/position-neck/position-neck.props.ts`, `…/position-neck/index.tsx`
- Test: `src/features/plan/model/plan.test.ts`
- [ ] **Step 1: Failing tests** "position-neck kind 3nps": `{ kind: "3nps", positions: [7] }` keeps both; `positions: [8]` → default `[1]` with a note; `kind: "3nps"` with `cross` → `cross` dropped with a note; `kind: "other"` → no `kind`, with a note.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** the parse (count from `POSITION_COUNT["3nps"]`) and the draw (the `3nps` branch of today's `PositionWidget`: `positionsFor(…, "3nps")`, `ScaleNeck`). Props JSDoc with `teaching-voice` loaded.
- [ ] **Step 4: Run** tests, `npm run docs:exercises`, tsc, eslint — PASS; look at the story.
- [ ] **Step 5: Commit** `feat(exercises): position-neck in 3 notes per string`.

### Task 4: arpeggio-neck with the arpeggios page's views

**Files:**
- Modify: `src/features/plan/model/tools.ts` (`arpeggio-neck` parse), `src/lib/chordKit/arpeggios.ts` (`arpTypeOf`), `src/features/exercises/basics/arpeggio-neck/*`
- Test: `src/features/plan/model/plan.test.ts`, `src/lib/chordKit/arpeggios.test.ts` (create if absent)

**Interfaces:**
- Produces: `export function arpTypeOf(chord: string): string | null` (an `ARP_QUALITIES` id: "Am" → "min", "G7" → "7", "Cmaj7" → "maj7", "Bm7b5" → "m7b5", "C13" → null). Tool props gain `show?: NeckPart[]`, `roots?: number[]`.
- [ ] **Step 1: Failing tests:** the `arpTypeOf` cases above; parse keeps `show: ["neck","positions"]` and `roots: [6,5]`, drops `roots: [1]` with a note, and drops `show` with a note when `arpTypeOf(chord)` is null.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**; the view draws `ArpeggioOnGuitar` with `keyContext(keyChoiceFor(root, minor3rd ? "aeolian" : "major-ionian"))`, `degree: 0`, `type: arpTypeOf(chord)`, `neck: show.includes("neck")`, `positions: show.includes("positions")`, `roots` when `show` is set, today's box view otherwise.
- [ ] **Step 4: Run** tests, docs, tsc, eslint — PASS; look at a story with `show`.
- [ ] **Step 5: Commit** `feat(exercises): arpeggio-neck draws the neck and positions views`.

### Task 5: One family table makes tools

**Files:**
- Modify: `src/features/stage/model/families.ts`, `src/features/stage/model/search.ts`, `src/features/stage/model/subject.ts` (`PALETTE_GROUPS`: add `practice: "Practice"` before `text`), `src/features/stage/model/toolKey.ts` (`STAGE_TOOLS` = every `ToolName`)
- Test: `src/features/stage/model/families.test.ts`, `search.test.ts`

**Interfaces:**
- Produces: `export function arpChordSymbol(key: KeyChoice, degree: number, type: string): string` in `families.ts`; families `caged` and `arpeggio` make `{ kind: "tool", tool }`; new families `relative-modes`, `mode-intervals`, `key-chords`, `triads`, `progressions`, `chord-circle` (control: On, the seven degrees), `circle-of-fifths`, `piano-keys`, `improvisation`, `tunings`, and the plan-only ones listed in Decisions.
- [ ] **Step 1: Failing tests:** `arpChordSymbol(C major, 1, "triad") === "Dm"`, `(C major, 1, "seventh") === "Dm7"`, `(G mixolydian, 0, "seventh") === "G7"` (check each with `npm run -s theory -- scale C major` / `scale G mixolydian` before writing); `family("caged").make({ shapes: ["E"] }, C_MAJOR)` is a `caged-neck` tool with `shapes: ["E"]`; `family("arpeggio").make({...}, C_MAJOR)` is an `arpeggio-neck`; `family("chord-circle").make({ degree: 5 }, C_MAJOR).tool.degree === 5`; every `search.ts` catalog result is a `family` or adds a `tool` subject (none of the removed kinds); the 3 notes per string variants add `position-neck` with `kind: "3nps"`; `describeSubject` reads each new tool ("Triads · C major"). Replace the existing tests that build removed subjects.
- [ ] **Step 2: Run** `tsx --test src/features/stage/model/*.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Palette labels and details with `design:ux-copy` + "Words about the app"; keep today's row texts where the row exists.
- [ ] **Step 4: Run** — PASS; tsc; eslint.
- [ ] **Step 5: Commit** `feat(stage): every palette row makes a tool`.

### Task 6: Remove the stage-only subjects

**Files:**
- Modify: `src/features/stage/model/subject.ts` (`Subject`, `sanitiseSubject`, `subjectTitle`, `defaultRect`), `src/features/stage/render/StageWidget.tsx`, `src/features/stage/model/layers.ts` (if it names them), `src/features/stage/model/families.ts` (`arpLegacyValues` and the old-subject `read`s), `spec/studio.md`, `src/features/stage/CLAUDE.md`
- Delete: `src/features/stage/render/SectionWidget.tsx`, `src/features/stage/render/PositionWidget.tsx`
- Test: `src/features/stage/model/subject.test.ts`, `layers.test.ts`
- [ ] **Step 1: Failing test** "a removed subject is dropped": `sanitiseStage` of a stage with layers `{ kind: "caged" … }`, `{ kind: "plugin", plugin: "circle" … }` and a `tool` keeps only the tool layer.
- [ ] **Step 2: Run** — FAIL. **Step 3: Remove** the kinds and every branch that reads them (`grep -rn '"caged"\|"bubble"\|"plugin"\|"section"\|kind: "position"\|kind: "neck"\|kind: "arpeggio"' src` is empty outside tests of the drop).
- [ ] **Step 4: Run** stage and plan model tests, tsc, eslint — PASS. Look at the studio (`/teachers/studio`) and the notes creator (`/teachers/studio?notes=1`): add one widget from each palette section; the preset notes (`/note/<slug>` for every `PRESET_INFO` slug) still open (fix any preset that used a removed subject by writing the tool instead).
- [ ] **Step 5: Update** `spec/studio.md`, the stage `CLAUDE.md` ("Renderer" paragraph: families make tools; no stage-only subjects) and the design's status line.
- [ ] **Step 6: Commit** `refactor(stage): drop the stage-only subjects`.

### Task 7: The prompt names the new tools

**Files:**
- Modify: `src/features/plan/model/prompt.ts` (the `which-tool` part)
- Test: `src/features/plan/model/prompt.test.ts` (existing "the which-tool guide names every tool")
- [ ] **Step 1: Run** the prompt test — FAIL (the new tools are unnamed).
- [ ] **Step 2: Load `teaching-voice`**, then add one line to which-tool: "Seeing the theory of a key, with nothing to play along: key-chords for the chord on every note of the scale, triads for one chord's inversions, chord-circle for one chord with its sus and extended neighbours, relative-modes for the modes that share the notes, mode-intervals for every interval of a mode, progressions for common progressions in the key, circle-of-fifths for a key's neighbours, piano-keys for the scale on a piano, improvisation for what to play over the key, tunings for open and alternate tunings, caged-neck for the five CAGED shapes." Add "position-neck with kind 3nps" and "arpeggio-neck with show" to the guitar line.
- [ ] **Step 3: Run** the plan model suite — PASS (`prompt.test.ts` included).
- [ ] **Step 4: Commit** `feat(plan): the prompt names the theory tools`.
