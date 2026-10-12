# Theory Course Parts 2–7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the rest of the theory course from the spec:
- a mega menu and a hub page
- the guitar basics page with intervals on piano and guitar
- the fretboard note game and ear training
- CAGED shape neighbours
- four stage articles with songs and melodies
- richer teaching text in the explorers

**Architecture:**
- Every new behaviour is a pure TS module under `src/lib/` or `src/features/theory/`, tested with node:test.
- Pages are thin `PageShell` wrappers around client components.
- One data file (`src/features/theory/sections.ts`) lists every theory page. The menu, the hub and the breadcrumb all read it.
- Course content is typed data (`src/features/theory/course/`) rendered by one component.

**Tech Stack:** Next 16 app router (async `params`/`searchParams`, as in `src/app/theory/scales/[slug]/page.tsx`), React 19, TypeScript, Tailwind, `@tonaljs/tonal`, the in-repo sound module (`strum`, `playMelody`, `playSequence`), and node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-10-11-theory-course-design.md`, sections 1, 2, 4, 5, 6 and 7. Section 3 shipped already.

**Execution note:** your human partner asked for planning and execution in one go, with a merge at the end, and will check the result. This plan therefore fixes interfaces, files and test cases exactly. Component markup is described, not written out in full; the implementer writes it in the style of the surrounding components.

## Global Constraints

- Tests: `T=~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx; $T --test <files>` (`npx tsx` hangs). The full suite is `package.json`'s `test` script with `npx tsx` replaced by `$T`.
- **New test globs:**
  - Add `src/lib/practice/*.test.ts` and `src/features/theory/course/*.test.ts` to `package.json`'s `test` script.
  - `src/lib/chordKit/*.test.ts` and `src/features/theory/*.test.ts` are already in it.
- Type check: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` prints nothing. Lint: `npx eslint <changed files>` has no new errors.
- Dev server from a worktree: `npx next dev --webpack -p 3311`. Turbopack rejects a symlinked `node_modules`.
- Icons: Lucide SVG inner markup copied into `src/components/Icon.tsx` (ISC licence, as the file says). Source: `https://unpkg.com/lucide-static@0.460.0/icons/<name>.svg`.
- **Copy rules** (spec):
  - Melodies in tab are only public-domain or traditional tunes.
  - Famous songs are listed by title and chord names only.
  - The rough order is not a ladder; nothing has to be mastered.
- **Concurrency:** other sessions push to `main`. After each part, `git pull --rebase` then push (memory: `vercel-status-without-gh`). Check deploy with `curl -s https://api.github.com/repos/ppciesiolkiewicz/musickit/commits/main/status`.
- **Commits:** one or more per part. Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage only this plan's files.

## Review Focus

1. **Menu on touch and keyboard.** The panel must open on tap and on Enter/Space, close on Escape and on an outside click, and never trap focus. A hover-only menu is unusable on a phone.
2. **Mic flow in the note game.**
   - Permission denied, no mic, or a page left mid-listen. Each must leave a usable tap mode and must release the stream (stop its tracks on unmount).
   - A held note must not score twice.
3. **Game question generators with tiny settings.** One string, a fret range of 0–0, or a level with one interval must never loop forever or repeat the same question when another exists.
4. **Neighbour rule near the top of the neck.** A box above fret 12 can lose its neighbours to `NECK_END`. The view must still show the correct chord, or say it is off the neck. It must not crash.
5. **URL params from links.** Bad or missing `?strings=`, `?level=`, `?from=` and `?to=` fall back to defaults; they never throw.

---

## Part 2: Theory sections, mega menu, hub

### Task 2.1: Sections data

**Files:**
- Create: `src/features/theory/sections.ts`
- Create: `src/features/theory/sections.test.ts`

**Produces:**

```ts
export type SectionGroup = "learn" | "explore" | "practice" | "tools";
export interface TheorySection { href: string; label: string; desc: string; icon: IconName; group: SectionGroup }
export const GROUP_LABEL: Record<SectionGroup, string>; // Learn, Explore, Practice, Tools
export const THEORY_SECTIONS: TheorySection[];
export function sectionFor(path: string): TheorySection | undefined; // longest href prefix match, ignoring #hash; "/theory" only for exactly "/theory"
```

**Contents, in order:**
- **learn:**
  - `/theory` Start here: "The course: stages, tracks, songs"
  - `/theory/basics` Guitar basics: "Piano → guitar: notes and intervals"
- **explore:**
  - `/theory/chords` Chords: "Open chords and every movable shape"
  - `/theory/triads` Triads: "Three-note shapes on string sets"
  - `/theory/scales` Scales: "Every mode, its chords and boxes"
  - `/theory/circle` Circle of fifths: "Keys, relatives, neighbours"
  - `/theory/caged` CAGED: "One chord, five shapes up the neck"
  - `/theory/caged#neighbours` Shape neighbours: "I IV V ii vi without moving your hand"
  - `/theory/arpeggios` Arpeggios: "Chord tones across the neck"
- **practice:**
  - `/theory/notes` Fretboard notes: "Find the note, tap or play it"
  - `/theory/ears` Ear training: "Name the interval you hear"
  - `/theory/improv` Improv: "Play over a groove"
  - `/theory/drone` Drone: "Hear each degree against the root"
- **tools:**
  - `/theory/tunings` Tunings: "Alternate tunings"
  - `/cheatsheet` Cheatsheet: "Build your own reference sheet"

**Tests:**
- Every href is unique.
- Every group is non-empty.
- Every non-hash href except `/cheatsheet` and `/theory` has a directory `src/app<href>` (check with `fs.existsSync`). This fails until Parts 3–4 create `basics`, `notes` and `ears`, so only assert it for hrefs not in `["/theory/basics", "/theory/notes", "/theory/ears"]`. Remove that exclusion in Task 4.3.
- `sectionFor` cases:
  - `sectionFor("/theory/chords")` → label Chords
  - `sectionFor("/theory/scales/dorian")` → Scales
  - `sectionFor("/theory")` → Start here
  - `sectionFor("/tuner")` → undefined

### Task 2.2: Icons, mega menu, breadcrumb

**Files:**
- Modify: `src/components/Icon.tsx`. Add these Lucide icons: `graduation-cap`, `book-open`, `guitar`, `grid-3x3`, `triangle`, `waves`, `circle-dot`, `layers`, `network`, `spline`, `target`, `ear`, `audio-lines`, `sliders-horizontal`, `file-text`. Fetch each one's inner markup from unpkg.
- Create: `src/components/TheoryMenu.tsx` (`"use client"`).
- Modify: `src/components/SiteNav.tsx`:
  - Replace the "Theory articles" `NavLink` with `<TheoryMenu active={active} />`.
  - Delete the second-row `THEORY_LINKS` nav.
  - Render a breadcrumb when `sectionFor(active)` exists and `active !== "/theory"`: `Theory › <label>` (Theory links to `/theory`).
  - Delete `THEORY_LINKS`.

**TheoryMenu behaviour:**
- A button labelled "Theory" with `aria-expanded` and `aria-controls`.
- It opens on `pointerenter` (mouse only: `e.pointerType === "mouse"`), on click, and on Enter/Space.
- It closes on `pointerleave` after 150 ms, on Escape (focus returns to the button), on an outside `pointerdown`, and on route change (closes on link click).
- The panel is absolute, full nav width, and shows four columns, one per `GROUP_LABEL`. On phones it shows one column and scrolls.
- Each block is a `Link` with its icon, the label, and `desc` in small grey text. The current page gets the sky highlight. `/theory` is current only on exact match.
- The button shows as current when `active` starts with `/theory`.

**Test:** behaviour is checked manually (see the Review Focus). Logic stays in `sectionFor`, which is already tested.

### Task 2.3: Course outline data and the hub page

**Files:**
- Create: `src/features/theory/course/outline.ts`
- Create: `src/features/theory/course/outline.test.ts`
- Modify: `src/app/theory/page.tsx` (the hub replaces the redirect)
- Create: `src/components/theory/TheoryHub.tsx`

**Produces:**

```ts
export type TrackId = "chords" | "lead" | "ear";
export const TRACKS: { id: TrackId; label: string; desc: string }[]; // Chords (rhythm), Lead (melody, scales), Ear & fretboard (theory)
export interface StageOutline { n: 1 | 2 | 3 | 4; title: string; level: string; cells: Record<TrackId, string[]> }
export const STAGES: StageOutline[]; // the spec table, one short topic per string
export const stageHref = (n: number, track?: TrackId) => `/theory/stage/${n}${track ? `#${track}` : ""}`;
```

**Stages:**
1. Beginner
2. Improver
3. Intermediate
4. Advanced

The cells copy the spec's stage table exactly, split into short topic strings.

**Tests:**
- There are 4 stages numbered 1 to 4.
- Every stage has all three tracks with at least one topic.
- `stageHref(2, "lead") === "/theory/stage/2#lead"`.

**Hub:**
- Title "Theory". The intro paragraph comes from spec §1, including "Rough order, not a ladder. Nothing has to be mastered before you move on; come back any time."
- A grid with stages as rows and tracks as columns. Each cell links to `stageHref`. On a phone each stage becomes one card.
- Then the section blocks for each group (explore, practice, tools), reusing the menu block component. Export `SectionBlock` from `TheoryMenu.tsx` for this.

**Commit and push after Part 2.**

---

## Part 3: Guitar basics

### Task 3.1: Interval maths

**Files:**
- Create: `src/lib/chordKit/intervals.ts`
- Create: `src/lib/chordKit/intervals.test.ts`

**Produces:**

```ts
export interface IntervalInfo { semis: number; short: string; name: string; song: string }
export const INTERVALS: IntervalInfo[]; // 1..12
export interface IntervalPos { string: number; fret: number; strings: number; frets: number; gb: boolean }
export function intervalPositions(startString: number, startFret: number, semis: number, maxFret = 15): IntervalPos[];
export function describeMove(p: IntervalPos): string;
```

**`INTERVALS`:**

| semis | short | name | song |
|---|---|---|---|
| 1 | m2 | minor 2nd | Jaws |
| 2 | M2 | major 2nd | Happy Birthday |
| 3 | m3 | minor 3rd | Greensleeves |
| 4 | M3 | major 3rd | When the Saints |
| 5 | P4 | perfect 4th | Here Comes the Bride |
| 6 | TT | tritone | The Simpsons |
| 7 | P5 | perfect 5th | Star Wars |
| 8 | m6 | minor 6th | The Entertainer (opening leap) |
| 9 | M6 | major 6th | My Bonnie |
| 10 | m7 | minor 7th | Somewhere (West Side Story) |
| 11 | M7 | major 7th | Take On Me (chorus leap) |
| 12 | P8 | octave | Somewhere Over the Rainbow |

**`intervalPositions`:**
- Strings are 0 = low E … 5 = high e. Standard tuning uses `OPEN_PITCH` from `shapeTools`.
- It returns every position on `startString` or a higher string where `OPEN_PITCH[s] + fret === OPEN_PITCH[startString] + startFret + semis`, `0 <= fret <= maxFret`, and `|fret - startFret| <= 5`.
- `strings` is `s - startString`. `frets` is `fret - startFret`. `gb` is true when `startString <= 3 && s >= 4`, meaning the path crosses from G to B.
- Results are sorted by string.

**`describeMove`:**
- `strings === 0`: "same string, N frets up"
- Otherwise: "1 string over, 2 frets up", "2 strings over, 2 frets up" or "3 strings over, 3 frets back", with " (crosses G–B)" added when `gb`.

**Tests:**
- P5 from low E fret 3 (G) includes `{string:0, fret:10}` and `{string:1, fret:5, frets:2}`.
- An octave from A string fret 3 includes `{string:3, fret:5, strings:2, frets:2, gb:false}`.
- An octave from D string fret 5 to the B string: `{string:4, fret:8, strings:2, frets:3, gb:true}` (the G–B shift).
- An octave from low E fret 5 includes `{string:3, fret:2, strings:3, frets:-3}`.
- M2 from low E fret 0 includes the same-string fret 2.
- Nothing is returned beyond `maxFret` or below 0.
- `describeMove` text matches for those cases.

### Task 3.2: Mini piano, interval fretboard, viewer, page

**Files:**
- Create: `src/components/theory/MiniPiano.tsx`. An SVG of two octaves from C3 to B4. It takes `lit: { midi: number; label: string; colour: string }[]` and `onKey?(midi)`. White and black keys are positioned by pitch class.
- Create: `src/components/theory/IntervalViewer.tsx` (`"use client"`):
  - Interval chips.
  - Start-string chips E A D G B.
  - A start fret stepper from 0 to 7. The default start is A string, fret 3 (C).
  - A MiniPiano lighting the start note (R) and the target, with a caption: "{semis} semitones = {semis} frets on one string".
  - A fretboard from frets 0 to 12 (`fretGeometry`, `FretboardBase`). It shows the start dot R and every `intervalPositions` dot. Same-string dots are filled; dots on other strings are outlined, each with its `describeMove` in a list underneath.
  - A play button that plays the notes in turn (`playMelody([a, b], 450)`), then together (`strum([a, b], { gapMs: 0 })` after 1000 ms).
  - The G–B callout, shown when any listed position has `gb`.
- Create: `src/app/theory/basics/page.tsx`, a PageShell with title "Guitar basics". It contains:
  - A **Basics** text block: string names E A D G B e, "1 fret = 1 semitone", the natural notes with no sharp between E–F and B–C, and a MiniPiano with C D E F G A B lit next to a fretboard of the natural notes on the low E string, frets 0–12.
  - The **Interval viewer**.
  - A **Jumps worth knowing** block with short paragraphs on M2, P5 (the power-chord shape) and the octave (two patterns and the G–B shift), each with a button that sets the viewer to that interval. Lift the viewer state to the page client component `BasicsArticle` for this.

**Commit and push after Part 3.**

---

## Part 4: Practice games

### Task 4.1: Note game logic

**Files:**
- Create: `src/lib/practice/noteGame.ts`
- Create: `src/lib/practice/noteGame.test.ts`
- Modify: `package.json` (test glob)

**Produces:**

```ts
export type NoteMode = "find" | "every" | "name";
export interface NoteSettings { mode: NoteMode; strings: number[]; from: number; to: number; naturals: boolean; flats: boolean }
export const DEFAULT_NOTE_SETTINGS: NoteSettings; // find, strings [0,1], 0..12, naturals true, flats false
export function parseNoteSettings(q: URLSearchParams): NoteSettings; // strings=E,A or 0,1; from; to; naturals=0/1; flats=0/1; mode; bad values fall back field by field; from<=to clamped to 0..15
export function noteSettingsQuery(s: NoteSettings): string;
export const pcName: (pc: number, flats: boolean) => string;
export interface NoteQuestion { pc: number; string: number; fret?: number } // fret set only for "name" mode
export function nextNoteQuestion(s: NoteSettings, rand: () => number, prev?: NoteQuestion): NoteQuestion; // never equals prev when any other question exists
export function positionsOf(pc: number, s: NoteSettings): { string: number; fret: number }[]; // within strings and from..to
export function isCorrect(q: NoteQuestion, s: NoteSettings, string: number, fret: number): boolean; // find: right pc on q.string; every: right pc on any allowed string
export function stablePitch(readings: { midi: number; t: number }[], holdMs?: number): number | null; // pitch class held (same pc) for >= holdMs (default 150) at the end of the list, else null
export interface Heat { [key: string]: { tries: number; misses: number; ms: number } } // key `${string}:${fret}`
export function recordHeat(h: Heat, string: number, fret: number, ok: boolean, ms: number): Heat;
```

`nextNoteQuestion` picks only pcs that exist in `positionsOf` for the chosen string. With naturals on, it only picks natural pcs.

**Tests:**
- Defaults and parsing:
  - `strings=E,A` → [0,1]
  - `strings=9` → the default
  - `from=8&to=3` → swapped or clamped so that from <= to
- 200 questions with a seeded rand:
  - Every one is answerable (`positionsOf` is non-empty on its string).
  - None equals the previous one.
  - All are natural when `naturals` is on.
- The one-string, fret 0–0 setting returns a question and does not hang. It is allowed to repeat when it is the only option.
- `isCorrect`: the right fret on the right string is true, the wrong string is false in "find" mode, and in "every" mode any string is true.
- `stablePitch`:
  - Readings 0..200 ms all on midi 55 → 7.
  - Mixed readings ending in a 100 ms run → null.
  - Octave-different midis 43 and 55 count as the same pc.
- `recordHeat` accumulates.

### Task 4.2: Ear game logic

**Files:**
- Create: `src/lib/practice/earGame.ts`
- Create: `src/lib/practice/earGame.test.ts`

**Produces:**

```ts
export const EAR_LEVELS: { n: number; label: string; semis: number[] }[]; // 1:[7,12] 2:[4,3] 3:[5,2] 4:[1,9,8] 5:[10,11,6] 6:[1..12]
export type Direction = "up" | "down" | "together";
export interface EarSettings { level: number; custom: number[] | null; direction: Direction; kind: "interval" | "chord" }
export function parseEarSettings(q: URLSearchParams): EarSettings; // level=1..6, set=7,12, dir, kind; bad → defaults (level 1, up, interval)
export const activeSemis: (s: EarSettings) => number[]; // custom or level semis; levels > 1 include the previous levels' semis, so level 3 = [7,12,4,3,5,2]
export const CHORD_QUALITIES: { id: string; label: string; semis: number[] }[]; // major, minor, 7, maj7, m7
export interface EarQuestion { root: number; answer: string; midi: number[]; together: boolean } // answer = interval short or chord id
export function nextEarQuestion(s: EarSettings, rand: () => number, prev?: EarQuestion): EarQuestion; // root midi 48..64; down: second note below; answer differs from prev.answer when more than one answer exists
export interface Score { [answer: string]: { right: number; total: number } }
export function recordScore(sc: Score, answer: string, ok: boolean): Score;
```

**Tests:**
- Levels are cumulative.
- `parseEarSettings` handles bad input.
- 200 questions:
  - Every answer is in the active set.
  - `midi[1] - midi[0]` equals the interval's semis for "up", and the negative for "down".
  - No immediate repeat when more than one answer exists.
- A single-interval custom set does not hang.
- Chord kind produces `midi.length === semis.length` and `together: true`.

### Task 4.3: Game pages

**Files:**
- Create: `src/components/practice/NoteGame.tsx`
- Create: `src/components/practice/EarGame.tsx`
- Create: `src/components/practice/useMicPitch.ts`
- Create: `src/app/theory/notes/page.tsx`
- Create: `src/app/theory/ears/page.tsx`
- Modify: `src/features/theory/sections.test.ts` (drop the exclusion)

**Shared behaviour:** both games read settings once on mount from `window.location.search`, using `useSyncExternalStore` like `ShapesTab`. They write changes back with `history.replaceState`.

**NoteGame:**
- Settings bar: mode chips, string chips (E A D G B e), from/to steppers, naturals and flats toggles, and an input switch between "Tap" and "Play (mic)".
- The prompt: "Find G on the A string", or for "every" mode "Find every G (0–12)". In name mode a fretboard dot is lit and the answer is chosen from 12 name chips.
- The fretboard is `FretboardBase` over the range. Tapping a cell checks the answer.
- On a miss it shows "That was F♯", flashes red, and plays the note hit.
- On a hit it flashes green, plays the target, and moves to the next question.
- "every" mode continues until all positions are found.
- A streak counter, a "60-second sprint" button with a count, and a best score in localStorage (wrapped in try/catch).
- A heatmap toggle shades cells by miss rate and average time.

**`useMicPitch(enabled)`:**
- Calls `getUserMedia({ audio: true })` and uses an `AnalyserNode` with `detectPitch` and `hzToNote` from `@/features/tuner` on `requestAnimationFrame`.
- Keeps the last ~400 ms of `{ midi, t }`. Returns `{ status: "off" | "asking" | "on" | "denied" | "error", readings }`.
- Stops every track and closes the context on disable or unmount.
- The game answers in Play mode when `stablePitch` matches the target. After a hit it ignores readings for 600 ms so a sustained note can't score twice.

**EarGame:**
- Settings: level chips, a custom chip set, direction chips, and a kind switch between Intervals and Chord quality.
- "Play" plays the question. Single notes use `playMelody`; together and chord kinds use `strum(midi, { gapMs: 0 })`.
- "Replay" and answer chips for the active set.
- After an answer:
  - It shows right or wrong.
  - For intervals it shows the song hint, a MiniPiano with both keys lit, and a "show on guitar" link to `/theory/basics?interval=<semis>`. The basics page reads `?interval` and sets the viewer.
- A per-answer accuracy table.

**Pages:** titles "Fretboard notes" and "Ear training". The intros say what the game trains and how to use it with a teacher (set it up, then share the URL).

**Commit and push after Part 4.**

---

## Part 5: CAGED shape neighbours

### Task 5.1: Neighbour maths

**Files:**
- Create: `src/lib/chordKit/neighbours.ts`
- Create: `src/lib/chordKit/neighbours.test.ts`

**Produces:**

```ts
export const NEIGHBOUR_DEGREES: { roman: string; degree: number; quality: CagedQuality }[]; // IV, I, V, ii, vi, iii in that grid order
export interface Neighbour { roman: string; name: string; rootPc: number; quality: CagedQuality; box: CagedBox | null; letter: CagedLetter | null }
export function regionOf(rootPc: number, letter: CagedLetter): { from: number; to: number } | null; // the I box with that letter (cagedBoxes(rootPc, "major"))
export function neighbours(rootPc: number, letter: CagedLetter): Neighbour[]; // for each degree: the cagedBoxes(chordRoot, quality) box with max overlap with the region (ties → lower lo); box null when no overlap
export function ruleLetter(iLetter: CagedLetter, roman: string): CagedLetter; // V +2, IV −2, vi +1, ii −1, iii −2, I +0 in C A G E D order
```

**Tests:**
- C major with C shape gives: IV F in E shape, I C in C shape, V G in G shape, ii Dm in D shape, vi Am in A shape, iii Em in E shape.
- D major with C shape: V is A in the G shape (the user's example).
- For all 12 keys × 5 letters where the region's `to <= 12`, each neighbour's letter equals `ruleLetter`. A key/letter pair where the rule fails because of the neck edge is skipped by that guard. If any case inside the guard fails, record it in the ledger and assert the box still plays the right chord instead.
- Every non-null neighbour box plays the right pitch classes.

### Task 5.2: Neighbours view on the CAGED page

**Files:**
- Create: `src/components/chordKit/NeighboursView.tsx`
- Modify: `src/app/theory/caged/page.tsx` (render it below the explorer, wrapped in `<section id="neighbours">`)

**View:**
- Controls: key chips (12 major keys), I-shape chips C A G E D, and walk ←/→ buttons that move to the previous or next letter in neck order.
- **Neck strip:** frets 0–17 using `FretboardBase`. A translucent window rect over the region. Dots for each neighbour box's notes in the neighbour's colour. The chord tones of the selected bubble are drawn larger.
- **A 2×3 grid laid out like the circle of fifths:**
  - Top row: IV, I, V. Bottom row: ii, vi, iii.
  - Each bubble shows the roman numeral, the chord name, "<letter> shape", and a `ChordDiagram` (`box.shape` at `box.rootFret`).
  - Tap a bubble to strum it and select it.
  - IV and V get a "make this I" button. It sets the key to that chord's root and keeps the region by choosing the letter whose region overlaps the current one most.
  - A bubble whose box is null says "off the neck here".
- **Toggle "triads in this window":** for the selected chord, list the `triadVoicings` (all three string groups the triads module defines, all inversions) whose frets all fall inside the region. Each one is a small text line (group, inversion, frets), and tapping a line strums it. If there are none, say so.
- **Text:**
  - The rule in two sentences, with the open-position example.
  - "Try this: play I–IV–V–I in all five regions of one key, walking ← → between them."

**Commit and push after Part 5.**

---

## Part 6: Stage articles

### Task 6.1: Tab positions

**Files:**
- Create: `src/lib/chordKit/tab.ts`
- Create: `src/lib/chordKit/tab.test.ts`

**Produces:**

```ts
export interface MelodyNote { note: string; beats: number } // note like "E4"
export interface TabNote { string: number; fret: number; beats: number; midi: number }
export function tabFor(notes: MelodyNote[], position = 0): TabNote[];
```

**`tabFor` rules:**
- For each note, take the midi via tonal `Note.midi`. Choose among the strings whose fret lies in `[position, position + 4]`, falling back to any fret from 0 to 15.
- Prefer the highest string that keeps the fret inside the window. Lowest fret breaks ties.
- Throw on a note no string can reach.

**Tests:**
- `E4` at position 0 → high e string, fret 0.
- `C4` at position 0 → B string, fret 1.
- `D5` at position 5 → high e, fret 10.
- Every output's `OPEN_MIDI[string] + fret` equals the midi.
- `C2` throws.

### Task 6.2: Stage content

**Files:**
- Create: `src/features/theory/course/stages.ts`
- Create: `src/features/theory/course/stages.test.ts`

**Produces:**

```ts
export interface CourseLink { href: string; label: string; note?: string }
export interface Song { title: string; artist: string; chords: string[]; progression: string; note?: string }
export interface Melody { title: string; origin: string; position: number; notes: MelodyNote[] }
export interface Track { id: TrackId; learn: string[]; why: string; explore: CourseLink[]; practise: CourseLink[]; songs?: Song[]; melodies?: Melody[]; tip?: string }
export interface Stage { n: 1 | 2 | 3 | 4; title: string; level: string; intro: string; tracks: Track[] }
export const STAGE_CONTENT: Stage[];
```

**Content** (per the spec table; links use `stageHref`-style hrefs, preset URLs and `?q=` searches):

Stage 1, Beginner:
- **Chords:** Em, Am, C, D, G, E, A, Dm in that order.
  - Explore: `/theory/chords?q=open`, plus `?q=Em` and similar.
  - Practise: one-minute changes. Count clean switches between two chords in 60 s, for these pairs: Em↔Am, Am↔C, C↔G, G↔D, D↔A, A↔E, E↔Am, Dm↔Am.
  - Songs (chords only):
    - Knockin' on Heaven's Door (Bob Dylan): G D Am / G D C
    - Leaving on a Jet Plane (John Denver): G C D
    - Bad Moon Rising (CCR): D A G
    - Sweet Home Alabama (Lynyrd Skynyrd): D C G
    - Zombie (The Cranberries, simplified): Em C G D
    - Wild Thing (The Troggs): A D E
- **Lead:**
  - Single-string melodies: Ode to Joy (traditional, Beethoven), position 0, on the B and e strings: E E F G G F E D C C D E E D D. When the Saints Go Marching In (traditional): C E F G, C E F G, C E F G E C E D.
  - Practise: `/theory/notes?strings=e,B&naturals=1`.
- **Ear & fretboard:**
  - Note names on the E and A strings: `/theory/notes?strings=E,A&naturals=1`.
  - Piano → guitar part 1: `/theory/basics`.
  - Ear: major vs minor, `/theory/ears?kind=chord`, then `/theory/ears?level=1`.

Stage 2, Improver:
- **Chords:** Fmaj7, B7, E7, A7, D7, C7, G7, Em7, Am7, Cadd9, Asus2, Dsus2, Dsus4, Esus4, and power chords E5/A5.
  - Songs:
    - Good Riddance (Green Day): G Cadd9 D Em
    - Wonderwall (Oasis, capo 2 shapes): Em7 G Dsus4 A7sus4 Cadd9
    - Free Fallin' (Tom Petty): D Dsus4 A
    - Johnny B. Goode-style 12-bar: A7 D7 E7
    - Smoke on the Water riff: power chords G5 B♭5 C5 (title only)
- **Lead:**
  - Minor pentatonic box 1: `/theory/scales/aeolian` (scales page), pentatonic tip.
  - 12-bar blues improv in A: `/theory/improv`.
  - Melody: House of the Rising Sun (traditional), chords Am C D F Am C E. Tab omitted; spec allows chords only.
- **Ear & fretboard:**
  - Chords in a key I IV V vi: `/theory/chords` In a key tab, `/theory/circle`.
  - Intervals on and across strings: `/theory/basics?interval=7`.
  - Ear: `/theory/ears?level=3`.
  - Notes on all six strings: `/theory/notes?strings=E,A,D,G,B,e&naturals=1`.

Stage 3, Intermediate:
- **Chords:** E-shape and A-shape barres (F, B♭, Bm, F♯m, Cm) and triads on string sets (`/theory/triads`).
  - Songs:
    - Let It Be (The Beatles): C G Am F
    - House of the Rising Sun: Am C D F E
    - Creep (Radiohead): G B C Cm
    - Hotel California (Eagles): Bm F♯ A E G D Em F♯
- **Lead:** pentatonic in all five boxes plus major pentatonic (`/theory/scales`, `/theory/caged`).
  - Melody: Scarborough Fair (traditional, Dorian), position 5: D4 D4 A4 A4 A4 E4 F4 E4 D4, then A4 C5 D5 C5 A4 B4 G4 A4.
- **Ear & fretboard:**
  - Circle of fifths and relative minor (`/theory/circle`).
  - Ear: `/theory/ears?level=6`.
  - Notes, all notes, frets 0–12: `/theory/notes?naturals=0&mode=every`.

Stage 4, Advanced:
- **Chords:** CAGED (`/theory/caged`), shape neighbours (`/theory/caged#neighbours`), 7th / extended / shell voicings (`/theory/chords?q=shell`, `?q=jazz`).
  - Songs:
    - Autumn Leaves (standard): Cm7 F7 B♭maj7 E♭maj7 Am7♭5 D7 Gm
    - Fly Me to the Moon (standard): Am7 Dm7 G7 Cmaj7 Fmaj7 Bm7♭5 E7
    - Oye Como Va (Santana): Am7 D9
- **Lead:**
  - Major scale boxes and arpeggios (`/theory/scales`, `/theory/arpeggios`).
  - Modes and mode compare, harmonic and melodic minor (`/theory/scales`).
  - Melody: Greensleeves (traditional), position 5: A4 C5 D5 E5 F5 E5 D5 B4 G4 A4 B4 C5 A4 A4 G♯4 A4 B4 G♯4 E4.
- **Ear & fretboard:**
  - Mode compare (`/theory/scales`), tunings (`/theory/tunings`), drone (`/theory/drone`), cheatsheet (`/cheatsheet`).
  - Ear: chord quality with 7ths, `/theory/ears?kind=chord`.

Before committing, verify the song chord lists with Firecrawl: search "<song> chords" for each of the 4–6 songs per stage, and fix any wrong chord in the data. Record anything changed in the ledger.

**Tests:**
- 4 stages, each with the three track ids.
- Every melody's `tabFor` succeeds.
- Every internal href's path (before `?` or `#`) is a `THEORY_SECTIONS` href or starts with one, or is `/theory/stage/n`.
- Every chord in Stage 1 songs is in the stage 1 open set: Em Am C D G E A Dm.

### Task 6.3: Stage page

**Files:**
- Create: `src/app/theory/stage/[n]/page.tsx`. Static params are 1–4. `notFound` otherwise. Metadata title "Stage n: <title>".
- Create: `src/components/theory/StageArticle.tsx`
- Create: `src/components/theory/Tab.tsx`

**StageArticle:**
- A header with the stage title and level, the intro, and the "rough order, not a ladder" line.
- Prev and next stage links, and a link back to the hub.
- Three track sections with `id={track.id}`: side by side at `xl`, stacked below that.
- Each section contains:
  - learn: chips
  - why: a paragraph
  - explore: link blocks
  - practise: links
  - songs: a table of title, artist, chords and progression; each chord is a link to `/theory/chords?q=<chord>`
  - melodies: a `Tab`
  - tip

**Tab:**
- Six text rows `e B G D A E` with frets placed in columns sized by beats, rendered as monospace SVG text.
- A play button: `playSequence` with `beat = 450ms`, using midi from `tabFor`.

**Commit and push after Part 6.**

---

## Part 7: Richer explorer text

### Task 7.1: Mode-group teaching

**Files:**
- Modify: `src/features/theory/modeGroups.ts`
- Modify: `src/features/theory/modeGroups.test.ts` (create it if missing; otherwise add to `chordKit.test.ts`'s mode group suite)
- Modify: `src/components/chordKit/ModeCompare.tsx`

**Data:** add `teach: { from: string; sound: string; listen: string; practise: string }` to each `ModeGroup`. Write real text per group (major, harmonic minor, melodic minor, plus each tonic-chord group). For example, the augmented group:
- **from:** Augmented 1–3–♯5 never occurs in the major scale. It appears only in harmonic minor (its 3rd mode, Ionian ♯5) and melodic minor (its 3rd mode, Lydian augmented), which is why there are so few.
- **sound:** The ♯5 pulls up to the 6 and makes the tonic restless, dreamlike and unresolved.
- **listen:** Listen for the raised 5th rubbing against the root's natural 5th you expect.
- **practise:** Hold a drone on the root and play 1–3–♯5–3 slowly, then resolve ♯5 → 6.

**Test:** every group has non-empty `teach` fields.

**ModeCompare:**
- Under the "why" line, render a four-item definition list: Where it comes from, How it sounds, Listen for, Try this.
- Fix the core-note circle for the root. The text is invisible on the light root colour (screenshot), so give the circle a `ring-1 ring-slate-500` and always dark text `#0f172a`.

### Task 7.2: Why / try blocks on explorer pages

**Files:**
- Create: `src/components/theory/Lesson.tsx`: `<Lesson why="…" tryThis="…" stage={n} />`, a two-column small card with a "Part of stage n" link.
- Modify each explorer page under `src/app/theory/`: chords, triads, scales, circle, caged, arpeggios, improv, tunings, drone. Each renders a `Lesson` at the top of its children, with one short "why it matters" and one "try this" sentence pair written for that page.

**Test:** none (static copy). Type check and lint only.

**Commit, push, and check the deploy after Part 7.**
