# Learning Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace autoplan's closed tool list with shared learning components (basics plus one `play-along` built on a music timeline), documented once in TypeScript/JSDoc and used by the prompt, the debug view and, later, the course.

**Architecture:** New `src/features/exercises/` holds a pure timeline model with shape generators and cue resolution (layer 0), React views and basic components (layers 1-2), and a docs extractor that turns `*.props.ts` interfaces + JSDoc into the data the prompt and debug view read. `src/features/plan` keeps only the AI-facing layer (3): per-component parse/validate, migration of old plans, prompt, debug.

**Tech Stack:** Next.js (breaking-change version), React 19, TypeScript compiler API (`typescript` is already a dependency) for the extractor, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-30-learning-components-design.md`

## Global Constraints

- Before writing React code: read the relevant guide in `node_modules/next/dist/docs/` (AGENTS.md); heed deprecations. No new routes are added.
- `src/features/plan/CLAUDE.md` rules apply: pure logic with tests, no React in model files, no `localStorage` outside the store, README kept current. Task 9 updates the rules this design changes.
- Tests: tsx is not installed and `npx tsx` hangs. Use the cached binary: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)`, then `$TSX --test <files>`. Typecheck: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing. Lint: `npx eslint <dirs>`.
- `next build` can't fetch Google Fonts here; verify UI with the dev server, tsc and tests.
- Commits go straight to `main`, never via `git add` in the checkout (other sessions share the index and commit it). Write a script in the scratchpad (no heredocs in the shell) that runs, with zsh arrays for the file list:
  `export GIT_INDEX_FILE=<scratchpad>/idx; git read-tree HEAD; git add -- "${FILES[@]}"; tree=$(git write-tree); unset GIT_INDEX_FILE; c=$(git commit-tree "$tree" -p HEAD -F <msgfile>); git update-ref refs/heads/main "$c" HEAD; git reset -q -- "${FILES[@]}"`.
  Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.
- Nothing embedded may write the address bar (`syncUrl={false}` on games).
- Component names (final): basics `scale-neck`, `chord-shapes`, `staff`, `click-drone`, `backing-band`, `note-finder`, `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer`; guided `play-along`. Shapes of `play-along`: `progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`, `solo-over`.
- The AI never writes events, frets, strings, note names derived from degrees, or seconds.
- Defaults: `others` `"dimmed"` (other value `"hidden"`); `voicing` `"open"` (other `"barre"`); `view` `"tab"` (others `"notes"`, `"neck"`); `degreesFrom` `"chord"` (other `"key"`). Meter is 4/4.
- Degrees are the AI's strings (`"1" "b3" "♭7" "#4"`) mapped by the existing `DEGREE_SEMIS` table to semitones above the reference root (major-relative, not scale-aware; say so in JSDoc).
- Old stored plans (tool types `scale`, `chords`, `sing`, `band`, `comp`, `notes`, `ears`; legacy `how/steps/tools/link` exercises) keep rendering.

## Review Focus

- A stored `sing` tool with `notes`, `highlight`, `voice` renders the same staff after migration (Task 8 test).
- A chord name `parseChordQuery` rejects inside a shape is dropped; a shape left with no chords returns null, no crash (Task 3 test).
- A degree outside the table (`"8"`, `"9th"`, `""`) is dropped, never a NaN pitch (Tasks 2, 3 tests).
- `two-scales` with `switchBar` 0 or beyond `bars`, and any shape with `bars: 0`, `bpm: 0`, `repeats: 1e6`: clamped to a finite, non-empty timeline (Tasks 2, 3 tests).
- `voicing: "barre"` for a chord with no movable shape: falls back to open, `fellBack` shown as a note in the view (Task 4 test, Task 5 view).
- Switching tab/notes/neck during playback keeps the playhead and click running; Stop and unmount clear every timer and the click (Task 5 dev check, `stopAll` test).
- An old `comp` with several patterns keeps its pattern switcher after migration (Task 8 test).

---

### Task 1: Docs extractor

**Files:**
- Create: `src/features/exercises/docs/extract.ts`, `src/features/exercises/docs/extract.test.ts`, `src/features/exercises/docs/index.ts`, `src/features/exercises/docs/docs.generated.json` (starts as `[]`), `scripts/gen-exercise-docs.ts`
- Modify: `package.json` (script `"docs:exercises": "tsx scripts/gen-exercise-docs.ts"`)

