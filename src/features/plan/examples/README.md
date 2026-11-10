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
  "exercise": { "title": "…", "focus": "…", "minutes": 10, "level": "beginner", "area": "guitar", "tags": ["technique"],
                "topic": "guitar-scales", "concepts": ["pentatonic-box-1"], "sections": [ … ] } }
```

- `updated` is the day the example was last written or rewritten (`YYYY-MM-DD`), and `model` the API id of the model
  that wrote it (`claude-opus-5-5`). Set both whenever an example is written or rewritten; `/dev/examples` shows them as
  tags. Examples older than these fields have the date of their last commit and no `model`.
- `id` is the file name. `areas`: `guitar`, `voice`, `theory` (an exercise has one, a plan may have several). `level`:
  `new`, `beginner`, `intermediate`, `advanced`. `concepts`: ids from `model/concepts.ts`.
- Every exercise, alone or in a plan, has a `topic`: the questionnaire topic it practises (`../intake/topics.ts`), always
  one of its `area`. An exercise example also lists `concepts`: those of the file's own `concepts` that belong to that
  topic. A plan has a `progress`: the notes the AI keeps on the student after that week, one line per topic the plan's
  exercises use (`<Topic label>: where they stand. Next: …`), under 300 words. The student never sees it; the next
  prompt sends it back.
- `"style": "new"` marks an example written in the new teaching style (practice first, a why the student can build
  their own drill from, each block the same drill turned a new way; see the `teaching-voice` skill). The prompt tells the
  AI to write like these, and `/dev/examples` badges and filters by style. Absent: the older style.
- An exercise may have `"showcase"`: `blocks` (a chart per step), `pick` (a voice melody chosen by `pick`) or
  `progression` (one progression worked several ways). These three always go into the prompt.
- A plan has `"kind": "plan"`, `"minutes"` (the daily time it is written for) and `"plan": { title, summary, days }`,
  the whole `PlanConfig` the AI returns.

What there is: one exercise per area and level (`<area>-<level>-<what>.json`) and three more (`guitar-new-notes-on-e-and-a`,
`voice-beginner-in-tune-over-drone`, `theory-intermediate-hearing-changes`), all but `voice-beginner-do-mi-sol` and
`voice-advanced-guide-tones` in the new teaching style; the three showcases, in the older style; and four plans:
`guitar-beginner` (20 min), `guitar-intermediate` (30), `voice-beginner` (15), `guitar-theory-intermediate` (30).

## The rules every example meets

- Every exercise (in a plan too) is tagged: `level` is the example's level, `area` its area (one of a plan's areas;
  ear training is `theory`), `tags` 1 to 3 kinds from `EXERCISE_TAGS` in `model/tools.ts`. The page shows them as chips.
- Pasted, it parses with zero warnings: real tools and props only (`COMPONENT_DOCS`), links only to attunr pages,
  picks that match a tune exactly.
- Over 5 minutes: at least two blocks (headings with `minutes`) of 2 to 5 minutes each, adding up to the exercise's
  minutes; consecutive blocks change something real (tempo, key, position, which note is lit, the task).
- Singing or playing, never both. Singing exercises never mention the instrument (drones, the backing and a backing-track
  are fine); playing exercises never ask to sing. A bare singing drill is one block of at most 3 minutes.
- Every note a step names (`{{3}}`, `{{c-sharp}}`) is lit in the tool after it; the root is never muted; a fresh tool
  after a step whenever the focus changes. Staffs in non-singing exercises set `"mic": false`.
- Two layers, never the same list: `enable` for the notes in play (absent: all), `highlight` for the few that matter
  among them (the roots, the note just added). `others` only with `enable`.
- Every exercise, alone or in a plan, has at least one `learnBefore` lesson. If no course section fits, a planned (stub) section is
  added to the course for it first.
- A sung or played pattern (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key: the notes change, the
  pattern doesn't. The same drill in more keys is one block with a `key-choice` tool right before the tool it moves (the
  student taps a key and the block's tools move to it; the text says "tap G in the Key row above the neck"); a new key with a new task is a later block or another tool.
- The text names a control by the label on the screen and says what it starts and where it is; it never carries frets,
  fingerings or note lists the tool shows. The way from one position to the next is a position-neck with `cross`.
- No guitar-play-along `repeats` (it loops; the exercise's minutes are the timer). Styles are at most one sentence of colour.
- Plans: 7 days, each adding up to `minutes` (±2), 2 to 5 exercises, warm-up first and something musical last, no two
  exercises with the same tag side by side, the week's key skill on at least three days in new forms.

## Adding one

Write the JSON, add a static import of it to `index.ts`, and run
`tsx --test src/features/plan/examples/examples.test.ts`. Then paste it into `/plan` and read every step against its
tool: are the notes it names lit, is the timer what the text says?
