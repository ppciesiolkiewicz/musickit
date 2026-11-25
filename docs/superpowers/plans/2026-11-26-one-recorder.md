# One Recorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `RecordVideo` the only recorder, put the riff maker on it with a riff kit, time any tool's notes onto a take for the neck readers, and add chord, finger, note and coming-next layers to the OpenCV reader.

**Architecture:** Pure model first (`contentVideos/model/takeNotes.ts`, `takeKey.ts`, `neckFx/model/cvFx.ts` additions), then the general recorder parts moved from `RiffTake` into `RecordVideo` (click, kept takes), then a `RecordKit` slot the page fills, then the riff page switched over, then the neck layers, then the play-along kit on the record page. Notes for every play-along (riff included) come from one source: the timeline's cues (`cuesOf`), which already carry string, fret and, where the shape has one, finger.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching routes), React, TypeScript, node:test via tsx, IndexedDB, OpenCV.js canvas drawing.

**Spec:** `docs/superpowers/specs/2026-11-26-one-recorder-design.md`

**Deviation from the spec (my call):** the riff editor stays where it is on the riff page, above the recorder, instead of moving into a kit `controls` slot. The record page sends riff blocks to the riff page, so a `controls` slot would have no user. `RecordKit` has no `controls`.

## Global Constraints