**Interfaces:**
- Produces:
  - `interface PropDoc { name: string; type: string; required: boolean; description: string }`
  - `interface ComponentDoc { name: string; kind: "basic" | "guided" | "shape"; description: string; props: PropDoc[] }`
  - `extractDocs(source: string): ComponentDoc[]` (in `extract.ts`, depends only on `typescript`)
  - `COMPONENT_DOCS: ComponentDoc[]`, `docOf(name: string): ComponentDoc | undefined`, `shortDoc(d: ComponentDoc): string` (in `docs/index.ts`, reads the JSON; `shortDoc` = `name: first sentence (prop: type, ...)`, used by debug)
- Convention for every later task: a props interface is exported from a `*.props.ts` file under `src/features/exercises/` and carries the JSDoc tag `@component <name> <kind>`. The JSDoc text (all paragraphs) is the description, written for the AI reader. Each property's JSDoc is its description; `?` means not required.

- [ ] **Step 1: Write failing tests** in `extract.test.ts` on an inline fixture:
  ```ts
  const src = `/** Shows a demo.\n *\n * Second paragraph.\n * @component demo basic */\nexport interface DemoProps {\n  /** a note: c, f-sharp */ key: string;\n  /** rest of notes */ others?: "dimmed" | "hidden";\n}\ninterface Untagged { a: string }`;
  assert.deepEqual(extractDocs(src), [{ name: "demo", kind: "basic", description: "Shows a demo.\n\nSecond paragraph.", props: [
    { name: "key", type: "string", required: true, description: "a note: c, f-sharp" },
    { name: "others", type: '"dimmed" | "hidden"', required: false, description: "rest of notes" } ] }]);
  ```
  plus: a tag with an unknown kind throws `Error` naming the interface.
