# Visibility states and neck placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two live exercise bugs: wrong box next to open chords (case 1) and the wrongly lit note (case 5), by
giving neck views four note states, note-name highlights and a placement object, plus the prompt rules that use them.

**Architecture:** Two pure resolvers in layer 2 (`cues/visibility.ts`, `cues/placement.ts`) decide each note's state and
which box to show; the plan's `tools.ts` parses AI input into stored semitones / placements; views only render. `by:
"chords"` is resolved per exercise in `config.ts` at paste time, so stored plans never hold it.

**Tech Stack:** Next.js / React / TypeScript, `node:test` via cached tsx.

**Spec:** `docs/superpowers/specs/2026-10-31-exercise-clarity-design.md` (§1, §2, §7 and the "Calls I made" list).
This plan covers spec order steps 1–2 and their prompt pairs. Later plans: rhythm shape (§5), shells + labels (§3),
teaching components + lesson/buildsOn (§4), consistency check (§6).

**Not in this plan (deferred, say so in the README):** `placement` on the shapes' per-chord `place`; `mute`/`hide`
and note names on `play-along` (it keeps chord-relative degree `highlight`; only `others` is renamed).

## Global Constraints

- Layers 0 and 2 stay pure: no React, no sound, no `localStorage` (`src/features/exercises/CLAUDE.md`).
- The AI never writes frets or note lists; it writes degrees, note names, or a placement.
- Note names use the `add` spelling (`"c-sharp"`, `"b-flat"`), parsed with `parseKeySlug`. Degrees keep today's meaning:
  key-relative on `scale-neck`/`staff`, chord-relative on `arpeggio-neck` and `play-along`.
- A string in a highlight list is read as a degree first (`degreeSemis`), else as a note name. Numbers from pasted input
  are still dropped (existing `parseTool` rule).
- `others` values: `"normal" | "muted" | "hidden"`. Stored or pasted `"dimmed"` reads as `"muted"`.
- Default `others`: `"muted"` when an explicit `highlight` is given, else `"normal"`. Notes in `add` are highlighted but
  never trigger the muted default.
- Strings in placement use guitar numbering (6 = low E); `ScaleCell.string` and `ArpPosition.rootString` use 0 = low E.
- After editing a `*.props.ts`: `npm run docs:exercises` (the freshness test fails otherwise; never hand-edit
  `docs.generated.json`).
- Tests: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (find it with `ls ~/.npm/_npx/*/node_modules/.bin/tsx`; `npx tsx` hangs).
  Every task ends with: its tests, `npx tsc --noEmit 2>&1 | grep -v '^.next/'` (no output), `npx eslint src/features/exercises src/features/plan`.
- Commit on main, only your own paths, through a temp index (other sessions share the real index):
  `GIT_INDEX_FILE=$SCRATCH/idx git read-tree HEAD && GIT_INDEX_FILE=$SCRATCH/idx git add <files> && T=$(GIT_INDEX_FILE=$SCRATCH/idx git write-tree) && C=$(git commit-tree $T -p HEAD -m "<msg>") && git update-ref refs/heads/main $C HEAD && git reset -q -- <files>`.
  Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.
- Overlap: `docs/superpowers/specs/2026-10-31-course-basics-stubs-design.md` adds stub tools to `TOOLS` and
  `plan/ui/ExerciseTool.tsx`. Before editing those files run `git status` / `git log -3 -- <file>`; edit on top of
  whatever is there, never revert others' lines.

## Review Focus

1. A stored plan from before this change (`others: "dimmed"`, numeric `highlight`) renders exactly as before: test in Task 2.
2. A highlight that names a note not on the neck at all (`"d-sharp"` on A minor pentatonic without `add`) shows nothing lit and does not crash or mute everything: test in Task 1 (state is computed per drawn note; no drawn note matches → nothing highlighted, and the muted default still applies because a highlight was given; the caption still names it so the reader sees the mismatch).
3. `placement` and `boxes` both given: `boxes` wins, `placement` dropped: test in Task 4.
4. A placement that resolves to nothing (`by: "root", string: 4` on a scale with no root on the D string inside any box) falls back to today's behaviour (all boxes on scale-neck, box 1 on arpeggio-neck), not a blank view: `null` pinned in Task 4, fallback wired and browser-checked in Task 5.
5. `by: "chords"` in an exercise with no chord tool: placement dropped, view as today: test in Task 4.

---

### Task 1: Visibility resolver

**Files:**
- Create: `src/features/exercises/cues/visibility.ts`
- Test: `src/features/exercises/cues/visibility.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type NoteState = "hidden" | "muted" | "normal" | "highlighted";
  export type Others = "normal" | "muted" | "hidden";
  /** all lists are pitch classes 0-11 */
  export interface Visibility { highlight?: number[]; mute?: number[]; hide?: number[]; add?: number[]; others?: Others }
  export function noteState(v: Visibility, pc: number): NoteState;
  /** "dimmed" (old) -> "muted"; unknown -> undefined */
  export function othersOf(v: unknown): Others | undefined;
  ```
  Precedence: `hide` → hidden; `mute` → muted; `highlight` or `add` → highlighted; else `others ?? (highlight?.length ? "muted" : "normal")`.

- [ ] **Step 1: Write the failing tests** (`describe("visibility")`):
  - `noteState({}, 4)` → `"normal"`.
  - `noteState({ highlight: [1] }, 1)` → `"highlighted"`; `noteState({ highlight: [1] }, 0)` → `"muted"`.
  - `noteState({ highlight: [1], others: "hidden" }, 0)` → `"hidden"`.
  - `noteState({ add: [1] }, 1)` → `"highlighted"`; `noteState({ add: [1] }, 0)` → `"normal"` (add never mutes the rest).
  - `noteState({ highlight: [1], hide: [1] }, 1)` → `"hidden"`; `noteState({ highlight: [1], mute: [1] }, 1)` → `"muted"`.
  - Review Focus 2: `noteState({ highlight: [3] }, 9)` → `"muted"` (nothing drawn matches; no crash).
  - `othersOf("dimmed")` → `"muted"`; `othersOf("hidden")` → `"hidden"`; `othersOf("x")` → `undefined`.
- [ ] **Step 2: Run, expect FAIL** (module not found).
- [ ] **Step 3: Implement** in `visibility.ts` (pure, no imports needed).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(exercises): four note states resolver`.