- Commit with `scripts/commit.sh "message" <paths>` only. Never `git add`, `git commit`, `git stash`, `git reset --hard` in the main checkout. Check `git status` before editing a file; leave files another agent has changed.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (`npx tsx` hangs here). Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Lint: `npx eslint <changed files>`.
- Every new or changed string a person reads: load `design:ux-copy`, then "Words about the app" in `teaching-voice`, before writing it. Report strings changed old → new.
- `src/features/contentVideos` never imports plan UI or exercise UI. Pages hand it the tool, the draw function and the kit.
- Keep the `README.md` and `CLAUDE.md` of `contentVideos`, `devtools` (Riff maker section) and `neckFx` true in the same commit as each change.
- Neck readers stay off while recording.
- Export with overlay (`client/burn.ts`) must capture the tool box with the chosen view and the neck layers; the box keeps `isolate`.
- Old riff takes in IndexedDB (`musickit-dev-riff-takes`, keyed by the riff's block id) must still open.

## Review Focus

1. **A take recorded with the click but the tool never started.** Expect the overlay saved from the click clock, so players see the riff move. Test in Task 3.
2. **A take longer than one pass of a looping riff.** Expect notes repeated every `loopBeats` across the whole take, and none past its end. Test in Task 1.
3. **An old riff take stored by the Take panel (`id`, `uploaded`, `withOverlay`, `downbeat`).** Expect it to open on the riff page with its click grid and saved state. Test in Task 2.
4. **Tool clock with a stop and restart mid-take (a null piece between).** Expect no notes in the stopped stretch. Test in Task 1.
5. **A chord whose notes share a start, with the next chord a beat away.** Expect one joined shape now and a faint shape for the next within the lead time, not both lit. Test in Task 7.

---

### Task 1: Notes in time on a take (pure)

**Files:**
- Create: `src/features/exercises/cues/cueNotes.ts`, `src/features/exercises/cues/cueNotes.test.ts`
- Create: `src/features/contentVideos/model/takeNotes.ts`, `src/features/contentVideos/model/takeNotes.test.ts`
- Modify: `src/features/neckFx/model/cvFx.ts` (`TakeNote` gains `finger?: number`)

**Interfaces:**
- Produces:
  - `interface KitNote { beat: number; beats: number; midi: number; string?: number; fret?: number; finger?: number }` (in `cueNotes.ts`)
  - `cueNotes(cues: Cue[]): KitNote[]`: one per fret of each cue whose `kind !== "backing"` and `enabled`; `midi = OPEN_MIDI[string] + fret`; `finger` from the `Fret`.
  - `fingerFor(fret: number, pos: number): number | undefined`: one finger per fret from the hand at `pos`; fret 0 gives undefined; clamp to 1..4.
  - `clickClock(downbeat: number, bpm: number): Piece[]`: `[[0, round(-downbeat * bpm / 60, 3), round(bpm / 60, 4)]]`.
  - `takeNotes(notes: KitNote[], loopBeats: number | null, clock: Piece[], seconds: number): TakeNote[]`: for each clock piece with non-null beat and rate > 0, over its time span (to the next piece or `seconds`), every note at `beat + k * loopBeats` (k ≥ 0; just k = 0 when `loopBeats` is null) whose beat falls in the piece's beat range. Start is `t + (noteBeat - pieceBeat) / rate`, end is `start + beats / rate`. Carry `string`, `fret` and `finger`. Sorted by start.

- [ ] **Step 1: Write the failing tests**

`cueNotes.test.ts`: `cueNotes drops backing and disabled cues`; `cueNotes gives one note per fret with OPEN_MIDI pitch and finger` (a cue `{ at: 2, beats: 1, frets: [{ string: 0, fret: 3, finger: 2 }] }` → `[{ beat: 2, beats: 1, midi: 43, string: 0, fret: 3, finger: 2 }]`); `fingerFor(7, 5) === 3`, `fingerFor(0, 5) === undefined`, `fingerFor(12, 5) === 4`, `fingerFor(3, 5) === 1`.

`takeNotes.test.ts`:
- `clickClock(2, 120)` deep-equals `[[0, -4, 2]]`, and `beatAt(clickClock(2, 120), 2) === 0`.
- **One pass:** notes `[{beat:0,beats:1,midi:40},{beat:2,beats:2,midi:43}]`, `loopBeats` null, `clickClock(1, 60)`, 10 s → starts `[1, 3]`, ends `[2, 5]`.
- **Loops (Review Focus 2):** same notes, `loopBeats` 4, `clickClock(0, 60)`, 9 s → starts `[0, 2, 4, 6, 8]`, nothing at or past 9.
- **Stop and restart (Review Focus 4):** clock `[[0, 0, 1], [2, null, 0], [5, 0, 1]]`, notes at beats 0 and 1, `loopBeats` null, 8 s → starts `[0, 1, 5, 6]`.
- **Carries place:** a note with `string: 1, fret: 2, finger: 1` keeps all three.

- [ ] **Step 2: Run them to see them fail**

Run: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/exercises/cues/cueNotes.test.ts src/features/contentVideos/model/takeNotes.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both files and the `TakeNote.finger` field**

- [ ] **Step 4: Run the tests and the existing clock and neckFx tests**

Run: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/exercises/cues/*.test.ts src/features/contentVideos/model/*.test.ts src/features/neckFx/model/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`scripts/commit.sh "feat(contentVideos): time a tool's notes onto a take" src/features/exercises/cues/cueNotes.ts src/features/exercises/cues/cueNotes.test.ts src/features/contentVideos/model/takeNotes.ts src/features/contentVideos/model/takeNotes.test.ts src/features/neckFx/model/cvFx.ts`

---

### Task 2: Takes kept in this browser, for any target

**Files:**
- Create: `src/features/contentVideos/model/takeKey.ts`, `src/features/contentVideos/model/takeKey.test.ts`
- Create: `src/features/contentVideos/client/takes.ts` (moved from `src/features/devtools/riff/takes.ts`; same DB name `musickit-dev-riff-takes`, same store, keyPath `id`)
- Modify: `src/features/devtools/riff/takes.ts` → delete in Task 5, not here (RiffTake still uses it)

**Interfaces:**
- Produces:
  - `takeKey(target: RecordFor): string`: `` `${block.id}:${block.cell}` `` when opened from a block, else `` `tool:${tool}` ``. The ticked steps never count.
  - `interface KeptTake { id: string /* the take key */; at: number; blob: Blob; type: string; seconds: number; width: number; height: number; videoId?: string; fileUp: boolean; saved: boolean; overlay: Overlay | null; burned: Burned | null; click?: { downbeat: number; bpm: number; bars: number }; log?: TakeLog }`
  - `readKeptTake(raw: unknown): KeptTake | null`: reads a new record, or an old Take panel record (`uploaded` → `saved`, `withOverlay` → `burned`, `downbeat`/`bpm`/`bars` → `click`, missing `overlay` → null, missing width/height → 0).
  - `saveKeptTake(t: KeptTake): Promise<void>`, `getKeptTake(key: string, oldKey?: string): Promise<KeptTake | null>` (tries `key`, then `oldKey`), `deleteKeptTake(key: string): Promise<void>`.
  - `TakeLog`, `NeckRead` re-exported from here.

- [ ] **Step 1: Write failing tests** in `takeKey.test.ts`:
  - `takeKey` for a block target gives `"guitar-advanced-funk-riff-on-e9:1"`; for a tool target gives `"tool:chord-changes"`; two targets that differ only in `steps` give the same key.
  - `readKeptTake` on an old record `{ id: "x", blob, type: "video/webm", seconds: 8, at: 1, uploaded: true, withOverlay: { blob, type: "video/mp4", width: 640, height: 360 }, downbeat: 1.2, bpm: 90, bars: 2 }` gives `saved: true`, `burned.width === 640`, `click` deep-equal to `{ downbeat: 1.2, bpm: 90, bars: 2 }` and `overlay: null` (Review Focus 3).
  - `readKeptTake(null)` and `readKeptTake({ id: "x" })` (no blob) give null.

  Put `readKeptTake` in `takeKey.ts` (pure) so it is testable without IndexedDB. Node has a global `Blob`.
- [ ] **Step 2: Run, expect FAIL.** `…/tsx --test src/features/contentVideos/model/takeKey.test.ts`
- [ ] **Step 3: Implement** `takeKey.ts` and `client/takes.ts`. The latter is the old file's IndexedDB code over `KeptTake`, with `getKeptTake` passing what it reads through `readKeptTake`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(contentVideos): keep a take per target in this browser`.