- [ ] **Step 2: Run** `$TSX --test src/features/exercises/docs/extract.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `extractDocs`** with `ts.createSourceFile(..., ts.ScriptTarget.Latest, true)`, walking `InterfaceDeclaration`s, reading `ts.getJSDocTags` and the JSDoc comment text; property type via `member.type.getText()`.
- [ ] **Step 4: Implement the script and index.** `scripts/gen-exercise-docs.ts` globs `src/features/exercises/**/*.props.ts` (use `fs.readdirSync` recursive), concatenates `extractDocs` results sorted by `name`, writes pretty JSON. Add test `generated docs are current`: same extraction compared with the JSON via `assert.deepEqual`.
- [ ] **Step 5: Run tests.** Expected: PASS (both files, the JSON is `[]` and there are no props files yet).
- [ ] **Step 6: Commit** `feat(exercises): docs extractor for component props`.

---

### Task 2: Timeline model and degrees

**Files:**
- Create: `src/features/exercises/timeline/types.ts`, `src/features/exercises/timeline/degrees.ts`, `src/features/exercises/timeline/timeline.ts`, `src/features/exercises/timeline/timeline.test.ts`
- Modify: `src/features/plan/model/tools.ts` (delete `DEGREE_SEMIS`/`degreeSemis`, re-export `degreeSemis` from the new module)

**Interfaces:**
- Produces (types.ts):
  ```ts
  export type Degree = string;
  export type Voicing = "open" | "barre";
  export type DegreesFrom = "key" | "chord";
  export type BoxPart = "lower" | "upper";
  export interface Place { box: number; part?: BoxPart }
  export type Step = { kind: "strum" } | { kind: "note"; semis: number; from: DegreesFrom };
  export type TimelineEvent =
    | { type: "scale"; at: number; key: number; scale: string }
    | { type: "chord"; at: number; beats: number; name: string; voicing: Voicing; place?: Place; backing?: CompPattern; highlight?: number[] }
    | { type: "step"; at: number; beats: number; chord: string; step: Step; place?: Place; cue?: string };
  export interface Timeline { bpm: number; bars: number; events: TimelineEvent[]; repeats?: number; backingChoices?: CompPattern[]; hints?: { at: number; text: string }[] }
  ```
  `at` and `beats` are in beats from the start; `highlight` is semitones above the chord root. `CompPattern` from `@/lib/practice/comping`.
- Produces (degrees.ts): `degreeSemis(v: unknown): number | null` (same table and normalisation as today's plan `tools.ts`), `parseDegrees(v: unknown): number[]` (unique, sorted, invalid dropped).
- Produces (timeline.ts): `BEATS_PER_BAR = 4`; `clampTimeline(t: Timeline): Timeline` (bpm 30..240, bars 1..32, repeats 1..50 when present, events beyond `bars*4` dropped); `timelineSeconds(t: Timeline): number` (`bars*4*60/bpm*(repeats ?? 1)`).

- [ ] **Step 1: Failing tests**: `degreeSemis("b3") === 3`, `degreeSemis("♭7") === 10`, `degreeSemis("#4") === 6`, `degreeSemis("8") === null`, `degreeSemis("") === null`; `parseDegrees(["5","1","x","1"])` deep-equals `[0, 7]`; `timelineSeconds({bpm:60, bars:4, repeats:2, events:[]}) === 32`; `clampTimeline({bpm:0, bars:0, repeats:1e6, events:[]})` gives `bpm 30, bars 1, repeats 50`; an event at beat 40 in a 4-bar timeline is dropped.
- [ ] **Step 2: Run** `$TSX --test src/features/exercises/timeline/timeline.test.ts src/features/plan/model/plan.test.ts`. Expected: FAIL on the new file only.
- [ ] **Step 3: Implement.** **Step 4: Run again.** Expected: PASS, plan tests still pass.
- [ ] **Step 5: Commit** `feat(exercises): timeline model and degrees`.

---

### Task 3: Shape generators

**Files:**
- Create: `src/features/exercises/shapes/{numerals,progression,twoScales,chordSteps,arpeggioPart,melody,soloOver,index}.ts`, `src/features/exercises/shapes/shapes.props.ts`, `src/features/exercises/shapes/shapes.test.ts`

**Interfaces:**
- Consumes: Task 2; `parseChordQuery` (`@/lib/chordKit/chordSearch`); `parseKeySlug` (`@/features/theory/keySlug`); `findPentatonic` / `findModePage` for scale validity; `BOOK`, `RUNS`, `parseTune` (`@/features/theory/singingMelodies`); `isCompPattern` (`@/lib/practice/comping`).
- Produces (`shapes.props.ts`, one interface per shape, `@component <name> shape`, each JSDoc with one worked JSON example from the spec):
  - `ProgressionShape { shape: "progression"; key: string; numerals?: string[]; chords?: string[]; bars: number; beatsPerChord?: 2|4; steps?: Degree[] | ("strum"|Degree)[]; degreesFrom?: DegreesFrom; voicing?: Voicing; backing?: CompPattern[]; place?: Place[] }`
  - `TwoScalesShape { shape: "two-scales"; a: {key: string; scale: string}; b: {key: string; scale: string}; bars: number; switchBar?: number; backingChord?: string }`
  - `ChordStepsShape { shape: "chord-steps"; key?: string; chords: { chord: string; steps: ("strum"|Degree)[]; place?: Place }[]; degreesFrom?: DegreesFrom; voicing?: Voicing; guide?: string[] }`
  - `ArpeggioPartShape { shape: "arpeggio-part"; key?: string; chords: string[]; degrees: Degree[]; across?: { from: Place; to: Place }; place?: Place[]; bars: number; guide?: string[] }`
  - `MelodyShape { shape: "melody"; tune: number; key: string }`
  - `SoloOverShape { shape: "solo-over"; key: string; chords: { chord: string; scale?: string; target: Degree[]; approach?: string }[]; bars?: number; backing?: CompPattern }`
  - Common to all (in a `ShapeCommon` interface the others extend): `bpm: number; repeats?: number`.
- Produces (functions): `numeralChord(numeral: string, keyPc: number): string | null` (major-key degrees; lower case = minor; accepts `I ii iii IV V vi vii°`, `bVII`, `V7`); `expandShape(raw: unknown): Timeline | null` dispatching on `shape` to one pure function per shape (`progression`, `twoScales`, `chordSteps`, `arpeggioPart`, `melody`, `soloOver`), each returning a `clampTimeline`ed `Timeline` or null.
- Rules the functions implement:
  - Chords cycle to fill `bars` (`progression`, `arpeggio-part`); `chord-steps` takes one bar per chord unless the steps need more (one beat per step, rounded up to whole bars).
  - Step `"strum"` is `{kind:"strum"}`; a degree is `{kind:"note", semis, from: degreesFrom}`; steps repeat across the chord's beats.
  - `two-scales`: `switchBar` defaults to `floor(bars/2)`, clamped to `1..bars-1` (bars forced to at least 2).
  - `place` and `across` are copied onto events, not resolved to frets (Task 4 does that). Default `cue` when a step's `place.box` differs from the previous step's: `"Box N, <part> part"`; a `guide` entry wins over the default for the same index.
  - `solo-over`: per chord a `scale` event (when `scale` given) and a `chord` event with `highlight = parseDegrees(target)` and `backing`; no step events. `approach` becomes a hint at the chord's start: `Timeline.hints?: { at: number; text: string }[]` (Task 2 adds the `hints?` field to `Timeline`).
  - `progression.backing` becomes `Timeline.backingChoices` (first plays first) and the first one is set on each chord event.

- [ ] **Step 1: Failing tests** (`shapes.test.ts`):
  - `numeralChord("IV", 7) === "C"`, `numeralChord("vi", 7) === "Em"`, `numeralChord("V7", 0) === "G7"`, `numeralChord("X", 0) === null`.
  - `chordSteps` with G barre `["strum","1","6","1"]` then D barre `["strum","4","5","4"]`: chord G at 0, steps at beats 0,1,2,3 as strum, semis 0, 9, 0; chord D at 4; steps strum, 5, 7, 5; `voicing` `"barre"` on both chords.
  - `progression` I IV V in G, `steps:["1","3","5"]`, `bars:4`, `beatsPerChord:4`: chord names G, C, D, G at 0, 4, 8, 12.
  - `twoScales` with `bars:8` switches at bar 4 (scale events at beats 0 and 16); `switchBar:99` with `bars:8` switches at bar 7.
  - Chord `"Hx"` in `progression.chords` is dropped; all chords invalid returns null. `expandShape({shape:"nonsense"}) === null`. A degree `"9th"` in `solo-over.target` is dropped.
  - `arpeggioPart` with `place` box1-lower, box1-upper, box2-lower, box2-upper over a 4-chord progression copies each place to its chord's steps and sets a default `cue` only on the first step of chord 3 (`"Box 2, lower part"`); a 2-entry `guide` replaces the first two cues and leaves the rest default.
  - `soloOver` with Am7 (`scale:"dorian"`, `target:["1","b3"]`) then D7 (`scale:"mixolydian"`, `target:["3"]`): scale events at both chords, chord events with `highlight` `[0,3]` and `[4]`, zero step events.
- [ ] **Step 2: Run** `$TSX --test src/features/exercises/shapes/shapes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Regenerate docs** (`$TSX scripts/gen-exercise-docs.ts`), run the docs freshness test. **Commit** `feat(exercises): play-along shapes`.