### Task 2: Parse note-name highlights, mute, hide, others

**Files:**
- Modify: `src/features/plan/model/tools.ts` (`PlanTool` union, `degrees`, `othersOf`, `scaleNeck`, `staff`, `arpeggio-neck`, `play-along` parses)
- Modify: `src/features/exercises/basics/scale-neck/scale-neck.props.ts`, `staff/staff.props.ts`, `arpeggio-neck/arpeggio-neck.props.ts`, `src/features/exercises/play-along/play-along.props.ts`
- Regenerate: `src/features/exercises/docs/docs.generated.json`
- Test: `src/features/plan/model/plan.test.ts`

**Interfaces:**
- Consumes: `Others`, `othersOf` from Task 1 (replace the local `type Others` and `othersOf` in `tools.ts`).
- Produces (stored `PlanTool`, semitones above the key root, or above the chord root for `arpeggio-neck`):
  - `scale-neck`: `highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others` (plus existing fields)
  - `staff`: same four fields
  - `arpeggio-neck`: same four fields
  - `play-along`: `others?: Others` (highlight unchanged)
  - helper in `tools.ts`: `const marks = (v: unknown, root: number | null): number[]`: each string is `degreeSemis(d)`, else `(parseKeySlug(d) - root + 12) % 12` when `root` is known; numbers 0-11 kept (stored plans). Sorted, unique. Replaces `degrees` for `highlight`/`mute`/`hide`.
- Props docs: `highlight`, `mute`, `hide` typed `(Degree | string)[]` with the JSDoc "degrees (major-relative, from the key root) or note names as in `add`: [\"3\"] or [\"c-sharp\"]"; `others` "`normal`, `muted` or `hidden`: the notes not listed; default `muted` when something is highlighted, else `normal`". `add`'s JSDoc gains "added notes are highlighted".

