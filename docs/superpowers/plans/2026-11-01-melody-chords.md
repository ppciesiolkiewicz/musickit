# Chords under melodies and runs, and video intro music: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Book tunes and runs get one worked-out chord per bar, drawn above the staff and played by the piano on time; runs signal each key change in the held-Do bar; a video's intro can play a piano tune.

**Architecture:** A pure module `src/features/theory/melodyChords.ts` works chords out from a tune's degrees and realises them on the tune's ladder (one ladder per pass for runs). Every consumer (the singer exercises, the Singing page, the video score) places notes and chords through it, draws them with `MelodyStaff`'s new `chords` prop, and turns them into piano steps with `chordSteps`.

**Tech Stack:** TypeScript, React (Next.js app), node test runner via cached tsx.

**Spec:** `docs/superpowers/specs/2026-11-01-melody-chords-design.md`

## Global Constraints

- One chord per bar, chosen from the scale's chords on degrees 1, 4 and 5 only; plain triads, no sevenths. No chord notation, overrides or hand-written chord data anywhere.
- Tie order when scoring: home chord, then 5, then 4.
- Key-change bar (every run pass but the last, chords on): beat 1 Do as a quarter, no chord struck (the bar before's chord rings on); beat 2 current key's home chord; beat 3 next key's home chord, ringing through beat 4; quarter rests on beats 2–4. The last pass keeps its whole-note Do.
- Chord names and notes share one spelling per key (both come from the same ladder).
- Chords: same shared piano, velocity `0.45` (melody plays at the default `0.8`), close triad in about C3–C4, below the tune where it has room, never under `RANGE_MIN` (36). Hold = `beats * beatMs * 0.9`.
- Tests: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (`npx tsx` hangs). Then `npx tsc --noEmit 2>&1 | grep -v '^.next/'` and `npx eslint <changed files>`.
- Commit straight to `main`, never via `git add` in the real index: build each commit with a temp `GIT_INDEX_FILE` (`read-tree HEAD`, add own paths, `write-tree`, `commit-tree`, `update-ref`), then `git reset -q -- <files>`. Other sessions have uncommitted edits in `ExampleViewer.tsx`, `singer.tsx`, `PlayAlong.tsx`, `PracticeBand.tsx`, `ExerciseTool.tsx`, `sound/index.ts` and `sound/engine/focus*`: for `singer.tsx` and `ExerciseTool.tsx` commit only your own hunks on top of `HEAD`'s blob (their audio-focus hunks stay theirs). Do not push. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Videos stay deterministic: chords are part of `buildScore`/`soundOf`, never timers.

## Review Focus

1. **The voice dot during the key-change rests.** During beats 2–4 nothing is due, so the dot must not be judged against the finished Do (no red, nothing lit). Pinned in Task 3 (`dueNote`).
2. **Bass and baritone voices.** Chord notes never go under 36 and the chord doesn't sit muddy below a low tune. Pinned in Task 1.
3. **Minor-key tunes on the Singing page.** Natural minor names its chords `Am`, `Dm`, `Em`, not major triads. Pinned in Task 1.
4. **Playing from a later beat** (the Singing page's `from`). The chord already sounding at `from` is struck at `from`, and earlier chords are not replayed. Pinned in Task 1 (`chordSteps` with `from`).
5. **An intro with both `music` and `seconds`.** The intro lasts exactly as long as the music, with no error, and the first countdown starts on the click right after it. Pinned in Task 7.

---

### Task 1: Chord logic for a tune

**Files:**
- Create: `src/features/theory/melodyChords.ts`
- Test: `src/features/theory/melodyChords.test.ts`

**Interfaces:**
- Consumes: `MelodyNote`, `BEATS_PER_BAR` (`singingMelody.ts`); `Ladder` (`singing.ts`); `PlacedNote`, `placeTune` (`singingMelodies.ts`).
- Produces:
  - `interface MelodyChord { at: number; beats: number; name: string; midis: number[] }` (`at` and `beats` in beats from the tune's start; `name` like `"C"`, `"Dm"`, `"D♭"`).
  - `barChordDegree(bar: MelodyNote[], barStart: number): 0 | 3 | 4`
  - `tuneChords(tune: MelodyNote[], ladder: Ladder, notes: PlacedNote[]): MelodyChord[]`, where `notes` is `tune` as placed on `ladder` (used to find the Do and to voice below the tune).
  - `harmoniseTune(tune: MelodyNote[], ladder: Ladder, range: Range): { notes: PlacedNote[]; chords: MelodyChord[] }`
  - `chordSteps(chords: MelodyChord[], beatMs: number, from?: number): { note: number; at: number; hold: number; velocity: number }[]` (`at` in ms from beat `from`; structurally a sound `Step`, without importing `@/features/sound`).
  - `CHORD_VELOCITY = 0.45`

- [ ] **Step 1: Write the failing tests** in `melodyChords.test.ts`:
  - `barChordDegree`: bar `"5 4 3 2"` (from `parseTune`) → `4`; bar `"4 6 4 2"` → `3`; bar `"1 3 5 3"` → `0`; the whole-note Do `"1w"` → `0`; a tie (`"2 2 2 2"`, fits only 5) → `4`; a bar with equal fit for 1 and 5 → `0`.
  - `tuneChords` for `"1 2 3 2 | 1w"` in C major (soprano): two chords, `{ at: 0, beats: 4, name: "C" }` and `{ at: 4, beats: 4, name: "C" }`. For `"5 4 3 2 | 1w"`: names `["G", "C"]`.
  - In A natural minor (`buildLadder("natural-minor-aeolian", 9, VOICES.alto)` via `tuneLadderFor`), `"1 3 5 3 | 4 6 1' 6 | 5 7 2' 1'e 7e | 1'w"` → names `["Am", "Dm", "Em", "Am"]`.
  - Voicing: every chord's `midis` is three notes a close triad apart (span ≤ 12). Soprano C major: `max(midis) < min(melody note midi in that bar)`. Bass (`VOICES.bass`) for `parseTune("1 7, 6, 7, | 1w")` (dips under Do): every midi ≥ 36.
  - `chordSteps([{at:0,beats:4,...},{at:4,beats:4,...}], 500)`: 6 steps, `at` 0 and 2000, `hold` 1800, `velocity` 0.45. With `from = 2`: the first chord is struck at `at: 0` with `hold` `(4-2)*500*0.9`; the second at `1000`.

- [ ] **Step 2: Run to verify they fail**
  Run: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/theory/melodyChords.test.ts`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement `melodyChords.ts`**
  - Scoring (`barChordDegree`): for each candidate degree d in [0, 4, 3] (the tie order), the score is the sum over the bar's notes whose `step mod 7` is in the triad {d, d+2, d+4} mod 7 of `beats × weight`, where weight = 2 on beat 1 of the bar, 1.5 on beat 3, 1 otherwise. The highest score wins, and the first in tie order wins ties.
  - Realising a triad: the ladder's notes with `label === "R"` mark Do. Take the ladder index of the Do the placed notes sit on (as `placeRun` finds `root0`), and the triad is ladder indices `do + d`, `+2`, `+4`. Name = the root's `spelled.name`, plus `"m"` when the third is 3 semitones above the root, `"°"` when the fifth is 6. Where the ladder runs out, use the scale's pitch classes and shift by octaves.
  - Voicing: root position close triad. Choose the highest octave whose top note is below the bar's lowest melody note and whose root is ≥ 43. If none exists, put the root in 48–59. Never under 36.
  - `chordSteps`: skip chords that end at or before `from`. A chord that started before `from` is struck at `0` with its remaining length.

- [ ] **Step 4: Run tests, verify PASS** (same command).

- [ ] **Step 5: Commit** `feat(theory): work out a chord per bar for sung tunes` (temp index; files above).

### Task 2: Runs: chords per key and the key-change bar

**Files:**
- Modify: `src/features/theory/singingMelodies.ts` (`placeRun`, lines ~302–315)
- Modify: `src/features/theory/melodyChords.ts`
- Test: `src/features/theory/melodyChords.test.ts`, `src/features/theory/singingMelodies.test.ts`

**Interfaces:**
- Consumes: Task 1's `tuneChords`, `MelodyChord`.
- Produces:
  - `runPasses(tune: MelodyNote[], tonicPc: number, keys: number, ladderIn: (pc: number, range: Range) => Ladder, range: Range): { ladder: Ladder; notes: PlacedNote[] }[]` in `singingMelodies.ts`. Each pass's notes are already offset in time. `placeRun` becomes `runPasses(...).flatMap((p) => p.notes)`, with output unchanged.
  - `harmoniseRun(tune, tonicPc, keys, ladderIn, range): { notes: PlacedNote[]; chords: MelodyChord[] }` in `melodyChords.ts`.

- [ ] **Step 1: Failing tests.**
  - `singingMelodies.test.ts`: `placeRun` output for run `RUNS[0]` in C, soprano, is deep-equal to a snapshot taken from `HEAD` before the refactor. Write the expected midis and beats into the test now, so chords-off keeps whole-note Dos.
  - `melodyChords.test.ts`, `harmoniseRun(parseTune("1e 2e 3e 4e 5e 4e 3e 2e | 1w"), 0, 3, ladderIn, VOICES.soprano)`, with `ladderIn` as in `singer.tsx`:
    - passes 1 and 2 end in a Do with `beats: 1` at `at` 4 and 12; pass 3's last Do has `beats: 4` at 20; total length 24 beats;
    - pass 1's chords are exactly `{at: 0, beats: 5, name: "C"}` (it rings on under the quarter Do), `{at: 5, beats: 1, name: "C"}`, `{at: 6, beats: 2, name: <pass 2's Do>}`;
    - the next-key chord's name equals `spelled.name` of the second pass's first Do (one spelling per key);
    - the last pass's last bar is `{at: 20, beats: 4, name: <third key>}`.

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement.** Extract `runPasses` from `placeRun` without changing behaviour. `harmoniseRun` builds each pass's chords with `tuneChords` on that pass's ladder. Then, for each pass but the last: shorten its last note to `beats: 1`, extend the previous bar's chord by 1 beat, and replace the last bar's chord with the current key's home chord at bar start +1 (1 beat) and the next pass's home chord at bar start +2 (2 beats, voiced and named on the next pass's ladder).

- [ ] **Step 4: Run tests, verify PASS.** Also run `src/features/theory/*.test.ts` to check nothing else moved.

- [ ] **Step 5: Commit** `feat(theory): runs announce each key change with two chords`.

### Task 3: The staff draws chord names and rests

**Files:**
- Modify: `src/components/theory/singing/MelodyStaff.tsx`
- Modify: `src/features/theory/singingMelodies.ts` (pure helpers)
- Test: `src/features/theory/singingMelodies.test.ts`

**Interfaces:**
- Consumes: `MelodyChord` (Task 1).
- Produces:
  - `restBeats(notes: { at: number; beats: number }[], total: number): number[]`: whole beats in `[0, total)` no note covers.
  - `dueNote(notes: { at: number; beats: number }[], beat: number): number`: the index of the note sounding at `beat`, `-1` before the first note **and in a rest**. It replaces `MelodyStaff`'s internal `noteAt`.
  - `MelodyStaff` gains the optional prop `chords?: MelodyChord[]`.

- [ ] **Step 1: Failing tests.** `restBeats` over the key-change pass from Task 2's test returns `[5, 6, 7]` for pass 1. `restBeats` of `"1 2 3 2 | 1w"` returns `[]`. `dueNote` at beats 4.5 → the Do's index, at 5.5 → `-1`, at 8 → the next pass's first note.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** the helpers. In `MelodyStaff`:
  - use `dueNote` everywhere `noteAt` was, keeping `a.target = Math.max(0, …)` only where a note is due; in a rest the dot is drawn but judged against nothing (`fit` stays `"between"`, nothing lit);
  - draw a quarter rest glyph (`𝄽`, in `ink.glyph`, centred on the middle line) at `bx(b)` for each `restBeats` beat, including in the faded lead copy;
  - when `chords` is given, add a top band of about 22px (shift `yOf` down by it, and grow `H` by it). Draw each chord's name at `bx(c.at)`, bold, in `ink.name`, and in `PLAYED` while `a.beat` lies in `[c.at, c.at + c.beats)`. Draw the faded lead copies of chords in the last half bar the way ghost notes are drawn.
- [ ] **Step 4: Run tests, verify PASS;** `tsc` and eslint on the file.
- [ ] **Step 5: Commit** `feat(singing): staff writes chord names and rests`.

### Task 4: Plan exercises: melody-singer and run-singer play chords

**Files:**
- Modify: `src/features/exercises/basics/singer.tsx`, `melody-singer/index.tsx`, `melody-singer/melody-singer.props.ts`, `run-singer/index.tsx`, `run-singer/run-singer.props.ts`
- Regenerate: `src/features/exercises/docs/docs.generated.json` (`npm run docs:exercises`)
- Modify: `src/features/plan/model/tools.ts` (the `PlanTool` union lines 56–57, `singer()` ~175), `src/features/plan/ui/ExerciseTool.tsx` (lines 69–72)
- Test: `src/features/plan/model/plan.test.ts`, `src/features/exercises/basics/singers.test.ts`

**Interfaces:**
- Consumes: `harmoniseTune`, `harmoniseRun`, `chordSteps` (Tasks 1–2); `MelodyStaff` `chords` (Task 3).
- Produces: `SingerView({ n, pc, voice, chords = true })`; the props `chords?: boolean` documented as "the piano's chords under the tune, one a bar, and in a run the two chords that announce each new key; default true"; `PlanTool` singer variants gain `chords?: false` (stored only when false).

- [ ] **Step 1: Failing tests.** In `plan.test.ts`: parsing `{ type: "run-singer", run: <first run n>, key: "c", chords: false }` gives a tool with `chords: false`; without `chords`, or with `chords: true`, the tool has no `chords` key; a non-boolean is ignored. Do the same for `melody-singer`. The `docs/extract.test.ts` freshness test fails until the docs are regenerated.
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/plan.test.ts src/features/exercises/docs/extract.test.ts`; expect FAIL.
- [ ] **Step 3: Implement.** `SingerView` uses `harmoniseTune` or `harmoniseRun` when `chords`, and `placeTune` or `placeRun` when not. `play()` passes `[...melody steps, ...chordSteps(chords, beat).map(s => ({ ...s, at: s.at + lead }))]` to one `playSequence`, and the "playing" end timer still uses the last note's end. Pass `chords` to `MelodyStaff`. Thread `chords` through both Views, both props files, `tools.ts` and `ExerciseTool.tsx`. Then run `npm run docs:exercises`.
- [ ] **Step 4: Run** the tests above plus `src/features/exercises/*/*.test.ts` and `src/features/plan/model/*.test.ts`; PASS. Run `tsc` and eslint on the feature folders. In the browser, open a plan exercise with a run (see the `worktree-dev-and-screenshots` memory for driving the dev server; keep the user's localStorage) and check the key-change bar looks like the user's sketch: a quarter Do, three rests, "C" and "D♭" over beats 2 and 3.
- [ ] **Step 5: Commit** your own hunks only (see Global Constraints) `feat(exercises): melody and run singers play chords under the tune`. Update `src/features/exercises/README.md`'s basics line to mention the chords in the same commit.

### Task 5: Singing page chords and toggle

**Files:**
- Modify: `src/components/theory/singing/SingingApp.tsx` (placement map ~127–135, `startTune` ~213–225, settings, `<MelodyStaff>` uses)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: storage key `CHORDS_KEY = "singing.chords"` (boolean, default true), read and written in try/catch like `ACCURACY_KEY`.

- [ ] **Step 1: Implement.** The `placed` map holds `{ notes, chords }` from `harmoniseTune`/`harmoniseRun` when chords are on, and from `placeTune`/`placeRun` with `chords: []` when off. `place(t)` keeps returning notes, and add `chordsOf(t)`. `startTune` adds `chordSteps(chordsOf(t), beat, from)` offset by `lead`. Every `MelodyStaff` showing a tune gets its chords. A "Chords" toggle sits beside the accuracy setting.
- [ ] **Step 2: Verify.** Run `tsc` and eslint. In the browser on the Singing page: chords sound and light up; toggling off removes them and restores the whole-note Do in runs; Play from a later bar strikes the chord in progress. Back up and restore the user's `singing.*` localStorage keys around the test.
- [ ] **Step 3: Commit** `feat(singing): chords under the tunes, with a toggle`.

### Task 6: Videos: chords in the score, sound and staff

**Files:**
- Modify: `src/features/teachers/video/model/score.ts`, `src/features/teachers/video/VideoRender.tsx`, `src/features/stage/render/TimelineContext.ts`, `src/features/stage/render/MelodyWidget.tsx`
- Test: `src/features/teachers/video/model/score.test.ts`

**Interfaces:**
- Consumes: `harmoniseTune`, `chordSteps`, `MelodyChord`.
- Produces: `Segment.chords: MelodyChord[]` (one pass); `chordPassesOf(g: Segment): MelodyChord[]` (every pass written out, like `passesOf`); `StageTimeline.melody.chords?: MelodyChord[]`.

- [ ] **Step 1: Failing tests** in `score.test.ts`. For a config with tune `"1 2 1 2 | 1w"`, times 2, bpm 80, `soundOf(score).piano` has 4 + 1 + 4 + 1 melody notes plus 2×2 chords × 3 notes = 22 steps. The chord steps have velocity 0.45, and the first chord starts at `introMs + COUNTDOWN_BEATS * beatMs`. `chordPassesOf` gives 4 chords at beats 0, 4, 8, 12. Two `soundOf` calls on the same config are deep-equal.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.** `buildScore` uses `harmoniseTune` for each segment, and `soundOf` adds the chord steps of every pass. `VideoFrame` memoises `chordPassesOf` per segment beside `written` and puts it in `melody.chords`. `MelodyWidget` passes `chords={m.chords}`.
- [ ] **Step 4: Run** `tsx --test src/features/teachers/video/model/*.test.ts src/features/stage/model/*.test.ts`, then `tsc` and eslint. Render frames `npm run video -- videos/c-major-first-steps.json --frames 0,200,last` twice and check the PNG shasums match (determinism) and the names show.
- [ ] **Step 5: Commit** `feat(video): chords in the soundtrack and on the staff`.

### Task 7: Video intro music

**Files:**
- Modify: `src/features/teachers/video/model/config.ts`, `src/features/teachers/video/model/score.ts`, `src/features/teachers/video/VideoRender.tsx`, `src/features/stage/render/TimelineContext.ts`, `src/features/stage/render/ProgressWidget.tsx`, `spec/video.md`, `videos/c-major-first-steps.json`
- Test: `src/features/teachers/video/model/config.test.ts`, `src/features/teachers/video/model/score.test.ts`

**Interfaces:**
- Consumes: Task 6's `Segment` with chords.
- Produces: `VideoIntro.music?: { tune: string; label?: string; times: number }`; `Score.introMusic: Segment | null` (its `startBeat` 0, beats counted from the start of the video, no countdown); `StageTimeline.listening: boolean`.

- [ ] **Step 1: Failing tests.**
  - `config.test.ts`: `intro.music: { tune: "1 2 3 2 | 1w" }` parses with `times: 1`, and a book number is accepted. `intro.music.tune: "8 1 | 1w"` throws a message starting `intro.music.tune: bad note "8"`. `intro.music.times: 0` throws a message starting `intro.music.times:`. A non-object `music` throws a message starting `intro.music:`.
  - `score.test.ts`: with `music` `"1 2 3 2 | 1w"`, `times` 2, `seconds` 5 and bpm 80, `introMs` is `16 * 750` (seconds ignored). `momentAt(score, 0).phase === "intro"`. `momentAt` at `introMs` is the first countdown with `left: 4`. `soundOf` has the intro tune's notes and chords from `at: 0`, and the first click is at `introMs`. Without `music`, the existing intro tests still pass.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.**
  - **config:** share the tune-or-book-number check of `parseTimelineEntry` (pull out `parseTuneField(raw, path): { tune, label? }`) and reuse it for `intro.music` and its `times` (1–16, default 1).
  - **score:** `introMusic` is placed with `harmoniseTune` on the same `tuneLadder`. `introMs = music ? tuneBeats * times * beatMs : seconds * 1000`. `soundOf` adds its passes and chords from 0, with no clicks.
  - **VideoFrame:** during `phase: "intro"`, when the score has `introMusic`, `melody` is its passes and chords, `gridBeats` returns `ms / beatMs`, and `listening` is true. Otherwise behaviour is unchanged.
  - **ProgressWidget:** when `listening`, it shows "Listen" in the same box and type.
- [ ] **Step 4: Run** the video and stage model tests, `tsc` and eslint. Add `"music": { "tune": 3, "times": 1 }` to `videos/c-major-first-steps.json`'s intro. Render `--frames 0,40,last` and check the staff shows the intro tune with the bar running and "Listen" is on screen. Update `spec/video.md`: the Intro bullet, the config example, the `intro` field notes and the length rule.
- [ ] **Step 5: Commit** `feat(video): intro can play a piano tune with its chords`.