---

### Task 4: Voicings, cues and tab

**Files:**
- Create: `src/features/exercises/cues/voicing.ts`, `src/features/exercises/cues/cues.ts`, `src/features/exercises/cues/tab.ts`, `src/features/exercises/cues/cues.test.ts`

**Interfaces:**
- Consumes: Task 2 types, Task 3 `expandShape` (tests only); `parseChordQuery`; `shapesForTones` (`@/lib/chordKit/chordShapes`); `RICH_SHAPES`, `OPEN_PITCH` (`@/lib/chordKit/shapeTools`); `shapeMidi`; `buildArpeggio`, `neckCells`, `arpPositions` (`@/lib/chordKit/arpeggios`) with `makeKeyContext(rootPc, family, mode)` (`@/features/theory/theory`) for boxes; `compEvents` (`@/lib/practice/comping`).
- Produces:
  - `chordShapeFor(name: string, voicing: Voicing): { shape: Shape; fret: number; midi: number[]; fellBack: boolean } | null`. Open = today's choice in `ExerciseTool.ChordShapes` (`shapesForTones(...).find(r => r.full)`). Barre = a movable shape (`at` undefined) whose root is on string 6 or 5 and every played string fretted at or above the root fret, lowest root fret first; none found: open shape with `fellBack: true`.
  - `interface Cue { at: number; beats: number; chord: string; kind: "strum" | "note" | "backing"; midi: number[]; frets: { string: number; fret: number }[]; highlighted: boolean; cue?: string }` (string 0 = low E).
  - `cuesOf(t: Timeline, opts?: { highlight?: number[] }): Cue[]`, sorted by `at`. A note step's pitch: root (chord root, or the current `scale` event's key when `from: "key"`) + `semis`, placed on the voiced shape when the shape has that pitch class (the fret on the shape nearest the previous cue), else within the shape's fret span plus or minus 2 on the nearest string. With `place`, the note is instead taken from `arpPositions` box `place.box` of the chord's arpeggio, limited to strings 0-2 for `lower` and 3-5 for `upper`. A crossing (`across`) climbs `from` then `to`, using a note both boxes share once. `highlighted` = opts/chord `highlight` includes the cue's semitones above the chord root (all true when no highlight given). `backing` cues come from `compEvents(shape midi, chord.backing, beats)`.
  - `type TabColumn = { at: number; cells: { string: number; fret: number }[]; highlighted: boolean }`; `tabOf(cues: Cue[]): TabColumn[]` (backing cues excluded).

