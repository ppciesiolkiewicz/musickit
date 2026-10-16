# Theory Piano Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/theory/piano` practice page: a playable piano under a grand staff that shows the key signature, a fixed "now" spot with a fading trail, interval lines, note names and degrees spelled for the chosen key, and chord names with Roman numerals; then the shared `Piano` restyled to the app's themed design.

**Architecture:** Pure, tested theory logic in `src/features/theory/piano/` (key and spelling, harmony, trail reducer, staff layout). Thin React components in `src/components/theory/piano/` render it. The existing `Piano` (`src/features/sound/keyboard/Piano.tsx`) gains optional controlled-key props and note callbacks, so the page drives it while the looper keeps using it unchanged.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before page code), React 19, Tailwind 4 with themed CSS variables, `@tonaljs/tonal` 4, node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-10-16-theory-piano-design.md`

## Global Constraints

- Work in the `worktree-theory-piano` worktree. Dev server: `npx next dev --webpack -p 3123` (Turbopack fails on the symlinked node_modules).
- Tests: `npm test` hangs on `npx tsx`. Run `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` instead. Add `src/features/theory/piano/*.test.ts` to the `test` script in `package.json` (Task 1).
- `tsc --noEmit`: ignore lines starting with `.next/`.
- Colours only via Tailwind scales / `var(--color-…)` (slate neutral, sky accent, amber = played), so `src/app/themes.css` themes keep working.
- Display accidentals as `♯` `♭` `♮`; tonal works with `#`/`b` internally.
- `TRAIL_LENGTH = 4` (steps on the staff including "now"), `CHORD_WINDOW_MS = 40`. Code constants, no UI.
- Looper must keep working: `src/components/looper/InstrumentPanel.tsx` renders `<Piano voice={voice} />`. Obey `src/lib/looper/CLAUDE.md`.
- No new dependencies. Staff is hand-drawn SVG.

## Review Focus

1. Tonics whose spelling flips with the scale (D♯ Dorian → E♭ Dorian, G♯ minor stays G♯, F♯/G♭ major → F♯): signature, tonic name and note names must agree. Test: Task 1 `enharmonic tonics`.
2. Doubled notes across octaves (C3 C4 E4 G4) and the same note arriving twice (MIDI + computer key): still one C major chord, no duplicate notehead. Tests: Task 2 `doubled notes`, Task 3 `duplicate press`.
3. A held drone with a melody over it (hold C3, play E4 then F4 then G4) and keys released out of order: each press is a step, intervals measured to the added note, release never adds a step. Test: Task 3 `drone with melody`.
4. Extreme octaves (C1, C7) on the grand staff: correct clef and ledger-line count, labels not overlapping the staff. Test: Task 4 `ledger lines`; visual check in Task 6.
5. Changing key or scale with a trail on screen: trail clears (stored spellings would be from the old key). Test: Task 3 `key change clears`.

---

### Task 1: Key context, spelling and degrees

**Files:**
- Create: `src/features/theory/piano/key.ts`
- Test: `src/features/theory/piano/key.test.ts`
- Modify: `package.json` (`test` script: append `src/features/theory/piano/*.test.ts`)

**Interfaces:**
- Produces:
  ```ts
  export type ScaleId = "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian"
    | "harmonicMinor" | "melodicMinor" | "majorPentatonic" | "minorPentatonic" | "blues" | "chromatic";
  export const PIANO_SCALES: { id: ScaleId; name: string }[];
  export interface Spelled { midi: number; letter: "C"|"D"|"E"|"F"|"G"|"A"|"B"; alter: -2|-1|0|1|2; octave: number; name: string /* "F♯" */; degree: string /* "♯4", "3" */ }
  export interface KeyContext {
    tonicPc: number; scale: ScaleId;
    tonic: string;                 // display name, e.g. "E♭"
    signature: number;             // fifths: +2 = two sharps, -3 = three flats, 0 for chromatic
    scalePcs: Set<number>;         // notes highlighted on the piano (the actual scale, pentatonic = 5 notes)
    reference: string[];           // the 7-note degree scale in tonal spelling, e.g. ["C","D","Eb","F","G","Ab","Bb"]
  }
  export function makeKey(tonicPc: number, scale: ScaleId): KeyContext;
  export function spellAs(key: KeyContext, midi: number, letter: Spelled["letter"]): Spelled; // forced letter (used by chord spelling)
  export function spellNote(key: KeyContext, midi: number): Spelled;                        // single-note rule
  ```

- [ ] **Step 1: Write the failing tests** (`node:test` + `assert/strict`, like `src/features/sound/keyboard/scaleKeys.test.ts`)
  - `signatures`: `makeKey(2,"major")` → signature 2, tonic "D"; `makeKey(5,"major")` → -1, "F"; `makeKey(9,"minor")` → 0; `makeKey(2,"dorian")` → 0; `makeKey(0,"harmonicMinor")` → -3; `makeKey(9,"majorPentatonic")` → 3; `makeKey(0,"chromatic")` → 0.
  - `enharmonic tonics`: `makeKey(3,"dorian")` → tonic "E♭", signature -5; `makeKey(8,"minor")` → tonic "G♯", signature 5; `makeKey(3,"minor")` → "E♭", -6; `makeKey(6,"major")` → "F♯", 6; `makeKey(1,"major")` → "D♭", -5.
  - `spelling in key`: in F major `spellNote(k,70).name` = "B♭", degree "4"; in D major `spellNote(k,66)` → "F♯", "3", octave 4.
  - `outside the key`: C major pcs 1,3,6,8,10 → "D♭"/"♭2", "E♭"/"♭3", "F♯"/"♯4", "A♭"/"♭6", "B♭"/"♭7". C minor: E♭ → "3"; 64 → "E"/"♯3"; 69 → "A"/"♯6"; 71 → "B"/"♯7".
  - `pentatonic degrees`: C major pentatonic, 69 → degree "6"; `scalePcs` has 5 entries; 65 (F) → "F", degree "4" (in reference, not in scalePcs).
  - `forced letter`: C major `spellAs(k,68,"G")` → "G♯", degree "♯5".

- [ ] **Step 2: Run** `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/theory/piano/key.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `key.ts`**
  - Each scale has a parent major offset and a reference 7-note scale. Modes: parent = tonic − mode offset (dorian 2, phrygian 4, lydian 5, mixolydian 7, locrian 11, minor 9). Harmonic/melodic minor, minor pentatonic, blues: parent = relative major of the natural minor; reference = the scale itself for harmonic/melodic, natural minor for minor pentatonic/blues. Major pentatonic: parent = major, reference = major. Chromatic: tonic major for both, but `signature` 0.
  - Choose the parent major spelling with the smallest |fifths| (each pc has a sharp and a flat name; −7…7). On a tie (±6): prefer the tonic name with fewer accidentals; if still tied, sharps when the tonic is pc 6 (F♯ major), otherwise flats (E♭ minor, not D♯ minor). Derive the tonic name from that parent's scale (the tonic is a degree of it), so tonic and signature always agree.
  - Degree: number = letter distance from the tonic letter + 1; accidental = note alter − reference alter for that letter, shown as ♯/♭ (± 2 as 𝄪/𝄫); none when equal.
  - `spellNote` for a pc in the reference scale: that spelling. Otherwise the two candidates are "raise the degree below" and "lower the degree above"; pick the one whose note name has fewer accidentals; on a tie, lower the degree above, except when the pc is a tritone above the tonic and the reference 4th is perfect, which gives ♯4.
  - Octave: from midi and letter (B♯3 = midi 60, C♭5 = midi 71).