- [ ] **Step 1: Write the failing tests** (in `describe("tools")`):
  - `parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", add: ["c-sharp"], highlight: ["c-sharp"] })` has `highlight: [4]`, `add: [1]`.
  - `parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", highlight: ["b3"] })` has `highlight: [3]` (degree read first).
  - `parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", mute: ["5"], hide: ["b7"], others: "hidden" })` has `mute: [7]`, `hide: [10]`, `others: "hidden"`.
  - `parseTool({ type: "arpeggio-neck", chord: "A7", highlight: ["c-sharp", "g"] })` has `highlight: [4, 10]` (relative to A).
  - `parseTool({ type: "staff", scale: "major-ionian", key: "c", others: "dimmed" })` has `others: "muted"`.
  - Review Focus 1: `parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", highlight: [3], others: "dimmed" }, { stored: true })` has `highlight: [3]`, `others: "muted"`.
  - `parseTool({ type: "play-along", bpm: 70, shape: { shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2 }, others: "dimmed" })` has `others: "muted"`.
- [ ] **Step 2: Run `src/features/plan/model/plan.test.ts`, expect FAIL.**
- [ ] **Step 3: Implement** `marks` and the parses; update the four props files; run `npm run docs:exercises`.
- [ ] **Step 4: Run plan tests and `src/features/exercises/docs/extract.test.ts`, expect PASS.** `tsc` will flag the views' `others` type: fix by widening each view's `others` prop to `Others` (rendering changes come in Task 3; `"muted"` behaves as `"dimmed"` did).
- [ ] **Step 5: Commit** `feat(plan): note-name highlights, mute, hide, muted`.

### Task 3: Views render the four states

**Files:**
- Modify: `src/components/chordKit/ScaleNeck.tsx` (`Dot`, `PositionBox`)
- Modify: `src/features/exercises/basics/scale-neck/index.tsx`, `arpeggio-neck/index.tsx`, `staff/index.tsx`
- Modify: `src/features/exercises/play-along/PlayAlong.tsx`, `views/SoloView.tsx` (rename `"dimmed"` → `"muted"` in types and checks)
- Modify: `src/features/plan/ui/ExerciseTool.tsx` (pass `mute`, `hide`)

**Interfaces:**
- Consumes: `noteState`, `NoteState`, `Others` (Task 1); stored fields (Task 2).
- Produces: `PositionBox` optional prop `states?: (pc: number) => NoteState`. When given it replaces `highlight`: `hidden` cells are not drawn, `muted` uses today's dim opacity (0.18), `highlighted` draws `Dot` with a new `accent` prop (a 3px `var(--color-amber-300)` outer ring at `r + 3`), `normal` as today. Without `states`, behaviour is unchanged (other callers of `PositionBox` must not change).