---

### Task 3: Click, count-in, length and kept takes in RecordVideo

**Files:**
- Create: `src/features/contentVideos/client/click.ts` (`startClick(bpm, anchor)`, moved from `RiffTake.tsx:34`)
- Create: `src/features/contentVideos/ui/BeatView.tsx` (moved from `RiffTake.tsx:610`)
- Create: `src/features/contentVideos/model/takeClock.ts`, `src/features/contentVideos/model/takeClock.test.ts`
- Modify: `src/features/contentVideos/ui/RecordVideo.tsx`
- Modify: `src/features/contentVideos/README.md` (Record section)

**Interfaces:**
- Consumes: `clickClock` (Task 1), `takeKey`, `KeptTake`, `getKeptTake`, `saveKeptTake`, `deleteKeptTake` (Task 2).
- Produces:
  - `takeOverlay(drawn: PlanTool | null, click: KeptTake["click"], samples: Sample[]): Overlay | null`. When the click is on, the overlay is `{ tool: drawn, clock: clickClock(click.downbeat, click.bpm) }`. Otherwise it is `squeeze(samples)` when any sample has a beat, as today. It is null when `drawn` has no overlay (`hasOverlay`).
  - `RecordVideo` new props: `tempo?: { bpm: number; bars: number }` and `oldTakeKey?: string`. Task 4 adds the kit.

- [ ] **Step 1: Failing tests** in `takeClock.test.ts`:
  - `takeOverlay` with a play-along tool, click `{downbeat: 1, bpm: 60, bars: 2}`, and samples all null gives a clock `[[0, -1, 1]]` (Review Focus 1).
  - With no click and samples `[{t:0,beat:null}]` it gives null.
  - With a tool that has no overlay (`{ type: "metronome" … }`) and a click, it gives null.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `takeOverlay`.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Move the click and the kept take into `RecordVideo`.**
  - In the Sound group: **Click at N bpm** (a checkbox; a number input for bpm when `tempo` is absent). It is on by default when `tempo` is given and off otherwise, kept in `musickit.content.click`. **Count-in** (0–2 bars) and **Length** (bars, default `tempo.bars`, else 4) show only while the click is on.
  - `record()` follows `RiffTake.tsx:263-306` for the anchor, latency (`lag`), auto-stop and `BeatView`. `onstop` builds a `KeptTake` with `click` and `overlay: takeOverlay(...)`, stores it with `saveKeptTake`, and keeps the replaced take in memory for **Back to the previous take**.
  - On mount: `getKeptTake(takeKey(target), oldTakeKey)`.
  - Take actions: **Save file** (`RiffTake.tsx` `download`) and **Delete take**. The status line reads "Saved in this browser" / "Saving…" / "Not saved", with a **Save** retry, as on the Take panel.
  - Save for players: give `videoId` once and store it before the upload (`RiffTake.tsx` `mark` logic), then use `take.burned ?? take`. Remove the `beforeunload` prompt once the take is stored in the browser.
  - The detection log (`NeckRead` from `NeckView onRead`) is kept on the take, and `DetectLog` moves to `src/features/contentVideos/ui/DetectLog.tsx` and is shown under the take.