- [ ] **Step 4: Run tests** — Expected: PASS.

- [ ] **Step 5: Commit** `git add package.json src/features/theory/piano && git commit -m "Theory piano: key context, spelling and degrees"`

---

### Task 2: Intervals and chord names

**Files:**
- Create: `src/features/theory/piano/harmony.ts`
- Test: `src/features/theory/piano/harmony.test.ts`

**Interfaces:**
- Consumes: `KeyContext`, `Spelled`, `spellNote`, `spellAs` (Task 1).
- Produces:
  ```ts
  export function intervalName(from: Spelled, to: Spelled): string; // "M3", "m3", "P4", "TT", "M10", "P8"; descending gets a trailing "↓": "M3↓"
  export interface ChordName { symbol: string /* "D", "Am7", "C/E" */; numeral: string | null /* "I", "♭VII", "V7", "I/3" */; alt: string | null }
  export interface Sounding { notes: Spelled[]; chord: ChordName | null; dyad: string | null /* "P5" when exactly 2 pcs */ }
  export function describe(key: KeyContext, midis: number[]): Sounding; // notes sorted low→high, unique midis
  ```

- [ ] **Step 1: Write the failing tests**
  - `intervals`: C4→E4 "M3"; E4→G4 "m3"; C4→F♯4 "TT"; C4→E5 "M10"; C4→C5 "P8"; E4→C4 "M3↓"; C4→C4 "P1".
  - `triads in key`: D major, [62,66,69] → symbol "D", numeral "I". C major [57,60,64] → "Am", "vi"; [59,62,65] → "B°" (or "Bdim"), "vii°"; [67,71,74,77] → "G7", "V7".
  - `borrowed and secondary`: C major [58,62,65] → "B♭", "♭VII"; C major [64,68,71] → "E", "III", notes spelled E G♯ B.
  - `minor key numerals`: C minor [63,67,70] → "E♭", "III".
  - `inversion`: C major [64,67,72] → "C/E", "I/3".
  - `ambiguous`: C major [60,64,67,69] → symbol "C6", alt "Am7/C".
  - `doubled notes`: C major [48,60,64,67,67] → notes length 4 (unique midis), symbol "C", "I".
  - `dyad`: [60,67] → chord null, dyad "P5". `no match`: [60,61,62] → chord null, dyad null, notes still spelled.
  - `chromatic scale`: `makeKey(0,"chromatic")`, [60,64,67] → numeral null.