- [ ] **Step 1: Wire scale-neck**: build `Visibility` with pitch classes (`(pc + semi) % 12` for highlight/mute/hide, `add` as is), pass `states={(p) => noteState(v, p)}`; drop the local `hide` filtering in favour of `states`. Caption: `" · C♯ lit"` naming highlighted and added notes by `SHARP[pc]`, not `SEMI_TEXT`.
- [ ] **Step 2: Wire arpeggio-neck** the same way (pitch classes from the chord root); caption names lit notes.
- [ ] **Step 3: Staff**: lit set = pcs whose state is `highlighted`; notes whose state is `hidden` leave the staff; `SingingStaff` unchanged.
- [ ] **Step 4: Play-along**: `others` default `"muted"`, `"hidden"` checks unchanged.
- [ ] **Step 5: Run all exercise and plan tests, tsc, eslint, expect PASS.**
- [ ] **Step 6: Check in the browser** (`npm run dev -- --webpack`; back up and restore the plan's localStorage keys first, see memory): paste a plan with the case-5 scale-neck (`scale: "minor-pentatonic", key: "a", add: ["c-sharp"]`): C♯ ringed, scale normal, caption "A minor pentatonic + C♯ · C♯ lit". Then the same with `highlight: ["b3"]`: C ringed and caption says "C lit", so the mistake is visible.
- [ ] **Step 7: Commit** `feat(exercises): neck views show hidden, muted, normal, highlighted`.

### Task 4: Placement resolver and parse

**Files:**
- Create: `src/features/exercises/cues/placement.ts`
- Test: `src/features/exercises/cues/placement.test.ts`
- Modify: `src/features/plan/model/tools.ts` (`scale-neck`, `arpeggio-neck` parse + `PlanTool`), `src/features/plan/model/config.ts`
- Modify: `scale-neck.props.ts`, `arpeggio-neck.props.ts`; regenerate docs
- Test: `src/features/plan/model/plan.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Placement =
    | { by: "box"; box: number } | { by: "open" } | { by: "fret"; fret: number }
    | { by: "root"; string: 6 | 5 | 4 } | { by: "chords" };
  export type StoredPlacement = Exclude<Placement, { by: "chords" }>;
  /** strings 0 = low E */
  export interface BoxInfo { number: number; from: number; to: number; roots: { string: number; fret: number }[] }
  export function pickBox(boxes: BoxInfo[], p: StoredPlacement): number | null;
  export function parsePlacement(v: unknown): Placement | null; // box 1-5, fret 0-15, string 6|5|4, else null
  ```
  `pickBox` rules (ties → lower `from`): `box`: that number if present; `open`: smallest `from`; `fret`: smallest
  `|(from + to) / 2 - fret|`; `root`: among boxes with a root on string `6 - s` (6 → 0, 5 → 1, 4 → 2), smallest
  `rootFret - from` using that box's lowest root fret on the string; none → `null`.
- In `tools.ts`: stored `placement?: Placement` on `scale-neck` and `arpeggio-neck` (`by: "chords"` is kept by `parseTool`
  and resolved in `config.ts`); `placement` with non-empty `boxes` is dropped.
- In `config.ts`, after `parseSections`: `resolveChordPlacement(sections: Section[]): Section[]` (exported from
  `tools.ts`): finds the exercise's first `chord-shapes` tool, else the first `play-along` whose shape has `chords`
  (strings or `{ chord }` objects); voicing `"barre"` → `{ by: "fret", fret: (rootPc - 4 + 12) % 12 }` of the first
  chord (its root on the low E string), otherwise `{ by: "open" }`. No chord tool → placement removed.

- [ ] **Step 1: Write the failing resolver tests** (`describe("placement")`) on synthetic boxes
  `B = [{number:1,from:5,to:8,roots:[{string:0,fret:5},{string:3,fret:7}]}, {number:2,from:7,to:10,roots:[{string:3,fret:7}]}, {number:5,from:0,to:3,roots:[{string:1,fret:0}]}]`:
  - `pickBox(B, { by: "open" })` → 5; `pickBox(B, { by: "fret", fret: 6 })` → 1; `pickBox(B, { by: "fret", fret: 9 })` → 2.
  - `pickBox(B, { by: "root", string: 6 })` → 1; `pickBox(B, { by: "root", string: 5 })` → 5.
  - `pickBox(B, { by: "box", box: 2 })` → 2; `pickBox(B, { by: "box", box: 4 })` → `null`.
  - Review Focus 4: `pickBox(B, { by: "root", string: 4 })` → `null` (no box in `B` has a root on string 2, the D string).
  - Real data: build `BoxInfo[]` from `pentatonicPositions` for A minor pentatonic (same call the scale-neck view makes) and expect `pickBox(…, { by: "root", string: 6 })` → 1 (position 1 has the root on the low E string) and the `open` box's `from` ≤ 3.
  - `parsePlacement({ by: "fret", fret: 22 })` → `null`; `parsePlacement({ by: "root", string: 3 })` → `null`; `parsePlacement({ by: "chords" })` → `{ by: "chords" }`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `placement.ts`.**
- [ ] **Step 4: Write the failing plan tests**:
  - Review Focus 3: scale-neck with `boxes: [2], placement: { by: "open" }` → `boxes: [2]`, no `placement`.
  - An exercise (through `parsePlanConfig`) with `chord-shapes` `["A7","D7","E7"]` and a scale-neck `placement: { by: "chords" }` → stored `placement: { by: "open" }`.
  - Same with `voicing: "barre"` and chords `["A7"]` → `{ by: "fret", fret: 5 }`.
  - Review Focus 5: an exercise with only a scale-neck `placement: { by: "chords" }` → no `placement`.
- [ ] **Step 5: Implement the parse, `resolveChordPlacement`, the props JSDoc** (`placement`: "where on the neck, instead of `boxes`: `{ \"by\": \"open\" }` next to open chords, `{ \"by\": \"root\", \"string\": 6 }` the box with the root on the low E, `{ \"by\": \"fret\", \"fret\": 7 }`, `{ \"by\": \"chords\" }` near the chords shown in this exercise, `{ \"by\": \"box\", \"box\": 2 }`; use `boxes` only when the exercise is about the boxes"); `npm run docs:exercises`.
- [ ] **Step 6: Run tests, expect PASS. Commit** `feat(exercises): placement picks the box near the chords`.

### Task 5: Views use placement

**Files:**
- Modify: `src/features/exercises/basics/scale-neck/index.tsx`, `arpeggio-neck/index.tsx`, `src/features/plan/ui/ExerciseTool.tsx`

**Interfaces:**
- Consumes: `pickBox`, `StoredPlacement`, `BoxInfo` (Task 4); stored `placement` (Task 4).

- [ ] **Step 1: Scale-neck**: map positions to `BoxInfo` (roots = `notes` with `semi === 0`); `shown` = `boxes` if given, else `[pickBox(...)]` if non-null, else all boxes (today). Caption shows "box N" as today.
- [ ] **Step 2: Arpeggio-neck**: `BoxInfo` from `boxesOf(chord)` (number = index + 1, roots = `[{ string: rootString, fret: rootFret }]`); resolved box replaces the `[1]` default; `null` → box 1.
- [ ] **Step 3: Run tests, tsc, eslint. Browser check**: paste the case-1 exercise (`chord-shapes` A7, D7, E7 + scale-neck A minor pentatonic `add: ["c-sharp"]`, `placement: { by: "chords" }`): the box shown covers frets 0–3.
- [ ] **Step 4: Commit** `feat(exercises): neck views place their box`.

### Task 6: Prompt rules and common mistakes

**Files:**
- Modify: `src/features/plan/model/prompt.ts`, `src/features/plan/README.md`, `src/features/exercises/README.md`
- Test: `src/features/plan/model/plan.test.ts`

- [ ] **Step 1: Write the failing test**: `buildPrompt(null, [])` contains `"## Common mistakes"`, `"\"placement\""`, `"\"c-sharp\""`, and `"view\": \"tab\""`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Edit the prompt.** Change the "Show only what the exercise is about" rule to name note names (`highlight: ["c-sharp"]`) and `mute`/`hide`. Change the "Notes outside the scale" paragraph: notes in `add` are lit automatically, so don't also highlight them by degree. Add, after "Rules for good exercises", a `## Common mistakes` section of wrong → right pairs, exactly these four:
  1. ✗ open A7, D7 chord shapes with an A minor pentatonic scale-neck `boxes: [1]` (fret 5) → ✓ `placement: { "by": "chords" }` (or `{ "by": "open" }`).
  2. ✗ text about C♯ with `highlight: ["b3"]` (that is C) → ✓ `add: ["c-sharp"]` (lit automatically) or `highlight: ["c-sharp"]`.
  3. ✗ "Dm7 has F and C, G7 has B and F…" as prose only → ✓ one sentence of why, then a play-along with a chord-steps shape (steps `["1","3","b7"]`), `"view": "tab"`, and `guide` naming each note.
  4. ✗ an exercise that starts with steps → ✓ its first text says why in one sentence ("Guide tones move by a half step, so they make the changes audible").
- [ ] **Step 4: README updates**: four note states, note-name highlights, `placement`, and the deferred items listed under "Not in this plan".
- [ ] **Step 5: Run plan tests, expect PASS. Commit** `feat(plan): prompt rules for placement and note-name highlights`.
