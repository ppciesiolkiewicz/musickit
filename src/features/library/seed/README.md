# Library seed

Plans and single exercises written by agents for the library's gaps (NEW10 in `tasks.txt`). One JSON file per plan or
exercise, so an agent writing one reads nothing else here. `index.ts` loads them through the generated `index.gen.ts` in
each folder.

```
plans/<id>.json    one 7-day plan each (SeedPlanFile)
blocks/<id>.json   one exercise each, for a step no plan reaches yet (SeedBlockFile)
```

Besides the database, the code reads them directly: the demos at `/demo` (`plan/demos.ts`, six of the plans),
`/dev/stories`, `/dev/path` and `/dev/block`.

## Adding one

1. Read the gap first: `library_coverage` (the `musickit-library` MCP tools, README in `../README.md`) and the steps on
   `/dev/path`.
2. For a plan, get the live writer's prompt for the player: `npm run -s seed -- prompt <persona id | answers.json> out.txt`
   (personas: `devtools/model/personas.ts`), and write the plan that prompt asks for.
   Write the file. The id is the file name: `<area>-<level>-<what>`, for example `theory-new-steady-beat`.
   - A plan: `{ "id", "answers", "model", "versions": { "prompt", "agents", "teaching" }, "note", "plan" }`. `answers`
     is the player the plan is for, as the questionnaire records them (`PlanAnswers`); `plan` is exactly what the AI
     returns (`title`, `summary`, `progress`, `days`).
   - An exercise: `{ "id", "model", "versions", "note", "exercise" }`, the exercise as it would sit in a plan's day.
     Its `steps` names the path steps it practises (`["barre:2"]`, `PATH` in `plan/model/path.ts`), each in a track
     of its `concepts`; its level is the highest of their levels (the parser sets it), and the library finds it by
     step.
   - `versions` are `PROMPT_VERSION` (`plan/model/prompt.ts`) and `DOC_VERSIONS` (`versions.ts`) as they
     are when the file is written. `model` is the API id of the model that wrote it. `note` says which gap, in one line.
3. `npm run -s seed -- check <file>` until it says ✔: the file reads with no parser warning, its versions are the
   current ones (`npm run -s seed -- versions`), every exercise names a concept and at least one step (each in a track of
   its concepts), a named step that has a ladder has a tool sitting on it, and a tool of a concept with steps sets its
   level or stage.
   Then `npm run -s gen:json-index`, so the folder's `index.gen.ts` imports the new file.
4. `npm run -s db:seed-plans`, then `npm run -s db:seed-blocks` (check `DATABASE_URL` in `.env.local` first).

A tool whose concept has steps sets `level` (or picks the tune or run by stage), never raw settings, so the step can
be read back. Every file meets the writing rules below.

## Showcases

A block may have `"showcase"`: `blocks` (a chart per step), `pick` (a voice melody chosen by `pick`), `progression`
(one progression worked several ways), `stages` (a choice as a tempo ladder) or `variants` (a choice whose chips each
set a key and a position). The prompt names each of the five by its block id (`showcaseBlocks()` in
`plan/model/prompt.ts`, computed from the file), so an agent can `get_block` it before using that feature.

## Writing rules

- Every exercise (in a plan too) is tagged: `area` its area (one of the plan's areas; ear training is `theory`),
  `tags` 1 to 3 kinds from `EXERCISE_TAGS` in `plan/model/tools.ts`, `topic` the questionnaire topic it practises
  (`plan/intake/topics.ts`, always one of its area), `concepts` of that topic and `steps` in their tracks. The page
  shows the tags as hashtags after the title.
- A plan has a `progress`: the notes the AI keeps on the student after that week, one line per topic the plan's
  exercises use (`<Topic label>: where they stand. Next: …`), under 300 words. The student never sees it; the next
  prompt sends it back.
- Pasted, it parses with zero warnings: real tools and props only (`COMPONENT_DOCS`), links only to attunr pages,
  picks that match a tune exactly.
- An exercise is a block: `title`, an optional `choice`, `cells` (text, list, notice, tool, section). A `section` cell holds a
  `heading`, `minutes` when it is a timed block, a `choice` when its tools change, and its own `cells`. No `focus`; the
  title may end with hashtags (`#guitar #beginner #technique`) that stand for the fields.
- Over 5 minutes: at least two sections with `minutes`, of 2 to 5 minutes each, adding up to the exercise's
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
  The same drill in more keys is one section with a `choice` in its header, an option per key
  (the section's tools move to the picked key). The text invites and names the selector, never a chip or the keys: "Then
  sing it in another key. Use the Key selector below to change the key." A new key with a new task is a later block or
  another tool.
- A choice also takes one drill up in stages or across variants, without a copy of its tools per version. `"label": "stage"`
  when each option is harder than the last (a tempo going up): the text says what a stage feels like before the next and
  what to do when one is too fast. `"label": "variant"` when the options are equals to compare (one pattern in two keys
  or positions): the text says what to look or listen for between them. The text names the selector by its label ("Use
  the Stage selector below to change the tempo"), never a chip, sits above the selector, says what Play starts again
  after a change, and names no tempo, key or position as the only one.
- A line written between underscores is underlined on the page. It is a care line only (don't reach for high notes, don't
  push, stop when it hurts): one short sentence on a line of its own, at most one in an exercise. A beginner's singing
  exercise has one where the singer could wander up the staff, with the words "reach for high notes", which the app explains.
- A tool that takes a `level` is set to the exercise's level or to its own harder settings, never left at an easier default. To let the student step up, a choice with `level` options (easiest first, option 1 the level the tool is written at) sits before the tool; its chips are stages, so the text names "the Stage selector" and says what the next stage adds, not the level's name.
- A text may hold line breaks (`\n`): what to do, the next thing to try and what to notice each start a new line.
- The text names a control by the label on the screen, one control to a sentence, and says what it starts and where it is; it never carries frets,
  fingerings or note lists the tool shows. The way from one position to the next is a position-neck with `cross`.
- No guitar-play-along `repeats` (it loops; the exercise's minutes are the timer). Styles are at most one sentence of colour.
- Plans: 7 days, each adding up to the answers' `minutes` (±2), 2 to 5 exercises, warm-up first and something musical
  last, no two exercises with the same tag side by side, the week's key skill on at least three days in new forms.