- [ ] **Step 2: Run** the harmony test — Expected: FAIL.

- [ ] **Step 3: Implement `harmony.ts`**
  - `intervalName` uses tonal `Interval.distance` on the spelled names with octaves (tonal form, e.g. "F#4"), reformatted from "10M" to "M10". A4/d5 within an octave → "TT".
  - `describe`: dedupe the midis, then run `Chord.detect` on the pitch-class names in bass-first order. Rank the candidates: root in `key.reference` first, then root position before slash chords, then shorter symbol. Spell the chord's tones from its root (root via `spellNote`, then the chord intervals), and map each held note with `spellAs` to its chord letter. Unmatched notes use `spellNote`.
  - Numeral: the root's degree accidental, then a roman numeral (upper case for major/aug/dominant, lower case for minor/dim), then the quality mark (° dim, ø half-dim, + aug), then the extension from the chord type (7, maj7, sus4, add9, 6). Inversion appends "/<bass degree number>". `null` for chromatic.
  - Display symbols with ♯/♭ and drop tonal's "M" for a plain major triad ("D", not "DM").

- [ ] **Step 4: Run tests** — Expected: PASS.

- [ ] **Step 5: Commit** `git commit -m "Theory piano: interval and chord naming"`

---

### Task 3: Trail reducer

**Files:**
- Create: `src/features/theory/piano/trail.ts`
- Test: `src/features/theory/piano/trail.test.ts`

