# Theory course, guitar basics, practice games, shape neighbours

Date: 2026-10-11

## Goal

Turn `/theory` from a set of explorers into a self-learning resource a guitar teacher can point a student at:
a loose course in stages and parallel tracks, a few new pages for the basics and for practice, and better
teaching text in the existing explorers. Cover more with fewer articles. Nothing has to be mastered before
moving on; the order is a suggestion, not a ladder.

Non-goals: accounts, server-side progress, lesson-by-lesson guidance, tabs of copyrighted melodies.

## 1. Navigation and hub

### Mega menu
- The `Theory` link in `SiteNav` opens a panel on hover, click, tap or keyboard focus (Escape closes; works on touch).
- The panel has four columns of blocks. Each block has an icon, a label and a one-line grey description.
  - **Learn**: Start here (hub), Guitar basics
  - **Explore**: Chords, Triads, Scales, Circle of fifths, CAGED, Shape neighbours (anchor on the CAGED page), Arpeggios
  - **Practice**: Fretboard notes, Ear training, Improv
  - **Tools**: Tunings, Cheatsheet builder
- The current page is highlighted in the panel. The second nav row on theory pages is removed and replaced by a
  small breadcrumb (`Theory › Chords`).
- Icons are new inline SVGs in `src/components/Icon.tsx`. No icon library is added.
- `THEORY_LINKS` becomes a grouped structure (group, href, label, description, icon). It is the single source for the
  menu and the hub.

### Hub (`/theory`)
- Replaces the redirect.
- Short intro: rough order, not a ladder; come back any time; meant to be used alone or with a teacher.
- A grid of stages × tracks. Each cell lists its topics in a few words and links to that section of the stage article.
- Under the grid, the same explorer and practice blocks as the menu, each with a slightly longer description.

## 2. Course: stage articles

Four pages: `/theory/stage/1` … `/theory/stage/4`. Each page has three track sections: **Chords**, **Lead** and
**Ear & fretboard**. They sit side by side on wide screens and are stacked on a phone. Each section has an `id` so
that the hub can link to it.

Each track section contains:
- **What to learn**: a chord or concept list with a suggested order.
- **Why**: one short paragraph.
- **Explore**: blocks linking into explorers, with filters preset through URL params.
- **Practise**: links to the note game and ear training, with settings preset through URL params.
- **Songs** (Chords track): 3–5 real songs that use only that stage's chords, with chord names and progression.
  Melodies in tab only for public-domain or traditional tunes.

| Stage | Chords | Lead | Ear & fretboard |
|---|---|---|---|
| 1 · Beginner | Open Em Am C D G E A Dm (suggested order: Em, Am, then the rest) | Single-string melodies in tab (Ode to Joy, When the Saints) | Note names on E/A strings, piano → guitar part 1, ear: major vs minor |
| 2 · Improver | Fmaj7, B7, E7 A7 D7 C7 G7, Em7 Am7, Cadd9, sus2/sus4, power chords | Minor pentatonic box 1, 12-bar blues improv | Chords in a key (I IV V vi), intervals on and across strings, ear: P4 P5 octave |
| 3 · Intermediate | Barre chords (E and A shapes), triads on string sets | Pentatonic in all 5 boxes, major pentatonic | Circle of fifths, relative minor, ear: all intervals |
| 4 · Advanced | CAGED, shape neighbours, 7th, extended and shell voicings | Major scale boxes, arpeggios, modes, harmonic and melodic minor | Mode compare, tunings, cheatsheet |

Melody candidates (public domain): Ode to Joy, When the Saints Go Marching In, House of the Rising Sun,
Scarborough Fair, Greensleeves, Amazing Grace, Happy Birthday.
Chord-only song lists are researched (with Firecrawl) and checked against at least one chord source while
writing the content.

Content is TS data (`src/features/theory/course/stages.ts`) rendered by one `StageArticle` component, so
links, chord chips and tabs are typed rather than free text. Tabs use a small `Tab` component: six-string ASCII-style
grid with a play button that uses the shared sound module.

## 3. Open chords, chord picking, chord search

### Data
- Open chords are added to `SHAPES` with an `open` tag, a fixed root pitch class and a `stage` number. Their
  fingerings use absolute frets including 0. `rootFretFor` returns the fixed position for them and they only match
  their own root.
  - Stage 1: C A G E D, Am Em Dm.
  - Stage 2: Fmaj7, B7, E7, A7, D7, C7, G7, Em7, Am7, Cadd9, Asus2, Dsus2, Dsus4, Esus4.
- Power chords (root on the 6th and 5th strings) are added as normal movable shapes tagged `power`.
- Existing tests that check each fingering against `exp` cover the new shapes.

### Picking the best shape (`shapesForChord` and anything showing "the" shape for a chord)
Order:
1. Open chord for that root, if any
2. First barre: E-shape or A-shape triad, lowest on the neck
3. The rest, in today's order (exact, difficulty, fret, id)

Fixes:
- A triad chord only gets triad shapes (no 7ths, no shells). This removes the R‑7‑3 "C" in "Chords in C major".
- "Exact" means R‑3‑5 for triads, and R‑3‑5‑7 only when the chord is a 7th chord.