- [ ] **Step 6: Check** `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on changed files, contentVideos tests. Then on the dev server, open `/admin/content/videos/record?tool=guitar-play-along:riff` with no camera: the Click checkbox shows, and Count-in and Length appear when it is ticked. Report what was and wasn't checked with a camera.
- [ ] **Step 7: Commit** with README: `feat(contentVideos): click, count-in and kept takes on the record page`.

---

### Task 4: The kit slot: views and notes for the neck readers

**Files:**
- Create: `src/features/contentVideos/ui/kit.ts`
- Modify: `src/features/contentVideos/ui/RecordVideo.tsx`, `README.md`

**Interfaces:**
- Consumes: `KitNote`, `takeNotes` (Task 1), `beatAt` (`model/clock.ts`).
- Produces:
  ```ts
  export interface KitView { id: string; label: string; draw(beat: number | null): ReactNode }
  export interface RecordKit {
    /** drawn in the tool's box instead of the tool; the tool itself is always the first choice, "Tool" */
    views?: KitView[];
    notes?: KitNote[];
    loopBeats?: number | null;
    /** the key, for degree labels on the neck */
    key?: { tonic: number; scale: string };
    afterTake?: (take: KeptTake, video: HTMLVideoElement | null) => ReactNode;
  }
  ```
  `RecordVideo` gains the prop `kit?: RecordKit`.

- [ ] **Step 1: View picker.** The Tool group gets **View** (Tool, then each `kit.views[].label`), kept per tool in `musickit.content.view.<tool>`, and shown only when the kit has views. With a kit view picked:
  - Over the camera, the box draws `view.draw(beat)`. The beat is the click's beat while recording to it, else the tool's beat (`beat.current`, polled each animation frame).
  - The live tool stays mounted but hidden, so its clock and Space still work.
  - Over the take, the box draws `view.draw(beatAt(take.overlay.clock, video.currentTime))` each frame, inside the same panel, so Place, Size and Free apply and Export with overlay captures it.
  - With Tool picked, everything is as today.
- [ ] **Step 2: Notes to the readers.** Pass `takeNotes(kit.notes, kit.loopBeats ?? null, take.overlay?.clock ?? clickClock(...), take.seconds)` (memoised) to the take's `NeckView` and `NeckCvView` as `notes`. With no notes, or no clock, pass nothing.
- [ ] **Step 3: `afterTake`** renders under the take's buttons.
- [ ] **Step 4: Check** types and lint, then the record page on the dev server with no kit: no View list shows and the page looks unchanged.
- [ ] **Step 5: Commit** with README: `feat(contentVideos): a tool's kit: views in the tool box, notes for the neck`.

---

### Task 5: The riff page on the shared recorder

**Files:**
- Modify: `src/features/devtools/riff/blocks.ts` (+ `blocks.test.ts`): `riffTool(edit: RiffEdit): PlanTool | null`
- Modify: `src/features/devtools/riff/NoteOverlay.tsx`: `RiffView({ notes, t, mode, grid })`, which fills its container (no `absolute right-2 top-2`); `TakeNotes`, `LiveNote` and `StillNotes` go
- Modify: `src/features/devtools/riff/RiffLab.tsx`: replace `<RiffTake …/>` (line 656) with `RecordVideo` inside `OverlayDrawProvider draw={drawToolOverlay}`, and read `?riff=<id>` to open that riff
- Modify: `src/app/admin/content/videos/record/page.tsx`: a `?block=` whose cell's tool is `guitar-play-along` with `shape.shape === "riff"` redirects to `/admin/content/riff?riff=<block id>` (read the Next.js docs in `node_modules/next/dist/docs/` for `redirect` first)
- Delete: `src/features/devtools/riff/RiffTake.tsx`, `src/features/devtools/riff/takes.ts`, `src/features/devtools/riff/DetectLog.tsx` (moved in Task 3)
- Modify: `src/features/devtools/README.md` Riff maker section, `CLAUDE.md` if it names these files
- Create: `src/features/exercises/play-along/useToolNotes.ts`

