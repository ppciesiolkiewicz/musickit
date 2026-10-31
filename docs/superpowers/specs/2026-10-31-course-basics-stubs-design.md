# Course basics: planned sections, explained words, stub tools

Date: 2026-10-31. Area: `src/features/course` (stages, glossary, model), `src/components/course` (index, section page),
`src/features/exercises` (stub tools), `src/features/plan/model` (tool parsing, link catalogue).

## Why

The course jumps over basics a beginner needs: hearing the home note, singing Do–Mi–Sol and stepwise melodies, keeping
a steady beat, finger dexterity (the spider), legato. The AI autoplan also needs to teach these, and its exercises
link to course articles and explained words. This change **plans** that content: new sections that say what they will
teach, new explained words pointing at them, and stub tools the AI can already put in a plan. The full lessons and the
real tool components come later; they will be built from the same learning components the autoplan uses.

## Goals

- Planned sections across the course, each with a one or two sentence **about** line that learners can read now.
- Every existing empty section also gets an about line.
- New explained words (glossary) for the basics, linking to the new sections, so the autoplan prompt (which lists the
  glossary) uses them by name.
- The autoplan link catalogue describes each course section by its about line, so the AI knows what an article covers.
- Three stub tools (`finger-pattern`, `picking-drill`, `legato-trill`) the AI can use in plans. Each renders a plain box
  reading "Stub exercise: …" with its settings.

## Non-goals

- Writing the full lessons (text, visuals, tasks) for the new sections.
- Real views for the stub tools (tab, click, sound).
- Rewriting the autoplan prompt's examples or rules beyond what the glossary and catalogue generate.

## Anti-goals

- A glossary form that is mostly a non-music word: "Do", "Mi", "Sol", "tone" and "step" alone are **not** glossary
  forms (the matcher is case-insensitive). Common music words ("bar", "beat", "root", "degree") are fine even though
  they get an (i) in most exercises; the user decided frequent (i)s are acceptable for now and will be tuned later.
- Hand-listing the new tools or words in the prompt: the prompt's tool interface comes from `COMPONENT_DOCS` and its
  word list from `GLOSSARY`.
- Planned sections counting as written content (tests for written sections keep skipping them).

## Design

### 1. The `about` line

