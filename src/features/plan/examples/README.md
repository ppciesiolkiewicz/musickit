# Example library

Hand-tuned exercises and 7-day plans: the prompt shows them to the AI as the standard to copy, and other apps (the
fine-tuning app) read the JSON directly. The JSON imports nothing, so it can be copied out of this repo as it is.

```
exercises/<id>.json   one exercise each
plans/<id>.json       one 7-day plan each
index.ts              loads them for the app and the prompt (EXERCISE_EXAMPLES, PLAN_EXAMPLES); the only TypeScript here
examples.test.ts      every rule below, checked
```

## Format

Each file is the content exactly as the AI returns it, wrapped in metadata:

```json
{ "id": "guitar-beginner-pentatonic-box1", "kind": "exercise", "areas": ["guitar"], "level": "beginner",
  "concepts": ["pentatonic-box-1"], "note": "Why this is a good example, in one or two sentences.",
  "exercise": { "title": "…", "focus": "…", "minutes": 10, "tags": ["technique"], "sections": [ … ] } }
```

- `id` is the file name. `areas`: `guitar`, `voice`, `theory` (an exercise has one, a plan may have several). `level`:
  `new`, `beginner`, `intermediate`, `advanced`. `concepts`: ids from `model/concepts.ts`.
- An exercise may have `"showcase"`: `blocks` (a chart per step), `pick` (a voice melody chosen by `pick`) or
  `progression` (one progression worked several ways). These three always go into the prompt.
- A plan has `"kind": "plan"`, `"minutes"` (the daily time it is written for) and `"plan": { title, summary, days }`,
  the whole `PlanConfig` the AI returns.

What there is: one exercise per area and level (`<area>-<level>-<what>.json`), the three showcases, and four plans:
`guitar-beginner` (20 min), `guitar-intermediate` (30), `voice-beginner` (15), `guitar-theory-intermediate` (30).

## The rules every example meets

- Pasted, it parses with zero warnings: real tools and props only (`COMPONENT_DOCS`), links only to attunr pages,
  picks that match a tune exactly.
- Over 5 minutes: at least two blocks (headings with `minutes`) of 2 to 5 minutes each, adding up to the exercise's
  minutes; consecutive blocks change something real (tempo, key, position, which note is lit, the task).
- Singing or playing, never both. Singing exercises never mention the instrument (drones, the backing and play-along
  as accompaniment are fine); playing exercises never ask to sing. A bare singing drill is one block of at most 3 minutes.
- Every note a step names (`{{3}}`, `{{c-sharp}}`) is lit in the tool after it; the root is never muted; a fresh tool
  after a step whenever the focus changes. Staffs in non-singing exercises set `"mic": false`.
- No play-along `repeats` (it loops; the exercise's minutes are the timer). Styles are at most one sentence of colour.
- Plans: 7 days, each adding up to `minutes` (±2), 2 to 5 exercises, warm-up first and something musical last, no two
  exercises with the same tag side by side, the week's key skill on at least three days in new forms.

## Adding one

Write the JSON, add a static import of it to `index.ts`, and run
`tsx --test src/features/plan/examples/examples.test.ts`. Then paste it into `/plan` and read every step against its
tool: are the notes it names lit, is the timer what the text says?