- [ ] **Step 1: Failing tests:**
  - `chordShapeFor("G", "barre")`: `fret === 3`, `fellBack === false`, root on string 0. `chordShapeFor("F#", "barre").fellBack === false`. A chord with no movable shape (find one with a quick scratch script over a few rare qualities; if every quality has one, test with a stubbed shape list instead) returns `fellBack: true` and the open shape.
  - From the Task 3 G/D barre `chord-steps` timeline: the root cue for G sits on string 0 fret 3; the 6th over G has midi pitch class 4 (E) and one fret entry; the strum column in `tabOf` has 6 cells.
  - A 4-chord `arpeggio-part` with places box1-lower, box1-upper, box2-lower, box2-upper: every cue's strings fall in its part's range and every fret is inside its box's span.
  - `across` box1-upper to box2-lower over Am: midi values ascend then descend, and the shared note appears once at the turn.
  - `highlight: [4]` over C marks only E cues `highlighted`.
- [ ] **Step 2: Run** `$TSX --test src/features/exercises/cues/cues.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(exercises): voicings, cues and tab`.

---

### Task 5: `play-along` component

**Files:**
- Create: `src/features/exercises/play-along/PlayAlong.tsx`, `src/features/exercises/play-along/views/{TabView,NotesView,NeckView}.tsx`, `src/features/exercises/play-along/useTimelinePlayer.ts`, `src/features/exercises/play-along/schedule.ts`, `src/features/exercises/play-along/schedule.test.ts`, `src/features/exercises/play-along/play-along.props.ts`
- Reference: `src/components/practice/CompPlayer.tsx` (bar-ahead `setTimeout` scheduling with `getSharedPiano`), `src/components/theory/Tab.tsx`, `src/components/theory/singing/MelodyStaff.tsx`, `PositionBox` (`@/components/chordKit/ScaleNeck`).

**Interfaces:**
- Consumes: Tasks 2-4; `wakeAudio`, `getAudioContext`, `getOutputBus`, `getSharedPiano` (`@/features/sound`); `ClickTrack` (`@/features/instruments`).
- Produces:
  - `PlayAlongProps` (`@component play-along guided`): `shape: ProgressionShape | TwoScalesShape | ChordStepsShape | ArpeggioPartShape | MelodyShape | SoloOverShape` (written as the union of the Task 3 interfaces, minus `bpm`/`repeats`, which sit on `PlayAlongProps`), `bpm: number`, `repeats?: number`, `view?: "tab" | "notes" | "neck"`, `highlight?: Degree[]`, `others?: "dimmed" | "hidden"`. The JSDoc explains, for the AI, that it chooses musical content and the app computes notes, frets and timing, and lists the shapes by name.
  - `<PlayAlong {...props} />` (default export) and `<PlayAlongTimeline timeline={...} view others />` (takes a ready `Timeline`; used by the course later).
  - Pure (`schedule.ts`): `barEvents(cues: Cue[], bar: number): Cue[]` (cues starting in that bar of the loop), `loopsDone(beat: number, t: Timeline): number`, `isFinished(beat: number, t: Timeline): boolean` (false when `repeats` absent).
  - Hook: `useTimelinePlayer(t: Timeline): { playing: boolean; beat: number; start(): Promise<void>; stop(): void; setTempo(bpm: number): void }`. One scheduler: a `ClickTrack(getAudioContext(), getOutputBus())` started with an audio-time anchor, notes scheduled one bar ahead from that anchor with `setTimeout` (as `CompPlayer`), playhead from `ClickTrack.beat()`. Stop and unmount clear all timers, `piano.allOff()`, `click.stop()`.
