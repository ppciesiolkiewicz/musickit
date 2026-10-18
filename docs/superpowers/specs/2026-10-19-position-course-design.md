# Position course: learn the neck one position at a time

Date: 2026-10-19

## Intent

The current course (`/theory/stage/1…4`, three fixed tracks per stage) is organised by difficulty. The new course is
organised by **where your hand is**. The student spends a long time in one position, the open position in E minor /
G major, and learns many ideas there before moving on: the chords, triads, 5ths, arpeggios, the scale, and how the
chords connect. Each note gets a name in three systems at once: its scale degree (1, 4, 5), its solfège syllable
(Do, Fa, Sol) and its place on piano and guitar.

The student should come out of the position 1 stages able to:
- play the chords of the key in position 1 as full chords, triads and 5ths
- play each chord's arpeggio and name every note by degree and by solfège
- move between chords along the 1 → 4 → 5 → 1 path and understand why it works (circle of fifths)
- solo over Em ↔ Am in the same position
- move the whole position to another key (the same shape three frets up is G minor)

Then the course grows outward: position 2, colour chords back in position 1, the remaining CAGED positions, modes,
and other keys.

The new course **replaces** the old one. The old stages stay online, untouched, as reference until the user removes
them.

## Goals

- A new course at `/course`, made of stages; each stage is made of sections, as many as its material needs.
- Each section is its own page and route. A floating section panel switches between them.
- Fretboard pictures can draw **paths**: static arrows from note to note, to illustrate simple ideas.
- Lesson content for every stage listed below, written in the voice of the existing course (plain, short, practical).

## Non-goals

- No accounts, no saved progress (same as the old course).
- No animated or audio-synced paths. Paths are still pictures.
- No changes to the existing explorers beyond what the course needs to link into them.
- No removal of the old course in this project.

## Anti-goals

- Theory without the hand: every idea is shown on the neck in the position being studied, not as abstract lists.
- Jumping around the neck early. Stages 0–3 stay in positions 1 and 2.
- Barre chords as a wall. The barre is presented as hard, with easier substitutes and drop 3 chords as the way in.

## Musical spine

**Key: E minor / G major for stages 0–5.** The major side's 1-4-5 (G, C, D) is all open chords. The minor side's 5 is
Bm, the hard chord, which is exactly the barre lesson. B7 is an open-chord stand-in for that 5.

**Positions are CAGED shapes of G.** "Position 1" = frets 0–3 (G shape, plus open Em). "Position 2" = frets 2–5
(E shape of G, A shape of Bm). Positions 3–5 = D, C and A shapes further up.

### Chords per position (key of Em / G)

| | Position 1 (frets 0–3) | Position 2 (frets 2–5) |
|---|---|---|
| Full chords | Em, Am, C, D, G, B7 | Bm barre `x24432` |
| Easier Bm | – | Bm7 `x20202`, small Bm `xx4432`, B7 `x21202` |
| Triads, top 3 strings (G B e) | Em `000`, G `003`, C `010`, Am `210`, D `232` | Bm `432` |
| 5ths / double stops | E5, A5, D5 (open string + fret 2); G5, C5 (fret 3 + open string a string over) | B5 (A2 + D4) |
| Drop 3 | Em7 `0x000x`, Am7 `x0201x` | Bm7 `x2423x`, Cmaj7 `x3545x`, Gmaj7 `3x443x`, G7 `3x343x`, F♯m7♭5 `2x221x` |

The open Em7 and Am7 are drop 3 shapes. Drop 3 is presented as "the open chords you already know, slid up the neck".
Drop 3 shapes already exist in `src/lib/chordKit/shapes.ts` (tagged `jazz`, `bossa`).

### Key paths

- **G → C → D → G** (1 → 4 → 5 → 1) in position 1, roots: low E fret 3 → A fret 3 → open D → open G. Labels 1/4/5/1
  and Do/Fa/Sol/Do.
- **Em → Am → B7 → Em**, the same idea in the relative minor. This is where Bm appears as the "real" 5.
- **Em arpeggio** in position 1, low to high: E(6,0) G(6,3) B(5,2) E(4,2) G(3,0) B(2,0) E(1,0).
- **Move it:** the position 1 E minor scale shape moved up 3 frets (frets 3–6) is G minor. The open strings become the
  first finger, which sets up the barre in stage 2: Bm is the Am shape moved up 2 frets.

## Stages and sections

Section lists are the draft agreed in conversation. The builder may split or merge a section if the writing calls
for it, but keep the topics and the order.

