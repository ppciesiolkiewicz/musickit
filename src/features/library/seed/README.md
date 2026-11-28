# Library seed

Plans and single exercises written by agents for the library's gaps (NEW10 in `tasks.txt`). One JSON file per plan or
exercise, so an agent writing one reads nothing else here. `index.ts` loads them through the generated `index.gen.ts` in
each folder.

```
plans/<id>.json    one plan each, 3 to 7 days (SeedPlanFile); its days name blocks and a choice of each
blocks/<id>.json   one exercise each, with its choices (SeedBlockFile)
videos/<tool>.json a stand-in video per scripted tool: its script as timed captions (StandInSeed, contentVideos)
```

`videos/` is written by `scripts/gen-stand-in-seeds.ts`, never by hand. `npm run -s db:seed-videos` puts them in the
database; `db:seed-blocks` doesn't, and the app never reads the files (contentVideos README, "Stand-ins").

A block file is the exercise (`title`, `cells`, tags) and a `choices` list: each choice is one way to do it, with its
`name`, `level`, `steps`, `moves`, `set`, `params` and `minutes` (`SeedChoice`). A choice's id is `<block id>/<name>`. `choices.ts` makes
the AI-shape exercise of a choice (`exerciseOf`) and fills a plan's refs in (`expandPlan`), so the parser and the checks
read the shape they always did. The code reads the files through them: `seedExercises(file)` (one exercise per choice),
`seedExercise(file)` (the first choice's, where one is needed) and `seedPlan(file)` (the plan with its refs filled in), all
in `index.ts`. The exercises once written inline in the plans were moved out to block files by `scripts/seed-split.ts`
(2026-11-19, a one-off); their `note` says which plan and day they came from.

Besides the database, the code reads them directly: the demos at `/demo` (`plan/demos.ts`, nine of the plans, each three or four practice days),
`/admin/content/stories`, `/admin/content/path` and `/admin/content/block`.

## Adding one

Write with the `exercise-example` skill (it reads `teaching-voice` first) and check with `review-teaching-text`.

1. Read the gap first: `library_coverage` (the `musickit-library` MCP tools, README in `../README.md`) and the steps on
   `/admin/content/path`.
2. For a plan, get the live writer's prompt for the player: `npm run -s seed -- prompt <persona id | answers.json> out.txt`
   (personas: `devtools/model/personas.ts`), and write the plan that prompt asks for.
   Write the file. The id is the file name: `<area>-<level>-<what>`, for example `theory-new-steady-beat`.
   - A plan: `{ "id", "answers", "model", "versions": { "prompt", "agents", "teaching" }, "note", "plan" }`. `answers`
     is the player the plan is for, as the questionnaire records them (`PlanAnswers`); `plan` is what the AI returns
     (`title`, `summary`, `progress`, `days`), except that a day's `exercises` are refs,
     `{ "block": "<block id>", "choice": "<choice name>", "minutes"? }`, to blocks of `blocks/`. `minutes` on a ref
     replaces the choice's.
   - An exercise: `{ "id", "model", "versions", "note", "exercise", "choices" }`. The `id` is the file name, two or
     more lowercase words joined by hyphens. `exercise` is the exercise as it would sit in a plan's day, without
     `level`, `steps`, `moves` and `minutes`. Each choice (`name`: lowercase words joined by hyphens, unique in the
     file) holds `level`?, `steps`, `moves`?, `set`?, `params`?, `minutes`, `draft`?. `steps` names the path steps it practises
     (`["barre:2"]`, `PATH` in `plan/model/path.ts`), each in a track of the exercise's `concepts`; the library finds it
     by step.
   - A genre's block (a riff: its tool is a guitar-play-along with the `riff` shape, the notes written out in the tool) also has `"genre"`: `blues`, `rock`, `funk` or `jazz` (`genres.ts`). It is a dead end on the path: its choice names the step it uses, and no step waits for it. Its notes, and its `"amp"` (the name of the `.nam` amp model the riff maker plays it through; players don't hear it yet), are written and changed in the riff maker (`/admin/content/riff`), which saves into the database; `npm run -s db:pull-riffs` writes the saved riffs into their files, and the seed keeps a saved riff over the file's until then; its words are written here like any block's. A riff is in its own key, so its `moves` has a tempo range and no key.
   - `versions` are `PROMPT_VERSION` (`plan/model/prompt.ts`) and `DOC_VERSIONS` (`versions.ts`) as they
     are when the file is written. `model` is the API id of the model that wrote it. `note` says which gap, in one line.
3. `npm run -s seed -- check <file>` until it says ✔: the file reads with no parser warning, its versions are the
   current ones (`npm run -s seed -- versions`), the id is a curated id, choice names are unique, every plan ref names a block and a choice of it, every choice (read as `exerciseOf` makes it) names a concept and at least one step (each in a track of
   its concepts; a warm-up needs neither, and says its `warmUpPart`), no choice sets a key or a tempo and no exercise with `moves` mentions a selector (`movesCheck.ts`), a named step that has a ladder has a tool sitting on it, and a tool of a concept with steps sets its
   level or stage, and no exercise names another day or week.
   Then `npm run -s gen:json-index`, so the folder's `index.gen.ts` imports the new file.