- `CourseSection` gets `about: string`: what the section teaches or will teach, in one or two sentences of plain language for a
  learner. `section()` in `model.ts` takes it as an optional fifth argument (or an options object, builder's call).
- A section with no blocks is planned (unchanged rule). A test asserts every planned section has an `about`.
- **Course index** (`CourseIndex.tsx`): a planned row keeps its **soon** tag and shows the about line under the title,
  smaller and dimmer. Decided by Claude: planned rows become links, since their pages now have something to show.
- **Section page**: a planned section's body shows the about line and a short "Exercises for this section are on their
  way." note. Glossary (i) links already point at planned sections ("Intervals", "What a chord is"), so these pages
  must not be blank.
- Written sections get an `about` too (Claude's call, the user left it open): one line each for the ~75 existing
  written sections, so the AI's link list describes real articles, not only planned ones. On the page and in the index
  it shows only for planned sections; for written ones it is used by the catalogue (below). `about` becomes required
  on `CourseSection`, and a test asserts it is non-empty everywhere.

### 2. New and changed sections

Slugs and titles are the builder's to polish; order within a stage is as listed. Existing sections are in *italics*.
Each new one is a stub: slug, title, topic, about.

New topic: `technique`, label "Technique & dexterity", placed after "Strumming" in `TOPICS`.

**Stage 1 · Guitar basics**
- *strings-and-tuning*, *tab-and-chord-boxes*, *notes-on-e-and-a*
- `steady-beat` "Keeping a steady beat" (basics): counting beats and bars with a click, tapping and strumming in time.
  Tools later: click-drone.
- `spider` "The spider: fingers 1-2-3-4" (technique): one finger per fret across all six strings, alternate picking,
  then finger orders like 1-3-2-4. Tools later: finger-pattern, picking-drill, click-drone.

**Stage 2 · First open chords**: about lines for the existing *what-is-a-chord* stub only.

**Stage 3 · One note, three views** (the solfège thread)
- *piano-and-guitar*
- *solfege*: title becomes "Introduction to solfège" (slug unchanged, content unchanged).
- `home-note` "Do: the home note" (three-views): hearing Do over a drone, singing it, and feeling every other note
  lean back to it. Tools later: click-drone (drone), staff.
- *do-re-mi*
- `step-melodies` "Step melodies: Do–Re–Mi" (melody): short tunes that move one step at a time, sung then played.
  Tools later: run-singer, melody-singer, scale-neck.
- `do-mi-sol` "Do–Mi–Sol" (melody): the three notes of the major chord as a tune; leaping between them by ear and on
  the neck. Tools later: melody-singer, staff, scale-neck with highlight.
- *intervals* (existing stub): about covers half steps, whole steps and the octave.
- *hearing-do-fa-sol*
- `la-minor-home` "La: the minor home" (three-views): the same notes heard from La, the relative minor.
  Tools later: click-drone, staff.
- *major-or-minor*

**Stage 4 · Single notes**
- *melodies*
- `sing-then-find` "Sing it, then find it" (melody): sing a short phrase, then find it on the neck from Do.
  Tools later: melody-singer, scale-neck.
- `do-mi-sol-neck` "Do–Mi–Sol on the neck" (melody): the major triad as a melody in position 1, in G and C.
  Tools later: arpeggio-neck, scale-neck.
- `legato` "Hammer-ons, pull-offs & trills" (technique): sounding notes with the fretting hand only.
  Tools later: legato-trill, click-drone.

**Stage 5 · Position 1**
- `chords-from-scale` "Chords from the scale" (paths): Do–Mi–Sol, Fa–La–Do and Sol–Ti–Re are the 1, 4 and 5 chords.
  Placed just before *one-four-five*. Tools later: arpeggio-neck, play-along.
- `hearing-changes` "Hearing chord changes" (three-views): telling 1, 4 and 5 apart by ear over a backing.
  Placed after *one-four-five*. Tools later: backing-band, play-along.

**Stage 7 · Position 1 flavours**
- `ti-do` "Ti–Do: the pull of the 7th" (three-views): the leading note and why the 5 chord wants to go home. Placed
  after *hearing-sevenths*.

**Stage 8 · Up the neck**
- `do-mi-sol-shapes` "Do–Mi–Sol in every shape" (caged): the major triad found in each CAGED shape. Placed after
  *one-arpeggio*.
- `string-skipping` "String skipping" (technique): picking accuracy across non-adjacent strings. Placed last.
  Tools later: picking-drill.

**Stage 11 · Jazz colours**: about lines for the existing *ii-v-i*, *comping*, *guide-tones* stubs.

### 3. Explained words (glossary)

Added to `GLOSSARY`. The first form is the name the prompt lists. Builder writes the `short` meanings (one line, plain).

| id | label | forms | href |
|----|-------|-------|------|
| home-note | Home note | home note, tonic | /course/3/home-note |
| drone | Drone | drone | /course/3/home-note |
| degree | Degree | scale degree, degree | /course/3/do-re-mi |
| octave | Octave | octave | /course/3/intervals |
| half-step | Half step | half step, semitone | /course/3/intervals |
| whole-step | Whole step | whole step, whole tone | /course/3/intervals |
| root | Root | root | /course/2/what-is-a-chord |
| beat | Beat | beat | /course/1/steady-beat |
| bar | Bar | bar | /course/1/steady-beat |
| spider | Spider | spider | /course/1/spider |
| alternate-picking | Alternate picking | alternate picking | /course/1/spider |
| hammer-on | Hammer-on | hammer-on | /course/4/legato |
| pull-off | Pull-off | pull-off | /course/4/legato |
| legato | Legato | legato | /course/4/legato |

Check against existing matching: "bar" must not match "barre" (the `(?![\w-])` lookahead already prevents it; add a
test), "12-bar" must still go to the 12-bar-blues term (longest form wins; add a test), "beat" must not match "beats"
in a way that breaks (plural is allowed). "half step" is in the glossary but not "step".

The prompt needs no hand edit: its "Explained words" line is generated from `GLOSSARY`.

### 4. Link catalogue

In `plan/model/catalogue.ts` a course entry's `desc` becomes `Course <label> · <stage title>: <about>`, so the prompt's
link list tells the AI what each article covers. Planned sections stay linkable; their desc ends with " (planned)"
so the AI knows the page is only an outline.

### 5. Stub tools

Three `basic` components in `src/features/exercises/basics/<name>/`, following the "Add a basic" rule in
`exercises/CLAUDE.md`: a `<name>.props.ts` with a `@component <name> basic` JSDoc and documented props, `npm run
docs:exercises`, a parse in `TOOLS`, a case in `plan/ui/ExerciseTool.tsx`, a test.

The JSDoc description starts with "Stub: shows a placeholder until the real view exists." and then says what the tool is
for and when to use it, so the AI can use it correctly now and the real component later keeps the same props.

| tool | props | for |
|------|-------|-----|
| `finger-pattern` | `fingers` string of 2–4 distinct digits 1–4 ("1234", "1324"); `fret` start fret 1–12, default 1; `strings` optional list of strings 1–6 (6 = low E), default all; `bpm` 40–200 | the spider and finger permutations |
| `picking-drill` | `strokes` string of D/U, 1–8 long ("DU", "DDU"); `notesPerString` 1–4; `strings` optional, as above; `skip` optional boolean (string skipping); `bpm` | alternate picking, string skipping |
| `legato-trill` | `fingers` two distinct digits 1–4 ("13"); `string` 1–6; `fret` 1–12; `bpm` | hammer-on/pull-off trills |

Parse rules match the existing tools: invalid required props → `null` (tool dropped), out-of-range optional props are
left out. All three share one view: a dashed box, "Stub exercise: <tool name>" as the heading, the parsed settings on
one line under it (e.g. "fingers 1-2-3-4 · from fret 1 · all strings · 60 bpm").

### 6. Docs and tests

- `src/features/plan/README.md` and `src/features/exercises/README.md` list the new tools and say they are stubs.
- Tests: every section has a non-empty about; glossary hrefs resolve (existing test) and the new matching cases above;
  each stub tool parses valid input, drops invalid, and appears in `COMPONENT_DOCS`; catalogue desc includes the about.
- Every change: cached tsx tests for `course`, `exercises`, `plan`; `tsc --noEmit`; eslint on the touched features.

## Left to the builder

- Wording of every about line and glossary `short`, in the course's plain voice.
- Exact slugs and titles (the hrefs in §3 follow whatever slugs are chosen).
- Styling of the about line and placeholder box, matching nearby components.
