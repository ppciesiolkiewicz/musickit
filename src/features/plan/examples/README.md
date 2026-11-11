# Example library

Hand-tuned exercises and 7-day plans: the prompt shows them to the AI as the standard to copy, and other apps (the
fine-tuning app) read the JSON directly. The JSON imports nothing, so it can be copied out of this repo as it is.

```
exercises/<id>.json   one exercise each
plans/<id>.json       one 7-day plan each
index.ts              loads them for the app and the prompt (EXERCISE_EXAMPLES, PLAN_EXAMPLES, DOC_VERSIONS); the only TypeScript here
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
- `docs` is the versions of the writing rules the example was written to: `"docs": { "agents": 1, "teaching": 1 }`.
  `agents` is the `Version:` in the repo's `AGENTS.md`, `teaching` the `version:` shared by the four teaching skills
  (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`); 0 is before a document had versions.
  Teaching 0 is the older style; teaching 1 is practice first, a why the student can build their own drill from, each
  block the same drill turned a new way (it was `"style": "new"` until 2026-11-10); teaching 2 adds the selector named
  by its label and never its chips, one control to a sentence, line breaks, and what stays the same said for each drill; teaching 3 adds the underlined care line (`_Don't reach for high notes._`); teaching 4 gives what to sing on its own
  clause with its own verb (never hung inside another instruction) and spells the moment to move on out as a feel,
  never "once you know it". `DOC_VERSIONS` in `index.ts` holds
  the current two. The prompt tells the AI to write like the examples at the current `teaching` version, and
  `/dev/examples` shows both as tags (amber when behind) and filters by teaching version. Set `docs` only when the
  example is written or rewritten; never raise it by hand.
- An exercise may have `"showcase"`: `blocks` (a chart per step), `pick` (a voice melody chosen by `pick`),
  `progression` (one progression worked several ways), `stages` (a step-choice as a tempo ladder) or `variants` (a
  step-choice whose chips each set a key and a position). These five always go into the prompt.
- A plan has `"kind": "plan"`, `"minutes"` (the daily time it is written for) and `"plan": { title, summary, days }`,
  the whole `PlanConfig` the AI returns.

What there is: one exercise per area and level (`<area>-<level>-<what>.json`) and four more (`guitar-new-notes-on-e-and-a`,
`voice-beginner-in-tune-over-drone`, `theory-intermediate-hearing-changes`, `voice-advanced-hard-leaps`: an interval-singer taken up by a step-choice of levels), all but `voice-beginner-do-mi-sol` and
`voice-advanced-guide-tones` in the new teaching style; the three older showcases and two for the step-choice (`showcase-stages-tempo-ladder`, `showcase-variants-same-frets`); and seven plans:
`guitar-beginner` (20 min), `guitar-intermediate` (30), `guitar-advanced` (30), `voice-beginner` (15), `guitar-theory-intermediate` (30),
`voice-intermediate` (20), `voice-advanced` (25).

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
- A sung or played pattern (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, and a line of its own
  says what stays the same in this drill ("When you change the key, the notes change but the drop is still an octave.").
  The same drill in more keys is one block with a `step-choice` tool right before the tool it moves, an option per key
  (the block's tools move to the picked key). The text invites and names the selector, never a chip or the keys: "Then
  sing it in another key. Use the Key selector below to change the key." A new key with a new task is a later block or
  another tool.
- A step-choice also takes one drill up in stages or across variants, without a copy of its tools per version. `"label": "stage"`
  when each option is harder than the last (a tempo going up): the text says what a stage feels like before the next and
  what to do when one is too fast. `"label": "variant"` when the options are equals to compare (one pattern in two keys
  or positions): the text says what to look or listen for between them. The text names the selector by its label ("Use
  the Stage selector below to change the tempo"), never a chip, sits above the selector, says what Play starts again
  after a change, and names no tempo, key or position as the only one.
- A line written between underscores is underlined on the page. It is a care line only (don't reach for high notes, don't
  push, stop when it hurts): one short sentence on a line of its own, at most one in an exercise. A beginner's singing
  exercise has one where the singer could wander up the staff, with the words "reach for high notes", which the app explains.
- A tool that takes a `level` is set to the exercise's level or to its own harder settings, never left at an easier default. To let the student step up, a step-choice with `level` options (easiest first, option 1 the level the tool is written at) sits before the tool; its chips are stages, so the text names "the Stage selector" and says what the next stage adds, not the level's name.
- A text may hold line breaks (`\n`): what to do, the next thing to try and what to notice each start a new line.
- The text names a control by the label on the screen, one control to a sentence, and says what it starts and where it is; it never carries frets,
  fingerings or note lists the tool shows. The way from one position to the next is a position-neck with `cross`.
- No guitar-play-along `repeats` (it loops; the exercise's minutes are the timer). Styles are at most one sentence of colour.
- Plans: 7 days, each adding up to `minutes` (±2), 2 to 5 exercises, warm-up first and something musical last, no two
  exercises with the same tag side by side, the week's key skill on at least three days in new forms.

## Adding one

Write the JSON, add a static import of it to `index.ts`, and run
`tsx --test src/features/plan/examples/examples.test.ts`. Then open `/dev/examples` on the dev server, which draws
every example with its real tools, and read every step against its tool: are the notes it names lit, is the timer what
the text says? Don't paste it into `/plan`: that replaces the plan stored in this browser.