4. A block: `npm run -s db:seed-blocks` (check `DATABASE_URL` in `.env.local` first). A block
   already in the database whose file changed gets its `revision` raised by one; an unchanged file changes nothing.
   A block's own videos (`blocks.videos`) are kept; one whose tool cell moved (a tool added, removed or swapped) is
   dropped and printed, and its cell has to be pointed at a video again (`src/features/contentVideos/README.md`). A plan is never stored: it stays a file, read by /demo, /admin/content/library and tests.

A tool whose concept has steps sets `level` (or picks the tune or run by stage), never raw settings, so the step can
be read back. Every file meets the writing rules below.

## Showcases

A block may have `"showcase"`: `blocks` (a chart per step), `pick` (a voice melody chosen by `pick`), `progression`
(one progression worked several ways), `stages` (a choice as a tempo ladder) or `variants` (a choice whose chips each
set a key and a position). The prompt names each of the five by its file id, the id it is stored under in the library
(`showcaseBlocks()` in `plan/model/prompt.ts`; `promptCore.ts`, which the browser's authoring guide builds on, never imports the seed), so an agent can `get_block` it before using that feature.

## Writing rules

- Every exercise (in a plan too) is tagged: `area` its area (one of the plan's areas; ear training is `theory`),
  `tags` 1 to 3 kinds from `EXERCISE_TAGS` in `plan/model/tools.ts`, `topic` the questionnaire topic it practises
  (`plan/intake/topics.ts`, always one of its area), `concepts` of that topic and `steps` in their tracks. The page
  shows the tags as hashtags after the title.
- A plan has a `progress`: the notes the AI keeps on the student after that week, one line per topic the plan's
  exercises use (`<Topic label>: where they stand. Next: …`), under 300 words. The student never sees it; the next
  prompt sends it back.
- A warm-up (DayShape2) is a block with `"kind": "warm-up"` and `"warmUpPart": 1 | 2 | 3` in its `exercise`: a short
  drill (1 to 2 minutes; the run of a day is 5 to 8) that opens the voice or the guitar part of a day. It is no step on
  the path: its choices have `"steps": []`, and it needs no concept. `warmUpPart` is its place in the run: voice 1
  breath, 2 lip rolls, 3 scales and intervals; guitar 1 loose hands, 2 the spider and picking, 3 finger work. A choice's
  `level` is the lowest level that gets it (`new` for everyone). The composer picks it by its kind, one of each part,
  turning with the date (`plan/model/warmUp.ts`); one with `"key": "any"` in its `moves` opens in a key of the exercises that follow it or a key a fifth away, another one each time it comes round; the title names the drill, never "Warm-up". The path's own block of a
  drill (the spider) stays a separate file: `kind` is the block's, not a choice's.
- An exercise stands alone: the composer hands out one block at a time, so its title, headings, text and why name no
  other day or week ("day 2", "yesterday", "this week"; `dayRefs.ts`). A plan's `summary`, `progress` and day themes may.
- Pasted, it parses with zero warnings: real tools and props only (`COMPONENT_DOCS`), links only to attunr pages,
  picks that match a tune exactly.
- An exercise is a block: `title`, an optional `choice`, `cells` (text, list, notice, tool, section). A `section` cell holds a
  `heading`, `minutes` when it is a timed block, a `choice` when its tools change, and its own `cells`. No `focus`; the
  title may end with hashtags (`#guitar #beginner #technique`) that stand for the fields.
- One block per exercise. The same drill at another level or over another range (another path step, other keys or
  tempos in `moves`, more minutes) is another choice in the same file, never a copy. Every choice shows the same words
  and tools, except for its `set` (tool props laid over the block's tools: `{ "<tool type>": { … } }` for every tool of
  that type, `{ "#n": { … } }` for the n-th tool cell from `#0`) and its `params` (the words that fill `{{=name}}` in the
  title, headings and text; every choice fills every one) (`plan/model/choiceSet.ts`). When more than a phrase per
  section, the why or a tool must differ by level, write separate blocks. Another tool or another
  drill is a new block: never edit one block into another. A choice that isn't ready is
  `"draft": true`, kept inactive.
- A drill that works in other keys or at other tempos states `moves` on its choice: `"key": "any"`
  when it can be played in any key (left out when the key is the lesson, as with open chord shapes), and
  `"bpm": { "from": 60, "to": 90, "step": 10 }` for the tempos it makes sense in. Its tools are written at the start:
  the key the drill is first learned in and the `from` tempo (a later, faster section keeps its distance: 20 above
  stays 20 above). The app gives each player a version (a key of theirs, a faster tempo once they found it easy) and
  draws the selector and its line itself. So such an exercise has no choice that sets a key or a tempo, its text never
  mentions a selector, and where its title, a heading or the text names the key or the tempo it writes `{{=key}}` or
  `{{=bpm}}` ("{{=key}} minor pentatonic", "the metronome is at {{=bpm}}"), never the value itself. A tool that must
  keep its own key or tempo lists the part in `pinned`.
- Over 5 minutes: at least two sections with `minutes`, of 2 to 5 minutes each, adding up to the exercise's
  minutes; consecutive blocks change something real (tempo, key, position, which note is lit, the task).
- Singing or playing, never both. Singing exercises never mention the instrument (drones, the backing track and a backing-track
  are fine); playing exercises never ask to sing. A bare singing drill is one block of at most 3 minutes.
- Every note a step names (`{{3}}`, `{{c-sharp}}`) is lit in the tool after it; the root is never muted; a fresh tool
  after a step whenever the focus changes. Staffs in non-singing exercises set `"mic": false`.
- Two layers, never the same list: `enable` for the notes in play (absent: all), `highlight` for the few that matter
  among them (the roots, the note just added). `others` only with `enable`.
- Every exercise, alone or in a plan, has at least one `learnBefore` lesson. If no course section fits, a planned (stub) section is
  added to the course for it first.
- A sung or played pattern (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, and a line of its own
  says what stays the same in this drill ("When you change the key, the notes change but the drop is still an octave.").
  The same drill in more keys is `moves` with `"key": "any"` (above): the app brings the next key, so the text says
  what stays the same in another key and names no selector. A new key with a new task is a later block or another
  tool. (Older files give the section a `choice` with an option per key and name "the Key selector"; that shape is
  still read, and no longer written.)
- A choice takes one drill up in stages or across variants, without a copy of its tools per version, for a position, a
  scale or a level (a key or a tempo is `moves`, above; a tempo ladder as a choice is the older shape). `"label": "stage"`
  when each option is harder than the last (the next level of a tool): the text says what a stage feels like before the next and
  what to do when one is too hard. `"label": "variant"` when the options are equals to compare (one pattern in two keys
  or positions): the text says what to look or listen for between them. The text names the selector by its label ("Use
  the Stage selector below to change the tempo"), never a chip, sits above the selector, says what Play starts again
  after a change, and names no tempo, key or position as the only one.
- A line written between underscores is underlined on the page. It is a care line only (don't reach for high notes, don't
  push, stop when it hurts): one short sentence on a line of its own, at most one in an exercise. A beginner's singing
  exercise has one where the singer could wander up the staff, with the words "reach for high notes", which the app explains.
- A tool that takes a `level` is set to the exercise's level or to its own harder settings, never left at an easier default. To let the student step up, a choice with `level` options (easiest first, option 1 the level the tool is written at) sits before the tool; its chips are stages, so the text names "the Stage selector" and says what the next stage adds, not the level's name.
- No mental shortcuts: the short name a teacher would say is written out the first time ("play position 1 of the A minor
  pentatonic scale", not "play position 1"; where a run starts, which way it goes and where it turns, not "up and down").
- Whatever the app plays under the learner is "the backing track", never "the band" or "the backing".
- When a drill is got starts "Practice until …" or names the goal ("The goal of this practice is …"), never "Stay
  with it until" or "Keep going until". Hand repetition names muscle memory, an explained word.
- The staff is never explained in the text (no "the five lines of music"): the app explains the word.
- A chord in the text is a chord token (`{{chord:I}}`, `{{chord:V7}}`), never a bare number ("the 1 chord", "the 1, 4
  and 5"). The first time a text counts chords it says each the long way: "{{chord:I}} is the 1st chord of the key,
  built on {{1}}"; after that the token or "the 1st chord".
- In a block with `moves`, the line about another key opens with `{{?key}}` (a line about another tempo with `{{?bpm}}`):
  the app shows it only when that selector is there.
- Slow first: a beginner's sung tune or backing track is 40 to 65 bpm, starting at 40 (melody-singer's `bpm`). The text
  never explains a slow tempo: the app writes that line at 50 bpm or under. A tune is learned in stages the
  text names: with the tune, the tune muted (Tune) over the chords, then the chords muted too (Chords), a cappella (an explained word, only for
  the stage with every sound off).
- The tool is set to show what the text says it shows (fingers in the text: no `show: "pick"` on the finger-pattern).
- A position's number is not a description: no bare "position 1". The first time a text names a position it says the
  scale and what is on the screen ("the neck with the notes of the A minor pentatonic scale: each dot is a note to
  play"). One position on the screen: no number, in the title and headings too. Two or more to tell apart: the number,
  with its scale the first time.
- A text may hold line breaks (`\n`): what to do, the next thing to try and what to notice each start a new line.
- The text names a control by the label on the screen and a button as a button ("the Play button"), one control to a sentence, and says what it starts and where it is; it never carries frets,
  fingerings or note lists the tool shows. The way from one position to the next is a position-neck with `cross`.
- No guitar-play-along `repeats` (it loops; the exercise's minutes are the timer). Styles are at most one sentence of colour.
- Plans: 3 to 7 days (7 for a week of daily practice, fewer for a week of fewer, longer practice days), each adding up to the answers' `minutes` (±2), 2 to 5 exercises, warm-up first and something musical
  last, no two exercises with the same tag side by side, the week's key skill on at least three days in new forms.
  A plan of three or more exercises a day from day 2 on holds a mix exercise (a block on a `Mix:` step of the path)
  where the week's material has one.
