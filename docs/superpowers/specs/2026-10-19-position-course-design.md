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

- A "My notes" panel at the end of every section, saved in the browser, and a course index that can be laid out by
  stage or by topic, showing those notes.

## Non-goals

- No accounts and no server-side storage. Student notes live only in the browser.
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
| **0.2 First open chords** | Em & Am · C, D, G · One-minute changes · All downstrums · Island strum · 16th strumming pattern · First songs |
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

### Strumming

Three exercises in stage 0.2, each its own section, in this order:
1. **All downstrums:** one down per beat, then two per beat (8ths).
2. **Island strum:** `D · D U · U D U`.
3. **16th pattern:** counted `1 e & a 2 e & a 3 e & a 4 e & a`, with a **down on beat 1 and a down on beat 3**, and 16th
   strums filling the rest. The exact fill is Claude's call (draft: `D . . U . U D U | D . . U . U D U`, the hand keeps
   moving in 16ths and only touches the strings where marked).

Each pattern is shown as a strum grid (beats and subdivisions, D/U marks) and practised over chords the student
already knows (Em ↔ Am, G C D). If the separate rhythm work in progress (`src/app/rhythm/`, uncommitted at the time
of writing) has landed, link into it; otherwise the course does not depend on it.

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

### Course index layouts

The `/course` index has a layout button with two views of the same sections:
- **By stage** (default): the course order.
- **By topic:** sections grouped by their main topic, e.g. "Position 1 / CAGED box 1", "Position 2 / CAGED box 2",
  "Strumming", "Arpeggios", "Triads", "Drop 3", "Modes". Each section keeps its stage number as a small label.

Every section has exactly one main topic, set in the course data by the author (a plain label, no emoji). Topic
names and grouping are the builder's call within that rule.

Both views show the student's marks next to each section (see My notes). The chosen layout is remembered in the
browser. *Claude's call:* the topic view can also be filtered to only 🔥 warm-ups or only 🔁 come back often.

## My notes (per section, in-browser only)

At the end of every section, a "My notes" panel where the student records how they feel about it. Everything is
stored in browser storage (`localStorage`), keyed by stage and section slug. No accounts, nothing sent anywhere.
Reads and writes are wrapped so the page works when storage is blocked (nothing is saved, nothing breaks).

The panel has five parts:
1. **How well do I know it?** one of 🌱 new · 🌿 getting there · 🌳 solid · 🏆 own it (tap again to clear)
2. **How do I like it?** one of 😖 · 😐 · 🙂 · 😍
3. **Keep it close:** two on/off switches, 🔁 come back often, 🔥 warm-up
4. **🤷** (the heading is just the shrug emoji): tags, tap to toggle, any number. A predefined set (below) plus
   **"+ tag"** to add your own: an emoji and/or words. Custom tags are saved in the browser and offered on every
   section afterwards, next to the predefined ones. Predefined set:
   💡 it clicked · 🤯 confusing · 🧠 head gets it, hands don't · ✋ hands get it, head doesn't · 🐢 need it slower ·
   🎯 timing is off · 🔇 buzzing / muted strings · 🤕 hurts my fingers · 👀 still looking at my hands ·
   👂 can't hear it yet · 🪫 tiring · 🧗 too hard for now · ⏭️ skip for now · 🥱 boring · 🎶 sounds great ·
   🌟 favourite · 🎸 using it in songs · 🎤 want a song with this · ⏱️ practise with metronome · 🤝 ask my teacher ·
   📹 record myself · 🧩 connects to something else · 🎨 want to improvise with it · 📝 write it out
5. **Note:** free text.

In the course index (both layouts) and in the section panel, each section shows its marks compactly: the know-it and
like-it emoji, 🔁 / 🔥 if on, and the 🤷 tags' emoji (a custom tag without an emoji shows its first word). The note
shows as a small indicator (full text on the section page). Mockup:
`.superpowers/brainstorm/68251-1792343425/content/my-notes.html`.

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