**Interfaces:**
- Consumes: `KeyContext`, `describe`, `intervalName`, `Sounding` (Tasks 1–2).
- Produces:
  ```ts
  export const TRAIL_LENGTH = 4;
  export const CHORD_WINDOW_MS = 40;
  export interface Step { id: number; sounding: Sounding; interval: string | null /* from the previous step, null for the first */ }
  export interface TrailState { steps: Step[] /* oldest first; last = "now"; length <= TRAIL_LENGTH */; held: number[]; lastPressAt: number; nextId: number }
  export const emptyTrail: TrailState;
  export function press(s: TrailState, key: KeyContext, midi: number, at: number): TrailState;
  export function release(s: TrailState, midi: number): TrailState;
  ```

- [ ] **Step 1: Write the failing tests**
  - `single notes`: D major, press 62@0, release, 66@500, release, 69@1000 → 3 steps, intervals [null,"M3","m3"].
  - `struck chord merges`: presses 60@0, 64@10, 67@25 → 1 step, symbol "C".
  - `chord built slowly`: 60@0, 64@500, 67@1000 (no releases) → steps' note counts [1,2,3], intervals [null,"M3","m3"].
  - `drone with melody`: 48@0 held; 64@500, release 64, 65@1000, release 65, 67@1500 → 4 steps; note midis [[48],[48,64],[48,65],[48,67]]; intervals [null,"M10","m2","M2"] (each from the previous step's nearest note to the added note).
  - `fresh press after release`: 60@0, 64@10, 67@20, release all, then 62@1000 → last interval "M2" (previous lowest 60 → 62).
  - `release never adds a step`: after any release, `steps` is unchanged.
  - `trims to TRAIL_LENGTH`: 6 separate presses → 4 steps, ids increasing.
  - `duplicate press`: press 60@0, press 60@5 → 1 step, held [60].

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement `trail.ts`**
  - Duplicate midi already held: return `s` unchanged.
  - Within `CHORD_WINDOW_MS` of `lastPressAt` with a step on screen: replace "now" with `describe(held + midi)`. Its interval is recomputed from the step before it, lowest note to lowest note.
  - Otherwise, push a new step `describe(held + midi)`. Interval: if anything was still held when the key went down, measure from the note of the previous step nearest in pitch to `midi`. If nothing was held, measure from the previous step's lowest note to the new step's lowest note. Trim to `TRAIL_LENGTH`.
  - `release` only removes the note from `held`.
  - Key change is handled by the caller resetting to `emptyTrail`. Add a test `key change clears` that asserts `emptyTrail.steps.length === 0`, and document that the caller must reset on key change. Task 6 does the reset.

- [ ] **Step 4: Run tests** — Expected: PASS.

- [ ] **Step 5: Commit** `git commit -m "Theory piano: trail of played steps"`

---

### Task 4: Grand staff layout maths

**Files:**
- Create: `src/features/theory/piano/staff.ts`
- Test: `src/features/theory/piano/staff.test.ts`

**Interfaces:**
- Consumes: `Spelled` (Task 1).
- Produces:
  ```ts
  export type Clef = "treble" | "bass";
  /** step 0 = bottom line of that clef's staff, +1 per line/space (treble: E4 = 0, F5 = 8; bass: G2 = 0, A3 = 8) */
  export interface Placed { clef: Clef; step: number; accidental: "♯" | "♭" | "♮" | "𝄪" | "𝄫" | null; ledgers: number[] /* steps of ledger lines to draw */ }
  export function place(note: Spelled, signature: number): Placed;
  export function signatureGlyphs(signature: number, clef: Clef): { glyph: "♯" | "♭"; step: number }[];
  ```

- [ ] **Step 1: Write the failing tests**
  - `clef choice`: midi ≥ 60 → treble, < 60 → bass. C4 → treble, step −2, ledgers [−2]. B3 → bass, step 9, ledgers [] (ledgers sit on even steps outside 0–8).
  - `ledger lines`: C7 → treble step 19, ledgers [10,12,14,16,18]; C1 → bass step −11, ledgers [−2,−4,−6,−8,−10].
  - `accidentals vs signature`: D major (2): F♯4 → null; F4 natural → "♮"; G♯4 → "♯". F major (−1): B♭4 → null.
  - `signature glyphs`: 2 sharps, treble → [{♯, step 8 (F5)}, {♯, step 5 (C5)}]; 3 flats, bass → steps for B♭2, E♭3, A♭2 → [2, 5, 1].

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement `staff.ts`** — diatonic index = octave × 7 + letter index. Standard sharp order F C G D A E B and flat order B E A D G C F, with the conventional staff positions for each clef. The accidental is drawn when the note's alter differs from the signature's alter for that letter.

- [ ] **Step 4: Run tests** — Expected: PASS.

- [ ] **Step 5: Commit** `git commit -m "Theory piano: grand staff placement"`

---

### Task 5: Piano accepts a controlled key and reports notes

**Files:**
- Modify: `src/features/sound/keyboard/Piano.tsx`

**Interfaces:**
- Consumes: none from earlier tasks. Props are plain values so `features/sound` does not import `features/theory`.
- Produces: new optional props on `Piano`:
  ```ts
  interface PianoKeyInfo { inScale: (midi: number) => boolean; isTonic: (midi: number) => boolean; degree: (midi: number) => string | null }
  // added to Piano props:
  keyInfo?: PianoKeyInfo;            // when given, Piano hides its own tonic/scale/highlight pickers and uses this
  onNoteOn?: (midi: number) => void; // fired for computer keys, pointer and MIDI
  onNoteOff?: (midi: number) => void;
  ```

- [ ] **Step 1: Add pointer play.** Keys play on `pointerdown` and stop on `pointerup`, `pointerleave` and `pointercancel` (same pattern as `ScalePiano.tsx`), with `tabIndex={-1}`.
- [ ] **Step 2: Fire `onNoteOn`/`onNoteOff` from the shared press/release paths** (keyboard, pointer, MIDI). Use `noteToMidi` from `../engine/notes`.
- [ ] **Step 3: When `keyInfo` is set**, use it for highlight and degree text and hide the scale pickers and the "Highlight scale" checkbox. Without it, behaviour is unchanged.
- [ ] **Step 4: Verify.** `npx tsc --noEmit | grep -v '^.next/'` → no errors. Start the dev server, open `/looper`, add or show a piano instrument and play it: sound and highlighting work as before. (See the memory note: click the page centre to start, force-click "Continue".)
- [ ] **Step 5: Commit** `git commit -m "Piano: pointer play, note callbacks, optional external key"`

---

### Task 6: Grand staff component, page and menu entry

**Files:**
- Create: `src/components/theory/piano/GrandStaff.tsx`, `src/components/theory/piano/TheoryPiano.tsx`, `src/app/theory/piano/page.tsx`
- Modify: `src/features/theory/sections.ts` (Practice group entry)

**Interfaces:**
- Consumes: `makeKey`, `PIANO_SCALES`, `KeyContext` (T1); `press`, `release`, `emptyTrail`, `TrailState`, `Step` (T3); `place`, `signatureGlyphs` (T4); `Piano` with `keyInfo`, `onNoteOn` and `onNoteOff` (T5).
- Produces: `GrandStaff({ steps: Step[]; signature: number })` and the default export `TheoryPiano()`.

- [ ] **Step 1: `GrandStaff.tsx`.** SVG, theme colours via `var(--color-…)`. Layout:
  - Left to right: treble and bass clefs with a brace, then the key signature at a fixed x, both always in the same place.
  - Then `TRAIL_LENGTH − 1` trail slots, then the "now" slot at a fixed x with a faint amber box labelled "NOW", as in the stacked mockup.
  - Noteheads are amber, chords share one x, accidentals sit left of the head and ledger lines come from `place`.
  - Trail opacity rises toward "now" (for example 0.3, 0.5, 0.75, 1). The "now" heads are drawn slightly larger.
  - Dashed sky-blue lines join each step to the next (lowest heads), with `step.interval` at the midpoint. The line into "now" is the brightest and its label bold.
  - Below the bass staff, each step's note names (top) and degrees (under them), stacked low to high for chords. The "now" degree is amber and bold.
  - Beside "now": the chord symbol with "· <numeral> in <tonic>", or the dyad name, plus `alt` small underneath.
  - Steps are keyed by `step.id`, with CSS transitions on `transform`/`opacity` so the trail slides left on each new step.
- [ ] **Step 2: `TheoryPiano.tsx`** ("use client").
  - State: tonic pc (default 0), scale (default "major"), and `TrailState`. The trail resets to `emptyTrail` whenever tonic or scale changes.
  - Controls: tonic select (12 options labelled by `makeKey(pc, scale).tonic`), scale select (`PIANO_SCALES`).
  - Renders `GrandStaff`, then `<Piano keyInfo={…} onNoteOn={(m) => setTrail((t) => press(t, key, m, performance.now()))} onNoteOff={…release} />`.
  - `keyInfo` comes from `key.scalePcs`, `key.tonicPc` and `spellNote(key, m).degree`.
- [ ] **Step 3: Page and menu.**
  - `src/app/theory/piano/page.tsx` follows `src/app/theory/drone/page.tsx`: metadata title "Piano · Music Kit", a `PageShell active="/theory/piano"`, and a `Lesson` with `why` and `tryThis` written in the voice of the other pages (for example: play C, E, G one by one, then together, and watch the intervals turn into a chord name).
  - Pick the `Lesson` `stage` prop that fits; check its type.
  - Add `{ group: "practice", href: "/theory/piano", label: "Piano", desc: "Play and see notes, intervals and chords on the staff", icon: "piano" }` after "Drone".
- [ ] **Step 4: Verify.**
  - Run the sections test: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/theory/sections.test.ts` → PASS. Then `npx tsc --noEmit | grep -v '^.next/'` → no errors.
  - In the browser at `/theory/piano`:
    - D major shows 2 sharps; F major shows a B♭ label.
    - Z-C-B one at a time gives a trail with M3/m3; struck together gives one chord "C · I in C".
    - The trail stays at 4 steps.
    - C1 and C7 (shift octaves) render without clipping.
    - A key change clears the trail.
    - Phone width (390px over CDP, per the memory note) has no horizontal page scroll; the staff scales down.
- [ ] **Step 5: Commit** `git commit -m "Theory piano page: live grand staff over the piano"`

---

### Task 7: Piano redesign (last)

**Files:**
- Modify: `src/features/sound/keyboard/Piano.tsx`

- [ ] **Step 1: Restyle `Piano` to the app's design language.**
  - Replace the hard-coded `white/10`, `zinc-*`, `stone-*` and `emerald-*` colours with themed scales: slate neutral, sky for scale and tonic highlights (tonic stronger), amber for pressed keys.
  - Controls use the shared `field` / `ibtn` styles from `src/components/controls.ts` and `ScalePiano.tsx`, with an `Icon` chevron for octave shift instead of "← Shift down".
  - The keyboard is responsive: key width follows the container (SVG or percentage widths) so two octaves fit a 390px phone without page scroll.
  - Degree labels and key-cap hints stay legible. Reference pages: `src/components/theory/NoteNeck.tsx`, `ScalePiano.tsx`.
- [ ] **Step 2: Verify.**
  - Check `/theory/piano` and `/looper` (piano instrument) in at least two themes (ThemeSwitcher) at desktop and 390px widths, and take screenshots.
  - Run `npx tsc --noEmit | grep -v '^.next/'` → clean, then `npm run lint` → no new errors in touched files.
- [ ] **Step 3: Commit** `git commit -m "Piano redesign: themed colours, shared controls, fits phones"`