- UI: Play/Stop, tempo −/+ (as `CompPlayer`), view buttons tab / notes / neck (default from `view`), backing pattern buttons when `backingChoices.length > 1`, current cue text and hints above the view, a small "open chord used, no barre shape" note per chord with `fellBack`. `others: "hidden"` leaves non-highlighted cues out of all three views; `"dimmed"` greys them. Changing view never touches the player.

- [ ] **Step 1: Failing tests** (`schedule.test.ts`): `barEvents` of bar 1 returns only cues with `4 <= at < 8`; bar 5 of a 4-bar timeline wraps to bar 1; `loopsDone(33, {bars:4,...}) === 2`; `isFinished(32, {bars:4, repeats:2}) === true`, `isFinished(1000, {bars:4}) === false`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement** `schedule.ts`, then the hook, views and component. **Step 4: Run tests; tsc; eslint `src/features/exercises`.**
- [ ] **Step 5: Regenerate docs, run freshness test.**
- [ ] **Step 6: Dev check.** Temporarily make `ExerciseTool` render `play-along` for a `{type:"play-along", ...}` tool (Task 8 makes it permanent), paste a plan containing the G/D barre `chord-steps` exercise in the dev app. Back up and restore the user's `musickit.plan` localStorage key around the check (it's the user's real profile). Confirm: Play moves the playhead with the click; tab/notes/neck switch mid-play without restarting; Stop silences; leaving the page stops sound.
- [ ] **Step 7: Commit** `feat(exercises): play-along`.

---

### Task 6: Move and rename the basics, add `highlight` / `others`

**Files:**
- Create: `src/features/exercises/basics/{scale-neck,chord-shapes,staff,click-drone,backing-band,note-finder,interval-ears}/index.tsx` and `<dir>/<name>.props.ts`; `src/features/exercises/basics/basics.test.ts`
- Modify: `src/features/plan/ui/ExerciseTool.tsx` (the `ScaleBoxes`, `ChordShapes`, `SingNotes` views move out; it imports from the new places)

**Interfaces:**
- Produces one props interface per basic (`@component <name> basic`):
  - `ScaleNeckProps { scale: string; key: string; boxes?: number[]; add?: string[]; highlight?: Degree[]; others?: "dimmed"|"hidden" }`
  - `ChordShapesProps { chords: string[]; voicing?: Voicing }` (uses Task 4 `chordShapeFor`)
  - `StaffProps { scale: string; key: string; voice?: Voice; notes?: Degree[]; highlight?: Degree[]; others?: "dimmed"|"hidden"; mic?: boolean }` (`mic` default true)
  - `ClickDroneProps { bpm: number; key: string; click?: boolean; drone?: boolean }` (renders `PracticeBand` with parts `click`/`drone`)
  - `BackingBandProps { bpm: number; key: string; parts: ("click"|"drone"|"drums"|"bass")[] }`
  - `NoteFinderProps { mode?: "find"|"every"|"name"; strings?: string; from?: number; to?: number }`
  - `IntervalEarsProps { kind?: "interval"|"chord"; level?: number; set?: number[]; dir?: "up"|"down"|"together"; wide?: boolean }`
- The React components take already-parsed values (pitch classes, semitone arrays) as today; the props interfaces document the AI-facing form. Each component file exports `View` (React) and the props file only the interface.
- `others: "hidden"` on `scale-neck` filters `PositionBox` notes to the lit set; on `staff` it drops non-lit ladder notes.

- [ ] **Step 1: Failing test** (`basics.test.ts`): `COMPONENT_DOCS` contains each of the seven names with `kind: "basic"`; `docOf("scale-neck")` and `docOf("staff")` list `others` with `required: false` and type `'"dimmed" | "hidden"'`; `docOf("backing-band")` lists `parts` as required.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Move views, write props files, regenerate docs.** **Step 4: Run tests, tsc, eslint.**
- [ ] **Step 5: Dev check:** the existing stored plan still renders every old tool (old names still map to the same views here; Task 8 renames the types).
- [ ] **Step 6: Commit** `refactor(exercises): basics moved out of the plan, highlight/others`.

---

### Task 7: New basics: `arpeggio-neck`, `melody-singer`, `run-singer`