| Stage | Sections |
|---|---|
| **0.1 Guitar basics** | Strings & tuning · Tab & chord boxes · Notes on E and A |
| **0.2 First open chords** | Em & Am · C, D, G · One-minute changes · Strumming · First songs |
| **0.3 One note, three views** | Piano ↔ guitar · Solfège · The major scale as do-re-mi · Hearing do, fa, sol |
| **0.4 Single notes** | Melodies in tab on the top strings |
| **1 Position 1** | Chords · Triads · 5ths & double stops · Arpeggios · 1 → 4 → 5 → 1 & the circle of fifths · E minor pentatonic · Soloing over Em ↔ Am · Move it (same shape = G minor) |
| **2 Position 2** | The Bm barre · Easier Bm · Drop 3 chords · Arpeggios in position 2 · Joining positions 1 and 2 |
| **3 Position 1 flavours** | 6 chords · maj7 & 7 · sus & add9 · The same paths with colour |
| **4 Up the neck** | D, C and A shapes (positions 3–5) · One arpeggio through all five shapes · Triads on every string set |
| **5 Modes** | Aeolian, Dorian, Phrygian, Mixolydian in E/G · Harmonic minor and why B7 works |
| **6 Other keys** | Moving it all to Am/C, Dm/F · The circle as a map between keys |

Each section can contain: short text, fretboard pictures with paths, chord boxes (tap to hear, as now), links into
the existing explorers with settings preset, a practice task, songs (title, artist and chords only; melodies in tab
only if traditional or public domain, same rule as the old course). Material from the old `stages.ts` (songs, tab
melodies, practice links) may be reused where it fits.

## Pages and navigation

- `/course`: the course index, listing every stage with its sections.
- `/course/<stage>/<section>`: one section per page, statically generated. Stage and section slugs are the builder's
  call; they must be stable and readable (e.g. `/course/1/arpeggios`, `/course/0-2/strumming`).
- `/course/<stage>` goes to that stage's first section.
- Each section page ends with a link to the next section (and into the next stage after the last one).

### Section panel

- **Desktop / tablet:** a labelled panel floating on the left that stays put while the page scrolls. It shows the stage
  number and name, then the stage's sections as a list of labels (names only, no descriptions), with the current one
  highlighted. Below: previous stage ‹, all stages, › next stage.
- **Phone:** the sections become a bar fixed to the bottom of the screen. The stage name and ‹ › sit on a small line
  at the top of the page.
- Picking a section navigates to its route; the whole page content changes.
- Mockups from the conversation: `.superpowers/brainstorm/68251-1792343425/content/section-panel-v2.html` (layout
  only; the labels there predate the switch to per-stage sections).

## Fretboard paths

- A path is an ordered list of points `{string, fret}` plus a colour. Two points = one arrow; more = a chain.
- Drawn as straight segments between dot centres, ending short of each dot, with an arrowhead at each segment's end.
- A neck can carry several paths, each in its own colour.
- Dots keep their existing labels (degree / solfège / note name follow the label setting where the picture uses it).
- Static. No animation, no audio sync.
- Added to `NoteNeck` (`src/components/theory/NoteNeck.tsx`) as an optional `paths` prop, so every neck in the course
  (and elsewhere) can use it, at desktop and phone geometry. String numbering follows `NoteNeck` (string 0 = low E).
- Reference picture: option C in `.superpowers/brainstorm/68251-1792343425/content/paths.html`.

## Constraints

- Next.js in this repo has breaking changes from common knowledge: read `node_modules/next/dist/docs/` before writing
  routes (see `AGENTS.md`).
- Reuse the existing pieces: `NoteNeck`, chord diagrams via `lessonShape` / `shapesForTones`, label systems from
  `src/features/theory/labels.ts` (solfège is movable do), degree colours from `src/features/theory/scales.ts`, the
  course visual model in `src/features/theory/course/visuals.ts`.
- Course content stays pure data (like `stages.ts` / `visuals.ts`) so pages can be server components and shapes and
  paths can be unit-tested (e.g. every path point is on a note of the stated chord or scale).
- Works at phone width with no horizontal page scroll; follows the site's style themes.

## Calls made by Claude (check these)

- Route prefix `/course` rather than reusing `/theory/stage`, so both courses can live side by side.
- The `/theory` hub and the Theory menu get a link to the new course as the place to start; the old stage links stay
  until the old course is removed.
- Path segments are straight lines (option C), not curves.
- Phone bottom bar: when a stage has more sections than fit (stage 1 has 8), the bar scrolls sideways and keeps the
  current section in view.
- The section-panel colour follows the stage (as `stageColour` does today), since the fixed track colours no longer
  apply.

## Left to the builder

- Slug format, data types for stages/sections/visuals, component structure.
- Exact wording of lesson text, choice of songs and practice tasks within each section's topic.
- Fingerings for stage 4–6 visuals, as long as they follow the CAGED-of-G plan above.
