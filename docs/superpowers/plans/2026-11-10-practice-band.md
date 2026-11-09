# PracticeBand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `PracticeBand` component, configured by an object and a `view`, replaces `Jam`, `PocketTools`, `PracticeBand` and `PracticeBacking`; the looper becomes its own `Loops` component; the band gets the backing track's rhythms (grooves) with swing.

**Architecture:** The engine stays `JamRig` (one clock; parts join on the next beat). The loops move out of `JamRig` into a `LoopDeck` that follows the rig's grid through a small `GridFollower` interface. Rhythm data (drum lines, bass roles, swing) moves into `instruments/sequencer/grooves.ts` and becomes the one source both the band and the backing track's styles read. A pure `band/config.ts` resolves `view` + `show` into what each view draws; four small view files render it from one rig.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routing), React 19 `useSyncExternalStore`, Web Audio, node:test via tsx.

**Spec:** the conversation of 2026-11-10 (summarised here, since there is no separate spec file):
1. One feature, configured by an object that says which elements show and how they are set up.
2. The view type is a prop (`full` = today's jam page, tighter ones for exercises and settings bars); a container renders the view's rules, the object narrows it further.
3. Name: `PracticeBand`.
4. The looper is its own component, independent of the band.
5. More rhythms, like the backing track's styles; if that is impractical, simplify.
6. The backing track (`features/backing`) stays a separate feature: no engine merge.
7. A piano roll as a display option (decided: optional last task, showing the bass line; sing-along's roll is not migrated in this plan).

## Global Constraints

- `src/features/instruments` imports only `@/features/sound` and shared components; never the looper, chordKit, the creator or `@/features/backing`. `features/backing` may import `@/features/instruments/model` (already does).
- Pure files (no React, no Web Audio) get tests; everything new and pure is exported from `instruments/model.ts`, React pieces from `instruments/index.ts`.
- Saves stay where they are: `musickit.jam` (incl. `loops`), `musickit.pocket`, `musickit.practiceBand`. Old saves load unchanged; new fields are optional and default (`swing` 0, `groove` null).
- Every existing `data-tour` value stays on an element with the same role: `jam-all`, `jam-metronome`, `jam-drone`, `jam-band`, `jam-loops`, `band-play`, `band-parts`, `band-tempo`, `band-more`, `pocket-tools`. `src/features/guide/*.test.ts` must pass.
- The AI tools `click-drone` and `backing-band` keep their JSON shapes.
- 4/4 only in the band (`BEATS_PER_BAR` stays 4): the Waltz stays a backing-only style.
- Teaching text (labels, hints) follows the `teaching-voice` skill: plain, short.
- Tests: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1); $TSX --test src/features/instruments/*/*.test.ts src/features/backing/*/*.test.ts src/lib/looper/*.test.ts src/features/guide/*.test.ts src/features/devtools/stories/*.test.ts` (never `npx tsx`, it hangs here).
- Types: `npx tsc --noEmit 2>&1 | grep -v '^\.next/'` prints nothing. Lint: `npx eslint <changed files>`.
- Work only in the worktree `/Users/pio/projects/musickit/.claude/worktrees/practice-band` (branch `practice-band`). Commit there with plain `git add <your paths>` + `git commit`; never touch the main checkout `/Users/pio/projects/musickit`. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.
- Check a task's views on `/dev/stories` from the worktree's own dev server: `npx next dev --webpack -p 3100` (Turbopack fails on the symlinked node_modules). The Chrome on localhost is the user's real profile: back up and restore any `musickit.*` key you change.

## Review Focus

1. **A `musickit.jam` save from before the split** (with `loops`) must open with the same loops, inputs and effects on the metronome-drone page. Test in Task 3.
2. **Swing 0 must time exactly as today**, including in the looper (`src/lib/looper/engine.ts` uses `Sequencer`). Test in Task 1.
3. **Editing one step after picking a groove** must keep the edit and show "Custom", across a reload. Test in Task 2.
4. **Host setup vs save:** in `bar`/`inline` the host's `bpm`/`keyPc`/`groove` win on every mount; in `full`/`pocket` (no host setup) the save wins. Test in Task 4.
5. **Changing key while the bass plays** keeps the groove's rhythm and moves it to the new key (lanes are degrees, so it must not reload cells). Test in Task 2.

---

### Task 1: Grooves and swing (pure)

**Files:**
- Create: `src/features/instruments/sequencer/grooves.ts`, `src/features/instruments/sequencer/grooves.test.ts`
- Modify: `src/features/instruments/sequencer/pattern.ts` (add `swingOffset`), `src/features/instruments/sequencer/sequencer.ts` (`SequencerState.swing`, `schedule`, `load`, `setSwing`), `src/features/instruments/model.ts` (exports)
- Modify: `src/features/backing/model/styles.ts` (4/4 styles spread a groove), `src/features/backing/model/arrange.ts:38-42` (`stepBeat` calls `swingOffset`)

**Interfaces:**
- Produces:
  - `swingOffset(step: number, swing: number): number` — beats to push a 16th step late: `swing / 6` when `step % 4 === 2`, else 0 (today's `stepBeat` rule, moved).
  - `stepTime(anchor: number, n: number, beatSeconds: number, swing: number): number` — `anchor + n * stepSeconds(beatSeconds) + swingOffset(((n % 16) + 16) % 16, swing) * beatSeconds`.
  - `type BassRole = "R" | "3" | "5" | "7" | "b7" | "6" | "8" | "A"`, `interface BassHit { at: number; len: number; note: BassRole; vel?: number }` (moved from backing; backing re-imports them).
  - `interface Groove { id: GrooveId; name: string; bpm: number; swing: number; drums: Partial<Record<DrumLane, string>>; bass: BassHit[] }`, `type DrumLane = "kick" | "snare" | "clap" | "hat" | "open" | "tom"`, `type GrooveId = "pop" | "rock" | "ballad" | "swing" | "shuffle" | "bossa" | "funk" | "reggae"`.
  - `GROOVES: Groove[]` — data copied verbatim from the 8 four-four entries of `backing/model/styles.ts` (`drums`, `bass`, `swing`, `bpm`, `name`), then removed there.
  - `findGroove(id: string): Groove | null`
  - `grooveDrumCells(g: Groove): Cells` — 6 lanes in `DRUMS` lane order; `"X"`→2, `"x"`→1, `"o"`→1 (no ghost level in the grid).
  - `grooveBassCells(g: Groove): Cells` — 8 lanes, **lowest note first is lane index 7** (bass lanes are stored high-to-low: `bassLanes(...).reverse()`). Role → semitones over the minor-pentatonic lanes `[0,3,5,7,10,12,15,17]`: `R`→0, `3`→3, `5`→7, `6`→7, `7`/`b7`→10, `A`→10, `8`→12. Hit at step `at` sets the cell to 2 when `vel ≥ 0.8` (or absent), else 1.
  - `SequencerState.swing: number` (0..1, default 0; `load` clamps, missing → 0); `Sequencer.setSwing(v: number): void`.

- [ ] **Step 1: Write failing tests** in `grooves.test.ts`:
  - `swingOffset(2, 1) === 1/6`, `swingOffset(6, 0.5) === 1/12`, `swingOffset(0, 1) === 0`, `swingOffset(3, 1) === 0`.
  - every groove: `grooveDrumCells(g).length === 6`, `grooveBassCells(g).length === 8`, every drum line length is 16.
  - `grooveBassCells(findGroove("rock")!)` has 8 hits, all on the root lane (index 7), at steps 0,2,…,14.
  - shuffle's bass at step 2 (role `3`) lands on the lane of semitone 3 (index 6).
  - `findGroove("waltz") === null`.
  - In `src/features/backing/model/backing.test.ts` add: for each 4/4 `STYLES` entry, `style.drums` deep-equals `findGroove(style.id)!.drums` and `style.bass` deep-equals its `bass`.
  - A sequencer timing test (pure: export the step-time helper `stepTime(anchor, n, beatSeconds, swing)` from `pattern.ts`): with swing 0, `stepTime(10, 6, 0.5, 0) === 10 + 6 * 0.125`; with swing 1, step 6 is `+ 0.5 / 6` later.
- [ ] **Step 2: Run tests, expect FAIL** (module not found).
- [ ] **Step 3: Implement** the interfaces above. `Sequencer.schedule` computes `t = stepTime(this.anchor, this.next, beatSeconds, this.state.swing)` and keeps comparing the **unswung** time with `LOOKAHEAD`/`stopAtTime`, so a swung step never lands after a stop. `arrange.ts`'s `stepBeat` becomes `Math.floor(step/4) + (step%4)/4 + swingOffset(step, swing)` (same values as today).
- [ ] **Step 4: Run all tests in Global Constraints, expect PASS** (backing tests unchanged in behaviour).
- [ ] **Step 5: Commit** `feat(instruments): grooves from the backing styles, swing in the sequencer`.

### Task 2: Grooves in the rig

**Files:**
- Modify: `src/features/instruments/jam/rig.ts`, `src/features/instruments/jam/rig.test.ts`

**Interfaces:**
- Consumes: Task 1's `findGroove`, `grooveDrumCells`, `grooveBassCells`, `Sequencer.setSwing`.
- Produces:
  - `JamRig.setGroove(id: GrooveId): void` — drums and bass cells from the groove, `bars` 1, both swings = `groove.swing`.
  - `JamSnapshot.groove: GrooveId | null` — the groove last set; `null` after `setStep`, `loadPreset`, `clear` or `setBars` on drums or bass.
  - `JamSaved.groove?: GrooveId | null` — saved and restored (restoring a groove id does **not** reload cells; the saved cells win).
  - `loadPreset` sets that part's swing to 0.

- [ ] **Step 1: Failing tests** in `rig.test.ts` (no AudioContext needed, as the existing tests):
  - `setGroove("funk")` → `snapshot().groove === "funk"`, drums cells equal `grooveDrumCells(funk)`, `save().parts.drums.swing === 0`; `setGroove("swing")` → both swings 1.
  - then `setStep("drums", 0, 3, 2)` → `groove === null`, the step is 2; `new JamRig().load(rig.save())` keeps the edited cell and `groove === null`.
  - `setGroove("pop"); setDrone({ root: 2 })` → bass cells unchanged (same array contents) and `groove === "pop"`.
  - `load({ bpm: 90, parts: {} })` (old save) → `groove === null`, swings 0.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(jam): pick a groove for drums and bass`.

### Task 3: The looper on its own (`LoopDeck` + `Loops`)

**Files:**
- Create: `src/features/instruments/loops/deck.ts`, `src/features/instruments/loops/deck.test.ts`; move `jam/loops.ts`, `jam/take.ts` (+ tests) and `jam/JamLoops.tsx`, `jam/JamEffects.tsx` into `src/features/instruments/loops/` (rename `JamLoops.tsx` → `Loops.tsx`).
- Modify: `src/features/instruments/jam/rig.ts` (remove every loop field and method), `jam/useJamRig.ts`, `jam/Jam.tsx` (temporary host until Task 6), `index.ts`, `model.ts`.

**Interfaces:**
- Produces:
  - In `rig.ts`: `interface GridFollower { busy(): boolean; locksTempo(): boolean; onGrid(anchor: number, beatSeconds: number): void; startAt(at: number): void; stopAt(at: number): void; onTempo(bpm: number): void; changed?: () => void }`; `JamRig.follow(f: GridFollower): () => void` (returns unfollow). The rig's `busy`, `othersOn` (click follow), `tempoLocked` and `start/stop(parts, withFollowers)` consult followers where they consulted loops. `withLoops` params are renamed `withFollowers`.
  - `class LoopDeck implements GridFollower` with the moved loop API, same names minus the rig: `attach(ctx, out, app)`, `toggleLoop(id)`, `connectLoop`, `setLoop`, `clearLoop`, `addLoop`, `removeLoop`, `loopPosition`, `loopLevel`, `refreshDevices()`, `subscribe`, `snapshot(): { loops: LoopView[]; devices: InputDevice[] }`, `load(loops?: Partial<LoopConfig>[])`, `save(): Partial<LoopConfig>[]`, `dispose()`.
  - `Loops` React component: `<Loops deck={deck} ready={ready} />` (props of today's `JamLoops` minus the rig).
  - `useLoopDeck(rig: JamRig): { deck: LoopDeck; snap }` in `loops/useLoopDeck.ts` — makes the deck, `rig.follow(deck)`, disposes on unmount.
  - `JamSaved.loops` stays in `musickit.jam`, written by the page (`{ ...rig.save(), loops: deck.save() }`).

- [ ] **Step 1: Failing tests** in `deck.test.ts` (fake follower + rig without audio):
  - a rig following a fake with `locksTempo()` returning true reports `snapshot().tempoLocked === true`, and `setTempo(120)` leaves `bpm` unchanged; with false, `tempoLocked === false` and the tempo changes.
  - `rig.start(["drone"], true)` after `attach` with a fake context calls the follower's `startAt` with the same time the drone starts at (reuse the fake context from `rig.test.ts`).
  - `unfollow()` → the follower's `startAt` is no longer called.
  - `new LoopDeck().load(oldJamSave.loops)` (fixture: a `musickit.jam` JSON with 2 loops, copied from a real save in `/dev/stories` → localStorage) → `save()` deep-equals the input after `clamp`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Move code, don't rewrite it: `JamLoop`, `InputPool` and `take.ts` move unchanged; the rig-to-loop calls become the `GridFollower` methods.
- [ ] **Step 4: Run all tests; open `/theory/metronome-drone`**: record a 1-bar loop, Play all, Stop all, change tempo is locked, reload keeps loop settings. Expect same behaviour as before.
- [ ] **Step 5: Commit** `refactor(instruments): loops leave the jam rig as LoopDeck`.

### Task 4: Band config (pure)

**Files:**
- Create: `src/features/instruments/band/config.ts`, `src/features/instruments/band/config.test.ts`
- Modify: `model.ts` (exports)

**Interfaces:**
- Consumes: `JamRig`, `GrooveId`, `clampTempo`.
- Produces:
  - `type BandView = "full" | "pocket" | "bar" | "inline"`
  - `type BandPart = "click" | JamPart` (moved here from `practice/PracticeBand.tsx`; `plan/model/tools.ts` keeps its own identical `BandPart`, since plan model must not depend on instruments; a type test in `config.test.ts` asserts the two are mutually assignable)
  - `type ShowFlag = "partChips" | "tempo" | "tempoSlider" | "beats" | "key" | "levels" | "groove" | "patterns" | "droneSound" | "more"`
  - `interface BandConfig { parts: BandPart[]; bpm?: number; keyPc?: number; groove?: GrooveId; droneOctave?: number; show?: Partial<Record<ShowFlag, boolean>> }`
  - `VIEW_SHOW: Record<BandView, Record<ShowFlag, boolean>>` with exactly:

    | flag | full | pocket | bar | inline |
    |---|---|---|---|---|
    | partChips | F | F | T | F |
    | tempo | T | T | T | F |
    | tempoSlider | T | T | T | F |
    | beats | T | T | T | T |
    | key | T | F | T | F |
    | levels | T | T | F | T |
    | groove | T | T | T | F |
    | patterns | T | T | T | F |
    | droneSound | T | T | F | F |
    | more | F | F | T | F |

    In `bar`, `tempoSlider`, `groove`, `patterns` sit inside the "More" fold; `more: false` hides the fold and plays groove/patterns/octave at their defaults (today's `more` behaviour).
  - `resolveShow(view: BandView, show?: BandConfig["show"]): Record<ShowFlag, boolean>`
  - `hasHostSetup(view: BandView): boolean` — true for `bar` and `inline`.
  - `applySetup(rig: JamRig, c: BandConfig): void` — tempo (clamped), `setDrone({ root: keyPc, octave: droneOctave })` for given fields, `setGroove(groove)` when given.

- [ ] **Step 1: Failing tests:** `resolveShow("bar", { more: false }).more === false` and the rest equals the table; `resolveShow("full").partChips === false`; `applySetup` on a loaded rig with `{ bpm: 300, keyPc: 2, groove: "bossa" }` → bpm 200 (`MAX_BPM`), drone root 2, groove `"bossa"`; `applySetup` with `{ parts: ["click"] }` changes nothing.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(instruments): PracticeBand config and view rules`.

### Task 5: `PracticeBand` container + `bar` and `inline` views

**Files:**
- Create: `src/features/instruments/band/PracticeBand.tsx` (container), `band/views/BarView.tsx` (from `practice/PracticeBand.tsx`), `band/views/InlineView.tsx` (from `practice/PracticeBacking.tsx`), `band/views/GrooveSelect.tsx`
- Delete: `src/features/instruments/practice/`
- Modify: `index.ts`, `src/features/exercises/basics/click-drone/index.tsx`, `src/features/exercises/basics/backing-band/index.tsx`, `src/features/exercises/basics/staff/index.tsx:23,172`, `src/features/devtools/stories/uiStories.tsx`

**Interfaces:**
- Consumes: Task 4's config, `useJamRig`.
- Produces:
  ```ts
  export interface PracticeBandProps {
    view: BandView;
    config: BandConfig;
    storageKey: string;
    /** share a rig made by the host (the jam page, for its loops); otherwise the band makes its own */
    rig?: ReturnType<typeof useJamRig>;
    /** inline: played by the host */
    on?: boolean; onToggle?: () => void; onStop?: () => void; group?: string;
    /** pocket: PocketTools' host props */
    pocket?: { stacked?: boolean; clickAlways?: boolean; onStatus?: (s: PocketStatus) => void; lines?: ReactNode; className?: string };
  }
  export default function PracticeBand(props: PracticeBandProps): ReactNode
  ```
  Each view takes `{ band: ReturnType<typeof useJamRig>; config: BandConfig; show: Record<ShowFlag, boolean> } & view-specific props`. `GrooveSelect({ rig, value }: { rig: JamRig; value: GrooveId | null })`: a `Select` of `GROOVES` names, "Custom" shown (disabled) when `value === null`.
  When `hasHostSetup(view)`, the container's `restore` loads the save, then `applySetup(rig, config)`.

- [ ] **Step 1:** Exercise wrappers render `<PracticeBand view="bar" storageKey="musickit.practiceBand" config={{ parts, bpm, keyPc, show: { more } }} />`; staff renders `view="inline"` with its `on/onToggle/onStop/group`. Groove select goes in the bar's More fold beside the patterns.
- [ ] **Step 2:** Replace the `PracticeBand`/`PracticeBacking` stories with one `PracticeBand` group whose stories cover `bar` (3 existing set-ups) and `inline` (2), plus a "Bar, bossa groove" story `{ view: "bar", config: { parts: ["click","drums","bass"], bpm: 120, keyPc: 2, groove: "bossa" } }`. Props docs: `view` as `"full" | "pocket" | "bar" | "inline"`, `config` as JSON.
- [ ] **Step 3: Verify:** all tests, tsc, lint; on `/dev/stories#practice-band` each story looks as before; the bossa story plays bossa drums+bass; a click-drone exercise in `/demo/guitar` opens with its own bpm/key after you changed them in another exercise.
- [ ] **Step 4: Commit** `feat(instruments): PracticeBand with bar and inline views`.

