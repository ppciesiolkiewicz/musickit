# Plan: topic questionnaire, progress log and the AI's progress summary

Date: 2026-11-10. Status: design, waiting for approval.

## Why

The plan questionnaire asks the student to star-rate about 70 fine concepts ("Do as home", "String skipping", "Guide
tones") before the first week. That is too much to ask, and a star on an abstract concept is a weak signal. Its only real
job is the **cold start**: getting week 1 roughly right. From week 2 on, the stars the student gives each exercise are
better evidence than any self-rating, but today they only reach the next prompt as a flat list of the last three weeks.

This change makes the questionnaire short, and makes real ratings the thing that drives later weeks.

## Goals

- A first questionnaire of 18 broad topics (6 per area), one tap each.
- Every exercise rating is kept in a progress log, tied to the plan and the exercise by id.
- The next-week prompt carries the whole week's ratings and the AI's own running summary of the student's progress.
- The AI rewrites that summary each week; the prompt tells it how.
- A `/dev/data` page to look at all of this.

## Non-goals

- No server. Storage is a mock DB: localStorage behind an interface.
- The student does not see the AI's summary anywhere in the app.
- No change to the star control, the course ratings, the day timer or reminders.
- `/dev/data` does not edit, delete or seed data.

## Anti-goals

- The questionnaire must not grow back: no per-concept questions, no extra "level" or "focus" screens.
- The prompt must not grow every week. The summary replaces old weeks; it is not added on top of them.

## Decided with the user

### Topics

Six per area. Ids are the builder's (kebab-case, stable). Descriptions are one short line, in the teaching voice.

| Area | Topic | Covers |
|---|---|---|
| Guitar | Scales | pentatonic boxes, modes, knowing the neck |
| Guitar | Basic chords | open chords, changing between them, strumming |
| Guitar | Barre chords | F, Bm and shapes that move |
| Guitar | Extended chords | 7ths, sus and add9, 9ths and 13ths |
| Guitar | CAGED | the five shapes and how they join up |
| Guitar | Techniques | hammer-ons, pull-offs, bends, slides, string skipping |
| Voice | Pitch | matching a note, staying in tune over a drone |
| Voice | Intervals & leaps | steps, skips, intervals, then 4ths, 5ths, octaves |
| Voice | Melodies | easy tunes up to sight-singing |
| Voice | Breath & range | holding a note, stretching the range |
| Voice | Runs | slow runs up to fast ones |
| Voice | Harmony & improvising | a harmony line over chords, making up a melody |
| Theory & ear | Basics | steady beat, note names |
| Theory & ear | Ear | home note, major vs minor, intervals, chord changes |
| Theory & ear | Scales & keys | pentatonic, major, natural minor, relative keys, circle of fifths, changing key |
| Theory & ear | Building chords | 7ths, sus/add9, diminished, augmented, 9ths and 13ths |
| Theory & ear | Progressions & styles | 1-4-5, pop/rock, folk, blues, ii–V–I, guide tones, jazz |
| Theory & ear | Modes & minor colours | the modes, Lydian & Locrian, harmonic and melodic minor |

### How a topic is asked ("pick the line that fits")

Mockup A on https://claude.ai/artifact/UgUZvqEDVgTWgfYeNFj4eM.

One screen per area the student plays. Each topic is a row with its name and description. The open row shows four
statements, from "Not yet" to solid, and the student taps the one that sounds like them. Tapping closes the row, shows the
chosen line under the topic name, and opens the next unanswered row. A topic may be left unanswered.

Example, Barre chords: "Not yet" / "I can hold an F or Bm, but it buzzes" / "F and Bm ring clean and I change to them in
time" / "I move barre shapes anywhere on the neck".

### The flows

First plan, and "Start anew":
1. Which areas do you play (at least one).
2. One topic screen per chosen area.
3. Voice type and range, if Voice is chosen (unchanged).
4. Minutes a day (unchanged).
5. Anything else, styles (unchanged).
6. Copy prompt, paste reply (unchanged).

Next week: "How did this week go", minutes, anything else, copy, paste. The topic screens are not shown; a "Change my
answers" link on the first screen opens them.

### Tracking

- A plan keeps its random id. Each exercise gets its own random id when the plan is pasted.
- The AI tags each exercise with one topic and, where they fit, fine concepts.
- One log row per rated exercise. Re-rating updates the row; clearing the rating removes it.
- Rows outlive the plan history (which keeps 20 plans).

### The AI's summary

- The AI returns it with the plan, in a new field. It is stored with that plan and never shown to the student.
- The next prompt sends it back word for word, with the full week of ratings, and asks for a rewritten one.

### `/dev/data`

A new dev page next to the existing ones, showing the stored data.

## Design (builder's reading; marked calls are mine, not the user's)

### Model

`src/features/plan/model/topics.ts` (new): `Topic { id, area, label, desc, lines: [string, string, string, string] }`,
`TOPICS`, `topicById`, `topicsFor(area)`. `Rung = 0 | 1 | 2 | 3` is the index of the chosen line.

`concepts.ts`: each concept gains `topic` (one topic id of its own area). The 70 concepts stay; they are no longer asked
about. **My call** on the less obvious ones:
- Guitar Scales: pentatonic box 1, all five boxes, joining positions, notes on E and A, finding every note, modes on the
  neck, the three melody concepts.
- Guitar Basic chords: open chords, one-minute changes, strumming patterns, power chords.
- Guitar Extended chords: sus & add9 shapes, shells & comping.
- Guitar CAGED: CAGED shapes, triads on the top strings, triads on every string set, arpeggios in a position.
- Guitar Techniques: the spider, hammer-ons & pull-offs, bends & slides, string skipping.
- Voice and Theory follow the "Covers" column above.

`PlanAnswers` becomes `{ areas: Area[]; topics: Record<string, Rung>; voice?; minutes; styles; notes }`. `levels`,
`ratings` and `focus` go, with `focus.ts` and the focus screen.

`levelOf(answers, area): Level` (**my call**): code that still needs one level per area (`selectExamples`, the "pitch at
their level" prompt lines) gets it from the answers: the mean rung of that area's answered topics, rounded, mapped
0→new, 1→beginner, 2→intermediate, 3→advanced; no answers → beginner.

`migrateAnswers`: old stored answers keep `areas` (the keys of the old `levels`), voice, minutes, styles, notes. Old
`ratings` and `focus` are dropped. `topics` starts empty. **My call:** when an active area has no answered topic, the
next-week flow shows that area's topic screen once, so people with old answers fill the new questionnaire one time.

`PlanExercise` gains `id?: string` (set by the app on paste, never by the AI), `topic?: string`, `concepts?: string[]`.
`PlanConfig` gains `progress?: string`.

`parsePlanConfig`: keeps `topic` when it is a known topic id, `concepts` that are known ids, and `progress` (**my call:**
cut at 4000 characters). An exercise without a topic adds to the existing "untagged" warning. A reply without `progress`
gives a warning, not an error.

### Stores (mock DB)

`PlanStore` stays as it is. On load, any stored exercise without an `id` gets one, and the state is saved back.

New `src/features/progress/`:
- `ProgressEntry { id, planId, exerciseId, day, exercise, title, focus?, area?, level?, topic?, concepts?, stars, at }`.
- `ProgressStore { list(): Promise<ProgressEntry[]>; put(e): Promise<void>; remove(exerciseId): Promise<void> }`, async
  like `PlanStore`, so an API can replace it.
- `localProgressStore`: one JSON array in localStorage key `musickit.progress`, read through a sanitiser that drops broken
  rows one by one.

`StoredPlan.rated` and `done` stay: they are what the week view draws from. Rating an exercise in `PlanApp` writes both
the plan and the log (`put`, keyed by `exerciseId`); clearing removes the row. **My call:** on first load with an empty
log, rows are backfilled from `rated` of the current plan and the history, so ratings given before this change are kept.

### Prompt

`buildPrompt` / `promptParts` change:

- **The student**: per area, each topic with the chosen line ("Barre chords: I can hold an F or Bm, but it buzzes") or
  "(not answered)"; then voice, minutes, notes, styles as today. On a next-week prompt the heading says these are what the
  student said when they started, and that ratings and the summary below count for more.
- **This week** (next-week only): the current plan's exercises grouped by topic, each with its stars and label, "skipped"
  when not rated, its level and focus; then the student's "how did it go" note. Built from the plan plus the log.
- **Progress summary** (next-week only): the last plan's `progress`, word for word. When the last plan has none (plans
  made before this change), fall back to today's "Earlier weeks" part with up to three week reports.
- **How to plan**: the lines about concept stars and "focus for the week" are rewritten for topics. New rule block on the
  summary: return `progress`; one line per topic the student plays, saying where they stand, what moved this week, what is
  stuck and what to try next; rewrite it whole each week from the old summary plus this week's ratings; trust ratings over
  the starting answers; keep it under about 300 words; write it for yourself, not for the student.
- **Interface**: `topic` and `concepts` on an exercise (with the list of topic ids, and concept ids per topic),
  `progress` on the plan.

The course-ratings part is unchanged.

### Examples

Every example in `src/features/plan/examples` gets a `topic` (and `concepts` where they fit), and the plan examples get a
`progress`, so the AI copies the new fields. `examples.test.ts` checks every example exercise has a known topic.

### UI

- `Questionnaire.tsx`: areas step (chips, replaces the levels step), topic step per area (accordion as in mockup A, real
  buttons, `aria-pressed` on the chosen line, 44px targets), voice, minutes, anything else. The concept and focus steps go.
- `PlanFlow.tsx`: next-week steps as listed above, with the "Change my answers" link.
- `WeekView` / `ExerciseCard`: no visible change; `progress` is not rendered anywhere.

### `/dev/data`

One entry in `devtools/registry.ts`, page `src/app/dev/data/page.tsx`, read-only, from this browser's stores:
- Answers: areas and each topic's chosen line.
- Plans: current and history, with id, start date, exercises rated / total.
- Progress log: a table (time, plan, exercise, topic, stars), with a topic filter.
- AI summaries: each plan's `progress`, newest first.
- Each block has a raw JSON view with a copy button.

### Also touched

`devtools/model/compose.ts` and the prompt studio (they build prompts from answers JSON), `exampleSelection.ts`,
`plan/README.md`, `devtools/README.md`, and the tests beside each changed model file.

## Left to the builder

- The 72 statement lines (18 topics × 4) and the 18 descriptions, written with the `teaching-voice` skill; any fretboard
  or theory fact in them checked with `npm run theory`. The user reads these before they ship.
- Topic ids, the exact warning texts, the layout of `/dev/data`.

## Testing

Unit tests for: `levelOf`, `migrateAnswers` (old shape in, new shape out), the topic of every concept, `parsePlanConfig`
with the new fields, the progress store sanitiser and upsert/remove, the backfill, and the prompt parts (first week has no
"This week" or summary; next week has both; fallback when the last plan has no summary). Then the flow by hand in dev:
first plan, rate a few exercises, next-week prompt, `/dev/data`.