### Search
- A text box above the filters in the Chords explorer (Shapes tab), synced to `?q=`.
- If the text parses as a chord symbol with tonal (`C`, `F#m7`, `Bb maj7`, `Dsus4`), the results are every shape
  for that chord, placed at that root and ordered as above.
- Otherwise the text matches shape names, notes and tags (`hendrix`, `shell`, `funk`, `open`).
- Search combines with the tag filters.

## 4. Guitar basics (`/theory/basics`)

- **Basics strip**: string names, 1 fret = 1 semitone, natural notes (no sharp between E–F and B–C), with a piano
  (`ScalePiano`) and a fretboard side by side.
- **Interval viewer**:
  - Interval chips m2 … octave.
  - A piano row lights both keys and shows the semitone count.
  - A fretboard row shows the start note (R) and every place the interval lands within reach: same string
    (N frets), next string (N−5 frets, or N−4 crossing G→B), two strings over (octaves).
  - A start-string selector (E A D G B), with a callout for the G–B shift.
  - Tapping plays the two notes in turn, then together.
- **Text** for M2, P5 and octave: same-string vs across-string shapes, the power chord as the P5 shape, the octave
  patterns (+2 strings +2 frets, +3 strings −3 frets) and their one-fret shift across G–B.
- Pure function `intervalPositions(startString, startFret, semis, tuning)` with tests for the G–B crossing, octave
  patterns and neck edges.

## 5. Practice games

Both games read their settings from URL params so stage articles can link to a preset. Best scores live in
`localStorage` (wrapped in try/catch); there is no other persistence.

### Fretboard note finder (`/theory/notes`)
- Modes:
  - Find the note on a string (default)
  - Find every instance in a fret range
  - Name the lit note (answer chips)
- Answer input: tap the on-screen fretboard, or **Play mode**, which uses the tuner's `detectPitch` / `hzToNote`.
  Play mode accepts any octave once the pitch class is stable for ~150 ms. Mic permission is asked only when Play
  mode is chosen.
- Settings (URL): strings, fret range, naturals only or all, sharp or flat spelling.
- Feedback:
  - A wrong tap names the note actually hit.
  - The target note sounds on each attempt.
  - Streak counter and a 60-second sprint.
  - End-of-round heatmap of slow or missed positions.

### Ear training (`/theory/ears`)
- Intervals: the app plays two notes (rising, falling or harmonic), random root, and you answer from the level's
  interval chips.
- Levels:
  1. P5, octave
  2. M3, m3
  3. P4, M2
  4. m2, M6, m6
  5. m7, M7, tritone
  6. all
  - A custom set can be chosen with chips.
- After each answer, the interval is shown with the basics interval viewer, plus a reference-song hint (song titles
  only).
- Chord-quality mode: major, minor, 7, maj7, m7.
- Feedback: replay button, per-interval accuracy table.

### Shared
- Pure round generators (no immediate repeats, always answerable), a pitch-class matcher for mic input, and scoring,
  all with unit tests.
- Sound goes through the existing `strum` (gap and hold settings).

## 6. CAGED shape neighbours (section on `/theory/caged`, anchor `#neighbours`)

The rule, taught on the page and checked by tests: in the cycle C→A→G→E→D, if I uses shape X in a region, then in
that same region:
- V uses X+2
- IV uses X−2
- vi uses the minor form of X+1
- ii uses the minor form of X−1
- iii uses the minor form of X−2

Example: open position is the C-shape region of C major (C, G, F, Am, Dm, Em).

- Controls: key, I's CAGED shape, and walk ←/→ through the five regions.
- Neck strip: the whole neck with the 4–5 fret window highlighted, and each chord's tones in its own colour.
- Bubble layout (reusing the ChordBubbles style): IV on the left, V on the right, ii/vi/iii in an inner ring. Each
  bubble shows its chord diagram in the window and the name of its shape ("A in G shape").
  - Tap a bubble to play it.
  - "Make this I" re-centres on that chord and keeps the window, so the key moves round the circle without the hand
    moving.
- Toggle "triads in this window": the diatonic triads from the triads data that fit inside the window.
- How it's computed: for each diatonic chord, the box from `caged.ts` that overlaps the window most. A test asserts
  the rule above for 12 keys × 5 shapes. Anything that fails the rule is still drawn correctly.
- Text: the rule in two sentences, plus "try this: I–IV–V–I in all five regions of one key".

## 7. Richer explorer text

Every explorer section gets a short **Why it matters** and a **Try this** (one exercise). Mode compare comes first.
Each group (e.g. augmented tonic chord) explains:
- where its modes come from (major, harmonic minor, melodic minor)
- what the core notes mean for the sound
- what to listen for
- a one-line practice suggestion

Content is kept next to the existing data (e.g. `modeGroups.ts`).

## Build order

1. Open chords, picking fixes, chord search (others link into these)
2. Grouped links, mega menu, hub
3. Guitar basics page and interval viewer
4. Note finder, then ear training (reuses the interval viewer)
5. Shape neighbours
6. Stage articles with researched songs
7. Richer explorer text

Each step ships on its own and keeps `npm test` and the type check green.

## Testing

- Unit tests for every pure function named above (shape picking, search parsing, interval positions, round
  generators, pitch matcher, neighbour rule).
- Existing fingering tests extended to open and power chords.
- Manual check in the browser of the menu (hover, tap, keyboard), mobile layout, mic flow.