### Task 6: `full` view and the metronome-drone page

**Files:**
- Create: `band/views/FullView.tsx` (from `jam/Jam.tsx`, loops card removed, `GrooveSelect` in the drums card's `PatternBar` `leading` slot), `src/features/instruments/jam/JamPage.tsx` (client: `useJamRig({ storageKey: "musickit.jam", followClick: true, restore, save })`, `useLoopDeck`, renders `<PracticeBand view="full" rig={...} config={{ parts: ["click","drone","drums","bass"] }} storageKey="musickit.jam" />` then the loops card with `<Loops>`)
- Delete: `jam/Jam.tsx`
- Modify: `src/app/theory/metronome-drone/page.tsx` (render `JamPage`), `index.ts`, stories (`Jam` story → `PracticeBand` story `view: "full"`).

- [ ] **Step 1:** Move code; the Play all / Space handler stays in `FullView` and starts followers (`withFollowers = true`). `data-tour="jam-loops"` stays on the loops card in `JamPage`.
- [ ] **Step 2: Verify:** tests (guide tours included), tsc, lint; on `/theory/metronome-drone` take the page tour end to end, pick "Swing" groove and hear the swing, record a loop, reload: loops and groove kept.
- [ ] **Step 3: Commit** `feat(instruments): the jam page is PracticeBand full plus Loops`.

### Task 7: `pocket` view

**Files:**
- Create: `band/views/PocketView.tsx` (from `pocket/PocketTools.tsx`; `Tool`, `POCKET_BUTTON`, `POCKET_LIT`, `PocketStatus` move to `band/views/pocketParts.tsx`)
- Delete: `pocket/`
- Modify: `index.ts` (keep exporting `PocketLine`, `POCKET_BUTTON`, `POCKET_LIT`, `PocketStatus`), `src/components/chordKit/ScaleSettings.tsx:13,259`, `src/features/stage/render/StageWidget.tsx:8,84`, stories (PocketTools → `PracticeBand` `view: "pocket"`; drop the `PocketDrone` export, it was only for stories: replace with a pocket story `config.parts: ["drone"]`).

**Interfaces:** hosts render `<PracticeBand view="pocket" storageKey="musickit.pocket" config={{ parts: withDrone ? ["click","drone","drums","bass"] : ["click","drums","bass"], keyPc }} pocket={{ stacked, clickAlways, onStatus, lines, className }} />`. The drone (and so the bass) follows `config.keyPc` live, as today (an effect calling `rig.setDrone({ root })` on change, not only on mount). `GrooveSelect` goes in the drums line's sliders popover.

- [ ] **Step 1:** Move code; behaviour of Space, `clickAlways`, `onStatus`, `lines` unchanged.
- [ ] **Step 2: Verify:** tests, tsc, lint; a scales page (settings bar), the side-column stacked layout, the singing page's melody bar on the click (`onStatus.restart`), the stage widget.
- [ ] **Step 3:** Update `src/features/instruments/CLAUDE.md` and the `index.ts` header: replace the Jam / Pocket tools / Practice band paragraphs with one PracticeBand paragraph (views, `VIEW_SHOW`, config, saves per host) and a Loops paragraph (`LoopDeck`, `GridFollower`). Update `src/features/backing/CLAUDE.md`: 4/4 rhythm data lives in `@/features/instruments/model` `GROOVES`.
- [ ] **Step 4: Commit** `feat(instruments): pocket tools are PracticeBand pocket`.

### Task 8 (optional, ask before starting): bass line roll

**Files:** Create `band/views/BassRoll.tsx`; add `ShowFlag` `"roll"` (default false in every view).

**Interfaces:** `BassRoll({ rig }: { rig: JamRig })` draws the bass pattern as a piano roll: one row per bass lane (labels from `lanesIn(BASS, key)`), a bar per hit, the playhead from `rig.position("bass")`. Use the sing-along roll's look (`ROW_H` 12, `GUTTER` 44, scale rows lighter via `degreeColour`) by importing those constants from a new `src/components/theory/rollStyle.ts` that `PianoRoll.tsx` also imports; sing-along's roll is otherwise untouched.

- [ ] **Step 1:** Implement, story `view: "full", show: { roll: true }`. **Step 2:** Verify by eye at full, tablet and phone widths. **Step 3: Commit** `feat(instruments): bass roll in PracticeBand`.

## Out of scope

- Merging the backing track's engine (`Band`) with `JamRig`; chord progressions in `PracticeBand`.
- 3/4 in the band; drum fills; a ghost-note level in the step grid.
- Saving your own named grooves (the step grid already lets you edit; "Custom" keeps the edit).