**Interfaces:**
- Consumes: `RecordVideo` with `tempo`, `oldTakeKey`, `kit` (Tasks 3–4); `cueNotes`, `fingerFor` (Task 1); `listContentVideos` (`contentVideos/client/api.ts`) for `videos`.
- Produces:
  - `riffTool(edit)`: `{ type: "guitar-play-along", shape: { shape: "riff", key: keySlug(tonic), scale, notes: writeRiff(notes) }, bpm }` read through `TOOLS["guitar-play-along"].parse(raw, { notes: [], stored: true })`.
  - `useToolNotes(tool: PlanTool | null): { notes: KitNote[]; loopBeats: number; keyPc: number } | null`, exported from `useToolNotes.ts`. It builds the timeline and cues as `VideoOverlay` does (export `useTool` and `useCuesOf` from `PlayAlong.tsx` for it), then applies `cueNotes`. `loopBeats = bars * BEATS_PER_BAR`. It returns null for a tool that isn't a play-along.

- [ ] **Step 1: Failing tests** in `blocks.test.ts`:
  - `riffTool` round-trips: `readOverlay({ tool: riffTool(edit), clock: [[0, 0, 1]] })` is not null.
  - `riffChangedSince(edit, { overlay: { tool: riffTool(edit) }, createdAt }, null)` is false, and true after one note's fret changes.
- [ ] **Step 2: Run, expect FAIL.** `…/tsx --test src/features/devtools/riff/blocks.test.ts`
- [ ] **Step 3: Implement `riffTool`, run, expect PASS.**
- [ ] **Step 4: Wire the riff page.** `target = { tool: "guitar-play-along:riff", steps: [], block: { id, cell, title } }`, `drawn = riffTool(editor state)` (unsaved edits included), `children = <Tool tool={drawn} />`, `tempo = { bpm, bars }`, `oldTakeKey = riff id`. Kit:
  - **Views:** Sliding tab, Bar by bar and Chord box, each `RiffView` at `t = beat * 60 / bpm`, with Bars shown kept as today.
  - **Notes:** `useToolNotes(drawn)`, with any missing finger filled by `fingerFor(fret, state.pos)`.
  - **Key:** `{ tonic, scale }`.
  - **afterTake:** Transcribe and Play, moved from the Take panel.

  Keep "How takes work" (the marker printing help) as a `<details>` under the recorder on the riff page. Save for players defaults to This block only.
- [ ] **Step 5: Redirect** riff blocks on the record page.
- [ ] **Step 6: Check:**
  - Tests: `…/tsx --test src/features/devtools/*/*.test.ts src/features/contentVideos/*/*.test.ts`. Then types and lint.
  - On the dev server, `/admin/content/riff`: a riff opens, Place, Size and Free move the tool box, View lists the three riff views, and an old take opens if this browser has one.
  - `/admin/content/videos/record?block=<a riff block>&cell=<n>` lands on the riff page.
  - Report what wasn't checked with a camera.
- [ ] **Step 7: Commit** with the devtools README: `refactor(riff): the riff maker records with the shared recorder`.

---

### Task 6: Extra information layers on the OpenCV reader (pure)

**Files:**
- Modify: `src/features/neckFx/model/cvFx.ts`, `src/features/neckFx/model/cvFrets.test.ts` (or a new `cvFx.test.ts`, added to `package.json`'s `test` glob together with `src/features/neckFx/model/*.test.ts` if they're missing from it)