**Files:**
- Create: `src/features/exercises/basics/{arpeggio-neck,melody-singer,run-singer}/{index.tsx,<name>.props.ts}`, `src/features/exercises/basics/choices.ts`, `src/features/exercises/basics/arpeggio.ts`, `src/features/exercises/basics/singers.test.ts`
- Reference: `src/components/chordKit/ArpeggiosExplorer.tsx`, `src/lib/chordKit/arpeggios.ts`, `src/components/theory/singing/{MelodyStaff,MelodyFeed,MelodyControls,SingingApp}.tsx`, `src/features/theory/singingMelodies.ts`.

**Interfaces:**
- Produces:
  - `ArpeggioNeckProps { chord: string; boxes?: number[]; part?: Degree[]; highlight?: Degree[]; others?: "dimmed"|"hidden" }` (`boxes`: one or two neighbouring positions; with two, the shared notes are marked as the seam)
  - `MelodySingerProps { tune: number; key: string; voice?: Voice }`, `RunSingerProps { run: number; key: string; voice?: Voice }`
  - `arpeggio.ts`: `arpeggioPartNotes(chord: string, opts?: { part?: Degree[]; boxes?: number[] }): { string: number; fret: number; midi: number; semis: number; seam: boolean }[]` sorted by midi.
  - `choices.ts`: `melodyChoices(): { id: number; stage: string; hint: string }[]` and `runChoices()` (first tune id of each stage, the stage title and hint, from `BOOK`/`STAGES` and `RUNS`/`RUN_STAGES`); `isTuneId(n: unknown): boolean`, `isRunId(n: unknown): boolean`.
- Singers reuse the singing page's staff and mic components; no new pitch logic.

- [ ] **Step 1: Failing tests:** `arpeggioPartNotes("Am", { part: ["1","b3"] })` has only pitch classes 9 and 0; `arpeggioPartNotes("Am", { boxes: [1, 2] })` contains notes from both boxes, ascending midi, at least one `seam: true`; `isTuneId(BOOK[0].id) && !isTuneId(9999) && !isTuneId("1")`; `isRunId(RUNS[0].id)`; `melodyChoices().length === STAGES.length` and its first entry's `stage === STAGES[0].title`; `runChoices().length === RUN_STAGES.length`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement helpers, views, props; regenerate docs.** **Step 4: Run tests, tsc, eslint.**
- [ ] **Step 5: Dev check** each view with the mic denied (no crash, staff still shown) and granted.
- [ ] **Step 6: Commit** `feat(exercises): arpeggio-neck, melody-singer, run-singer`.

---

### Task 8: Autoplan layer: registry, parse, migration, prompt, debug

**Files:**
- Modify: `src/features/plan/model/tools.ts`, `src/features/plan/model/prompt.ts`, `src/features/plan/model/config.ts` (exercise minutes), `src/features/plan/ui/ExerciseTool.tsx`, `src/features/plan/ui/PromptAndPaste.tsx`, `src/features/plan/model/plan.test.ts`
- Create: `src/features/plan/model/migrate.ts`

**Interfaces:**
- Consumes: Tasks 1-7.
- Produces:
  - `PlanTool` = `{ type: <component name> } & <parsed props>` for the 11 components. `TOOLS` keeps one entry per component with only `parse(t): PlanTool | null`; description and schema come from `docOf(name)`. Hand-written `description`/`properties` are deleted.
  - `migrateTool(raw: Record<string, unknown>): Record<string, unknown>` in `migrate.ts`: `scale` to `scale-neck`, `chords` to `chord-shapes`, `sing` to `staff` (`mic: true`, other fields kept; stored `notes`/`highlight` are already semitone numbers and are accepted as-is), `band` to `backing-band`, `notes` to `note-finder`, `ears` to `interval-ears`, `comp` to `play-along` with `shape: { shape: "progression", key: <root of first chord>, chords, bars: chords.length * beats / 4 rounded up, beatsPerChord: beats, backing: patterns }`, `view: "neck"`. `parseTool` calls it first, so old and new both parse.
  - `toolFromLink` returns the new names.
  - `toolInterface()` and `offeredInterface()` render from `COMPONENT_DOCS` (kinds `basic` and `guided` as tools; `shape` docs listed under `play-along`), and splice `melodyChoices()`/`runChoices()` into the singer descriptions.
  - `derivedMinutes(sections: Section[]): number | null`: sum of `timelineSeconds/60` over `play-along` tools with `repeats`, null when none. `config.ts` uses it in place of the AI's `minutes` when not null.
  - Prompt: `EXAMPLE` uses `backing-band` and `scale-neck` and one `play-along` (`chord-steps`); every rule naming `band`, `comp`, `sing`, `scale`, `chords` uses the new names; add the rule "You choose what to practise; the app computes notes, frets, tabs and timing. Never write frets or note lists the app can compute."
  - Debug (`PromptAndPaste.tsx`): list shows `shortDoc` per component, expandable to the full prop table; same `COMPONENT_DOCS` source.
