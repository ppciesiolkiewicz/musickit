# AI autoplan: concept questionnaire, honest timing, varied exercises, example library

Date: 2026-10-31. Area: `src/features/plan` (questionnaire, prompt, parsing, timer), `src/features/exercises`
(melody filter, range finder), `src/features/course` (new section stubs).

## Why

The plan is a drill platform: muscle, hearing and singing memory. Today's plans fail in small ways that add up:
which note is lit, a timer that disagrees with the text, 12 minutes of one scale, singing and playing tangled in one
exercise, a questionnaire that knows only one overall "level". The way to fix quality is **hand-tuned examples**: a
library of exercises and 7-day plans that are right down to the details, which the prompt shows the model and which a
separate fine-tuning app (built later, by the user, outside this repo's scope) loads, renders and edits.

The questionnaire and the prompt are one system: the questionnaire exists to give the prompt what it needs to choose
drills, and the examples show the model what to do with it.

## Goals

- A short questionnaire that finds out, per area, which concepts the player already knows.
- The timer always equals the exercise's minutes, which equals what the text says.
- Exercises that change what is practised every few minutes.
- An exercise is singing or playing, never both.
- The model can pick voice melodies by filter, not by memorised number.
- A complete example library (exercises + 7-day plans) as standalone JSON, used by the prompt and importable elsewhere.

## Non-goals

- The fine-tuning app itself.
- Genre-driven planning. Styles are at most a colour on a drill ("the scale used in blues"), never the reason for it.
- Piano. It leaves the questionnaire (see Migration).

## Anti-goals (failure even if it "works")

- A long questionnaire. Each area is one screen.
- Back/Next buttons that move between screens.
- A timer that says something other than the exercise text.
- An exercise whose chart greys out the note the step tells you to play (especially Do).

---

## 1. Questionnaire

### Screens, in order (start flow)

Every screen has **the same fixed height** in the step modal; the body scrolls inside when it overflows, so the
progress bar, title and Back/Next never move. (Do it in the plan flow's screens or as a `StepModal` option; builder's
choice, but it must hold for every screen of both flows.)

1. **Where are you now?** One row per area: **Guitar**, **Voice**, **Theory & ear**. Each: Skip · New · Beginner ·
   Intermediate · Advanced. At least one area must not be Skip.
2. **One concept screen per non-skipped area.** Title "Guitar: how comfortable are you?" etc. A compact list of the
   area's concepts for the player's level **and the level below** (New shows only New). Each row: name, optional
   one-line hint, 1–5 stars. Blank = unsure (distinct from low). Concepts below the shown levels are assumed known;
   above, not yet. Rows are ordered easiest first; a concept that builds on another shows a faint "builds on X" hint.
3. **Your voice** (only if Voice not skipped): voice type chips (Soprano, Mezzo, Alto, Tenor, Baritone, Bass, Not sure)
   and **Find my range** (section 5). A found range selects the nearest type.
4. **This week**: optional chips to focus on, offered from the concepts rated lowest (1–2 stars) plus a few of the next
   level's first concepts; pick up to 3. Nothing picked = the model decides.
5. **Minutes a day** (existing choices).
6. **Anything else?** Free text, plus one optional line "Styles you like" (placeholder makes clear it only flavours
   the drills).

Goals and struggles screens are removed: low stars carry the same information.

### Next-week flow

How did the week go (existing) → then **every** screen above, prefilled with the stored answers (levels, ratings,
voice, focus, minutes, notes, styles), so updating is a few taps. Fixes "can't change styles/notes week to week".

### Concept catalogue

New data file `src/features/plan/model/concepts.ts` (pure, tested): `{ id, area, level, label, hint?, buildsOn?: id[],
course?: "/course/{stage}/{section}" }`, ordered easiest first within each area and level. The prompt reads labels and
ratings, never ids alone. The user will edit this list; keep it data only.

Starting list (order within each line = easiest first):

**Theory & ear**
- New: Do as home · major vs minor by ear · steady beat · note names
- Beginner: pentatonic (minor & major) · major scale · natural minor scale · intervals within an octave · chords in a key (1-4-5)
- Intermediate: relative major/minor · 7th chords · sus chords (sus2, sus4, add9) · diminished chords · augmented chords · circle of fifths · hearing chord changes · harmonic minor · ii–V–I · chords in blues · chords in pop/rock · chords in folk
- Advanced: modes (Dorian, Mixolydian, Phrygian) · Lydian & Locrian · melodic minor · 9ths & 13ths · guide tones · changing key · chords in jazz

**Guitar**
- New: open chords · one-minute changes · strumming patterns · notes on the E and A strings · the spider · melodies (one string)
- Beginner: power chords · pentatonic box 1 · melodies (open position, a few strings) · triads on the top strings · Bm/F barre
- Intermediate: sus & add9 shapes · all five pentatonic boxes · CAGED shapes · arpeggios in a position · bends & slides · hammer-ons & pull-offs · joining positions · melodies (up the neck, eighths and dotted notes)
- Advanced: modes on the neck · triads on every string set · finding every note · string skipping · shells & comping · melodies (shifting positions, modal tunes)

**Voice**
- New: matching a pitch · Do Re Mi steps · breath & holding a note
- Beginner: Do Mi Sol skips · in tune over a drone · singing intervals · melodies (easy)
- Intermediate: leaps (4th, 5th, octave) · sight-singing melodies · a harmony line over chords · runs
- Advanced: fast runs · stretching your range · improvising a melody over chords

"Melodies" is one idea across levels on guitar and voice; each level's entry is its own concept so it can be rated.

Each concept links to its course section where one exists. **Where none exists** (e.g. matching a pitch, breath,
augmented, chords in pop/rock/folk/jazz, Lydian & Locrian if missing), add an empty `section()` stub to the most
fitting course stage so links resolve, and list the stubs in the PR description as "course sections to write".

### Answers model

`PlanAnswers` becomes:

```ts
{
  levels: Partial<Record<"guitar" | "voice" | "theory", Level>>;   // absent = skipped
  ratings: Record<string /* concept id */, 1 | 2 | 3 | 4 | 5>;     // absent = unsure
  voice?: { type?: Voice; range?: { low: number; high: number } };  // midi
  focus: string[];                                                  // concept ids, ≤ 3
  minutes: number;
  styles: string;
  notes: string;
}
```

**Migration** (stored answers and the saved flow): old `instruments` + `level` → that level for each instrument
(`voice` → voice, `guitar` → guitar, `piano` → dropped; if nothing remains, guitar); theory gets the same level;
goals/struggles are dropped. Old plans keep working.

### In the prompt

The student section lists, per area: level, then concepts with stars ("major scale ★★☆☆☆, pentatonic ★★★★☆, …",
unsure ones listed as unsure), the voice type and range in note names, the week's focus, minutes, notes. Rules: build
on what is rated high, drill what is low or unsure, follow `buildsOn` order (rated pentatonic 4, major scale 1 → build
the major scale from the pentatonic), set singing keys inside the range.

## 2. Timing

- **The exercise's `minutes` is the truth.** Remove the override: `derivedMinutes` no longer replaces minutes on paste.
  A play-along with no `repeats` loops until stopped or the timer ends. Drop `repeats` from what the prompt teaches
  (parsing still accepts it for old plans; it no longer changes minutes). Remove the prompt's repeats arithmetic.
- **Blocks.** A `heading` section may carry `minutes`; a heading with minutes starts a block that runs to the next
  block heading. An exercise over 5 minutes must have ≥ 2 blocks of 2–5 minutes each. Block minutes must sum to the
  exercise minutes; on paste, if they don't, scale block minutes to the exercise total (rounded, total preserved) and
  add a warning. Sections before the first block heading belong to block 1; headings without minutes are sub-headings
  inside the current block. An exercise over 5 minutes with fewer than 2 blocks is accepted with a warning (the
  examples must never trigger it).
- **Scope of blocks:** the timer and the current block's heading only (a subtle "now" marker on it). Blocks do not
  start, stop or switch tools, and the timer does not drive the play-along; the play-along simply loops until the
  student stops it.
- **Timer.** One countdown for the exercise. With blocks it shows "block 2 of 4 · 3:00 left in block", a short tick
  at each block change, and the chime at the end. Visual detail is the builder's.

## 3. Exercise rules (prompt + examples)

Add to the prompt's rules and enforce in every example:

- **Variety inside an exercise:** consecutive blocks on one idea change something real: tempo, key, position, direction,
  which note is lit, hear-it vs from-memory. Never one tool for the whole of a long exercise. E.g. "A minor pentatonic,
  12 min" = box 1 at 60 → crossing box 1→2 → the same in C → 2 min improvising on just those notes.
- **Singing or playing:** each exercise is one or the other; no step asks the student to both sing and play. A week may
  hold both kinds. Tag `sing` / instrument tags accordingly. Post-paste check: an exercise with a mic tool (staff with
  live pitch, melody-singer, run-singer) and a step text asking to play, or an instrument tool and text asking to sing,
  gets a warning.
  - What counts: **singing** = a mic tool or text asking to sing. **Playing** = text asking the student to play their
    instrument (chord-shapes, scale-neck, arpeggio-neck, play-along neck/tab view used to play along, the stub tools).
    **Neutral** (allowed in either): click-drone, backing-band, play-along used as accompaniment the student sings or
    listens over, staff without mic, interval-ears, note-finder. A listening-only ear/theory exercise is fine.
  - Replace today's "Always pair singing with playing" and its instrument-based suggestions: longer singing is made
    musical by singing over chords (play-along as accompaniment), melody-singer tunes, call and response with the app
    (it plays, you sing back), and improvising on chord tones. The 3-minute cap becomes: a bare singing drill is at most
    one block of ≤ 3 minutes. Using the guitar as the reference pitch ("play the A, sing it back") is out.
- **Lighting:** every note a step names is lit in the tool after it; the root (Do) is never muted when it is part of
  the exercise; one chart per step when the focus changes (step 1 shows Do, step 2 Do + Mi, step 4 the whole line).
- **Styles:** never organise a plan around genres. A style may justify a choice in one sentence ("the scale used in
  blues").
- Keep the existing rules and common mistakes; add wrong → right pairs for: muted Do, one chart for five steps,
  12 min one tool, sing-and-play in one exercise, timer ≠ text.

## 4. Melodies by filter

`melody-singer` (and `run-singer`) accept, besides `tune` / `run` numbers, a filter:
`{ "type": "melody-singer", "pick": { "difficulty": "easy", "stage": "skips", "index": 0 }, "key": 9 }`. Resolved on
paste to a concrete tune number (the stored plan holds the number) using the melody book's stages and
`difficultyOf`. Difficulty names = the book's `DIFFICULTIES` labels; `stage` optional (book stage ids); `index` = nth
match, wrapping. No match → drop the stage constraint, then fall back to the nearest difficulty, with a warning. The
prompt lists difficulties and stages (id + title), not every tune.

Guitar melodies use the existing play-along `melody` shape; the examples show a melody per level.

## 5. Find my range

A small component on the voice screen using the existing pitch detector (`src/features/tuner/usePitch.ts`): "Sing your
lowest comfortable note" → hold a steady pitch ~1 s → "now your highest" → shows e.g. "C3 – A4 → tenor" (nearest of
`VOICES` in `theory/singing.ts`), with Retry. Mic denied or no stable pitch → falls back to the chips, no error wall.
The range is stored in answers and passed to the prompt; also used to set `voice` on singer tools when the model omits it.

## 6. Example library

Folder `src/features/plan/examples/`, standalone JSON, no imports from app code, so another app can read it:

```
examples/
  README.md                 what each file is, the format, how to add one
  exercises/<id>.json       one exercise each
  plans/<id>.json           one 7-day plan each (the full PlanConfig the model returns)
  index.ts                  loads them for the app and the prompt (the only TS here)
```

Each file wraps the content with metadata:

```json
{ "id": "guitar-beginner-pentatonic-box1", "kind": "exercise", "area": "guitar", "level": "beginner",
  "concepts": ["pentatonic-box-1"], "note": "Why this is a good example, in one or two sentences.",
  "exercise": { "title": "…", "focus": "…", "minutes": 10, "tags": ["technique"], "sections": [ … ] } }
```

(`"kind": "plan"` with `"plan": { title, summary, days }` for plans.)

**Generate all in one go:**
- Exercises (~15): each area × level (guitar ×4, voice ×4, theory & ear ×4) plus three that show specific rules
  (blocks with a chart per step; a voice melody via `pick`; a progression worked several ways).
- Plans (4): beginner guitar; intermediate guitar; beginner voice; intermediate guitar + theory & ear.
- Every example meets section 3, uses blocks where over 5 min, uses only real tools/props, and is consistent with its
  own text (notes named = notes lit, keys and tempos match).

**Tests:** every example parses with `parsePlanConfig` (plans) or the exercise parser **with zero warnings**; ids
unique; `concepts` exist in the catalogue; block minutes sum to exercise minutes; plans have 7 days with daily totals
near a stated `minutes`.

**In the prompt:** the old inline `EXAMPLE` is replaced by examples from the library, chosen by the student's answers:
the exercises for their non-skipped areas at their level (and one level up if they rated their level's concepts high),
plus the one plan that best matches (fallback: the plan sharing the most areas, then the closest level; e.g. a
voice-only advanced student gets the beginner voice plan as format reference), plus the three rule-showcase exercises
**always** (the `pick` one only when Voice is not skipped).

Examples **may use the stub tools** (`finger-pattern`, `picking-drill`, `legato-trill`) for the spider, legato and
string skipping; they will be revised in the fine-tuning app when the real components land. Each example is printed with its `note` as a
one-line "why this is good" above the JSON. The answer-format section keeps a short schema reminder. Selection rule
is tested.

## Constraints

- Follow `src/features/plan/CLAUDE.md`: logic in `model/` with tests, data through `PlanStore`, update the README.
- Next.js in this repo differs from training data; read `node_modules/next/dist/docs/` before touching app code.
- Verify via `tsx --test src/features/plan/model/*.test.ts`, `tsc --noEmit`, eslint, and the dev server (local
  `next build` can't fetch fonts).

## Left to the builder

Visual design of star rows, "builds on" hints, block markers in the timer; how fixed height is implemented; exact hints
and copy; which course stage each stub goes into; the post-paste checks' wording.

## Calls made in this design (not explicitly confirmed)

- Piano dropped; goals/struggles screens dropped.
- Concepts shown: own level + the level below.
- `repeats` kept parseable but ignored for minutes.
- Block minutes rescaled on mismatch rather than refusing the plan.
- Prompt includes a selection of examples, not the whole library (size).
- Empty course stubs for concepts without a section.
- Instrument-as-reference singing ("play it, sing it back") is out; drones, backing and play-along accompaniment are
  allowed under singing.
- Blocks affect only the timer and a heading marker, not the tools.
- Examples may use the stub tools.
- Rule-showcase examples always go into the prompt.