**Interfaces:**
- Produces:
  - `CvSettings` gains `chords: boolean` (default true), `fingers: boolean` (default false), `next: boolean` (default true), and `labels: "name" | "degree"` (default `"name"`), all read in `readCv`.
  - `NEXT_LEAD_S = 0.6`.
  - `chordsAt(notes: TakeNote[], t: number): { start: number; notes: TakeNote[]; name: string | null }[]`: notes sounding at `t` grouped by equal `start` (to 1 ms), each group named by `chordOf` when it has two or more pitch classes.
  - `comingAt(notes: TakeNote[], t: number, lead = NEXT_LEAD_S): TakeNote[]`: the notes of the next start after `t` (all notes sharing it), when that start is within `lead` seconds; else `[]`.
  - `noteLabel(midi: number, labels: CvSettings["labels"], key?: { tonic: number; scale: string }): string`: the name (`Note.fromMidiSharps` pitch class, with ♯) or the degree from `degreeLabel(pc, makeKeyContext(…))` (`src/features/theory/theory`). With no key it falls back to the name.

- [ ] **Step 1: Failing tests** (Review Focus 5):
  - E5 (string 0 fret 0, string 1 fret 2) at start 1 and A5 at start 2: `chordsAt(notes, 1.1)` is one group named `"E5"`; `comingAt(notes, 1.5)` is the two A5 notes; `comingAt(notes, 1.1)` is `[]` (lead 0.6, next is 0.9 s away).
  - `noteLabel(63, "degree", { tonic: 0, scale: "Aeolian" }) === "b3"` (take the exact symbol from `degreeLabel`'s output); `noteLabel(63, "name") === "D♯"`.
  - `readCv({})` has the four new defaults.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(neckFx): chords, coming next and degree labels (model)`.

---

### Task 7: Drawing the layers

**Files:**
- Modify: `src/features/neckFx/ui/NeckCvView.tsx`, `src/features/neckFx/ui/CvControls.tsx`, `README.md`, `CLAUDE.md`
- Modify: `src/features/contentVideos/ui/RecordVideo.tsx` (pass `kit.key` to `NeckCvView`)

**Interfaces:**
- Consumes: Task 6's helpers. `NeckCvView` gains `keyOf?: { tonic: number; scale: string }`.

- [ ] **Step 1: Load `design:ux-copy` and `teaching-voice`** for the new labels.
- [ ] **Step 2: CvControls** gains **Chord shapes**, **Fingers** and **Coming next** checkboxes, plus a **Labels** list (Note names / Numbers in the key). Numbers in the key is disabled with a title when the page gives no key.
- [ ] **Step 3: NeckCvView, on takes** (live: only what can be known: notes heard and named, fingers not drawn):
  - **Chord shapes:** each `chordsAt` group with two or more notes is drawn as a filled, rounded outline joining its places, with the name over it. This replaces the per-note chord name today.
  - **Coming next:** `comingAt` places drawn as faint hollow dots, with no label.
  - **Fingers:** the note's `finger` as a small number beside its dot.
  - **Labels:** every note label goes through `noteLabel(…, cv.labels, keyOf)`.
- [ ] **Step 4: Check** neckFx and contentVideos tests, types and lint. On the dev server, the riff page's take (or a still picture with markers if you have one) shows the layers switch on and off. Report what wasn't checked without a guitar on camera.
- [ ] **Step 5: Commit** with docs: `feat(neckFx): chord shapes, fingers, coming next and degree labels on takes`.

---

### Task 8: The play-along kit on the record page

**Files:**
- Modify: `src/app/admin/content/videos/record/RecordPage.tsx`

**Interfaces:**
- Consumes: `useToolNotes` (Task 5), `RecordKit` (Task 4).

- [ ] **Step 1:** For `option.tool` of type `guitar-play-along`, pass `kit = { notes, loopBeats }` from `useToolNotes(option.tool)`, plus `key: { tonic: keyPc, scale: "Ionian" }`, unless the shape names its own scale. Pass `tempo = { bpm: tool.bpm, bars: timeline.bars }`. Any other tool gets no kit.
- [ ] **Step 2: Check** types and lint. On the dev server, open `/admin/content/videos/record?tool=guitar-play-along:chord-steps`: Click shows on by default at the tool's tempo. Recording with markers on a guitar is not checkable here; say so.
- [ ] **Step 3: Commit** with README: `feat(contentVideos): play-along notes on the neck on the record page`.