- [ ] **Step 1: Failing tests (update `plan.test.ts` first):**
  - Stored `{type:"sing", scale:"major-ionian", key:0, voice:"tenor", notes:[0,4,7], highlight:[4]}` parses to `{type:"staff", ..., voice:"tenor", notes:[0,4,7], highlight:[4], mic:true}`.
  - Stored `{type:"comp", chords:["Am","F","C","G"], patterns:["arp-up","strum"], bpm:80, beats:4}` parses to a `play-along` whose expanded timeline has `backingChoices` `["arp-up","strum"]` and 4 bars.
  - `parseTool({type:"play-along", bpm:70, shape:{shape:"chord-steps", chords:[{chord:"G",steps:["strum","1","6","1"]},{chord:"D",steps:["strum","4","5","4"]}], voicing:"barre"}})` is not null; with `shape:"nonsense"` it is null.
  - The set of tool names in `toolInterface()` equals the `basic`+`guided` names in `COMPONENT_DOCS`; the text contains every shape name and `STAGES[0].title`.
  - `derivedMinutes` for one `play-along` with `bars:4, bpm:70, repeats:2` is `27.43 / 60` within 0.01 (0.457); null for an exercise without `repeats`.
  - `buildPrompt(...)` contains no `"type": "band"`, `"type": "comp"`, `"type": "sing"`, `"type": "scale"`, `"type": "chords"`.
  - Existing legacy tests (`legacySections`, `toolFromLink`) updated to new names and still pass.
- [ ] **Step 2: Run** `$TSX --test src/features/plan/model/*.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** **Step 4: Run all plan and exercises tests, tsc, eslint `src/features/plan src/features/exercises`.**
- [ ] **Step 5: Dev check** (back up and restore `musickit.plan`): the stored old plan renders; a pasted new plan with each component renders; the debug panel shows short docs; the copied prompt shows the full docs.
- [ ] **Step 6: Commit** `feat(plan): learning components as autoplan tools`.

---

### Task 9: Docs and rules

**Files:**
- Modify: `src/features/plan/CLAUDE.md` (replace the "exercise tools stay a small set..." and single-source bullets: components live in `features/exercises`, docs come from `*.props.ts` via `npm run docs:exercises`, the plan only parses and migrates), `src/features/plan/README.md` (tools paragraph, code map), `package.json` `test` script (add `src/features/exercises/*/*.test.ts src/features/exercises/*/*/*.test.ts`)
- Create: `src/features/exercises/README.md` (layers and the code map), `src/features/exercises/CLAUDE.md` (how to add a basic or a shape: props file with `@component`, regenerate docs, parse in the plan registry, test; layer 0 stays pure)

- [ ] **Step 1:** Add the test globs; run the full test list with `$TSX --test` (the `npm test` command with `npx tsx` replaced by `$TSX`). Expected: all pass, exercises tests included.
- [ ] **Step 2: Write the docs.** **Step 3:** tsc, eslint on both features.
- [ ] **Step 4: Commit** `docs(exercises): layers, rules, test globs`.

---

## Self-review notes

- Spec coverage: layer 0 timeline (2-4), shapes incl. `solo-over`, crossing and per-chord `place`, `guide` cues (3-4), `play-along` with one clock and tab/notes/neck switch (5), basics, renames and `sing` split (6-7), highlight/others (4-7), single source docs for prompt and debug (1, 8), no AI events (3, 8), repeats and derived time, no `goal` (2, 8), migration of stored plans (8), docs/rules (9).
- Order: 1 then 2 then 3 then 4 (pure, each depends on the previous); 5 needs 2-4; 6 needs 1 and 4 (`chordShapeFor`); 7 needs 1; 8 needs all; 9 last.
- Calls made here, not in the spec: docs via the TypeScript compiler API plus a committed JSON with a freshness test; degrees major-relative; `play-along` is the only component that owns a timeline; old `comp` migrates fully to `play-along` (patterns become `backing` choices), so no old player path is kept; `solo-over`'s `approach` text becomes a timeline hint.
