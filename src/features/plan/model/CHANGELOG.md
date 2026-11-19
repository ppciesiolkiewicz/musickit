# Versions of the writing rules

Three documents carry a version, each raised by one when a rule changes what an AI writes (see "Version" in `AGENTS.md`):

- **Prompt**: the AI plan prompt (`prompt.ts`), the authoring guide built from it (`agentBlocks.ts`) and the page's tools for the browser's AI (`agentTools.ts`, `ui/useBlockAgentTools.ts`). `PROMPT_VERSION` in `prompt.ts`. Examples don't carry it.
- **Teaching**: the four teaching skills (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`), one shared `version:`. `DOC_VERSIONS.teaching` in `library/seed/versions.ts`.
- **AGENTS.md**: `Version:` in `AGENTS.md`. `DOC_VERSIONS.agents`.

Add an entry here in the same commit that raises a version, newest first: the version, the date, what changed. A test holds the newest entry of each section to its number in code.

## Prompt

### 8 (2026-11-19)

- Moves (ChoiceSplit): an exercise that works in other keys or at other tempos states `moves` (`"key": "any"`, `"bpm": { from, to, step }`), with its tools written at the starting key and tempo. The app gives each player a version and writes the selector's line itself.
- An exercise with moves has no choice that sets a key or a tempo, its text never mentions a selector, and it names its key and tempo only as `{{=key}}` and `{{=bpm}}` in the title, headings and text.
- A choice no longer sets a key or a tempo: it is for a position, a scale or a level. The second key of a sung or played pattern is `moves`, not a Key selector on the section; a tempo ladder is `moves`, not a stage choice.
- The exercise interface lists `moves`.

### 7 (2026-11-18)

- `modes` starts at beginner: a new first step, "Major and minor from one root" (bright and dark, the first two modes), after the major scale. Dorian and the steps after it move up one (`modes:1` is now `modes:2`, up to `modes:6`); the seed blocks and `after` refs moved with them.

### 6 (2026-11-18)

- Five new steps in the list of each concept's steps. `breath` has eight in place of four: "A long held note" (beginner), "Hiss, then buzz" and "A long breath out" (intermediate) and "Longer breaths out" (advanced) join the four count steps, so the count steps for 4 to 10 and 4 to 20 are now `breath:4` and `breath:7` (they were 3 and 4). `intervals` ends with "Wider than an octave" (`intervals:8`).
- The seed plans' refs moved with them (`breath:3` to `breath:4`); no seed block named a renumbered step.

### 5 (2026-11-17)

- Examples out: the prompt pastes no example exercise or plan, and `selectExamples` is gone. The examples are seed plans and blocks in `library/seed`, which agents read from the library database.
- The library part, "Find models in the library": before writing, call `player_progress` when a player is in scope, `find_blocks` by the student's current and next step per concept, `get_block` on the closest two or three and write like them, `find_plans` and `get_plan` for one plan's shape; a block that fits may be used as it is; `library_coverage` shows the steps no block practises yet. It searches with `docs_teaching` set to the current teaching version first; from an older block, plan or showcase the agent takes only the tool use and the shape, and writes the text to the prompt's rules. A block reused as it is keeps its area, topic, concepts, steps and tags.
- Showcases by block id: one line per showcase feature names the seed block that shows it, its id computed from the seed file when the prompt is built.
- No ask-first branch: a player who skipped the questionnaire is planned from the default answers and their ratings, and the answer format has no exception for it.
- The browser AI's plan-writing tools are gone (`get_practice_plan_prompt`, `check_practice_plan`, `submit_practice_plan`), and with them their rule, `PROMPT_VIA_TOOLS` (check the plan, fix it, check again, then send it with the tool). Players have no outside-AI route to a plan; the block tools for editing a running plan or a note stay.

### 4 (2026-11-16)

- An exercise names its `steps`: 1 to 3 steps of the learning path (`trackId:n`), each in one of its concepts' tracks. It no longer writes a `level`; the app sets it from the steps (the highest of their levels). The answer format lists every concept's steps under its topic, numbered, with their levels.
- A new track, `fingerpicking` (guitar, basic chords), takes the fingerpicking step out of `strumming`, so the concepts listed are 46.
- The 117 seed blocks were raised to 4 without a rewrite: they already named their steps.

### 3 (2026-11-16)

- A new track, `double-stops` (guitar, CAGED topic, before `triads`), so the concepts listed under each topic are 45. The first triads, barre chords, the modes and the first positions on the neck now name steps to learn first; the prompt lists ids only, so only the new id shows in it.

### 2 (2026-11-16)

- The concepts listed under each topic are the tracks of the learning path (`path.ts`, NEW13): 44 in place of 67, several old concepts merged into one track (`top-string-triads` and `triads-every-set` are `triads`). The parser still reads an old id, as its track.

### 1 (2026-11-15)

- The page's tools check before they change anything: `check_practice_plan` beside `submit_practice_plan`, and `check_block` beside `write_block` and `insert_block` on the notes creator and the running plan. Each reads the AI's JSON with the same parser as the write and answers with what it would change or leave out, saving nothing.
- The prompt read through the tools, the authoring guide and the write tools' descriptions tell the AI to check, fix what the check reports, check again until it says nothing to fix, and only then send.

### 0

Everything before the prompt had a version.

## Teaching

### 8 (2026-11-19)

- Choices: `exercise-example` has "The file: one block and its choices". `exercise` holds what every way of playing a drill shares; each choice in `choices` has its `name`, `level`, `steps`, `moves` and `minutes`. One block per exercise: another level or range of the same drill is a choice, not a copy. Words that must differ by level are separate blocks. A change to what the block is (another tool, another drill) is a new block or choice, never an edit. A choice that isn't ready is `draft`.
- `exercise-example`: `moves` and `minutes` sit on the choice, not on the exercise; a rewrite keeps the choices' names.
- The seed README's writing rules and `seed/CLAUDE.md` say the same. `teaching-voice`, `course-article` and `review-teaching-text` change only their version.

### 7 (2026-11-19)

- Moves (ChoiceSplit): `exercise-example` has "Moves: other keys, other tempos" (state `moves`, write the tools at the start, no choice that sets a key or a tempo, no selector in the text, `{{=key}}` and `{{=bpm}}` for the values, a heading that names the task and not the tempo); the second key of a pattern is `moves`; a choice is for a position, a scale or a level.
- `teaching-voice`, "The selector": an exercise with `moves` never mentions a selector; the app writes the line under it.
- `review-teaching-text` checks for a selector, a key or tempo choice, or a written-out key or tempo in an exercise with `moves`.
- The seed README's writing rules say the same; the Key selector on a section and the tempo ladder as a stage choice are the older shape, still read, no longer written.

### 6 (2026-11-18)

An exercise stands alone: its title, headings, text and why name no other day or week ("day 2", "yesterday", "this week"), since the app hands out one block at a time. A plan's summary, progress and day themes may. `seed check` fails an exercise that does (exercise-example, review-teaching-text).

### 5 (2026-11-12)

The block format: `cells` and `section` cells in place of `sections` and headings, a `choice` on a section or the block in place of the `step-choice` tool, hashtags in a title, no `focus`.

### 4 (2026-11-10)

"Sing on" gets its own clause; no "once you know it".

### 3 (2026-11-10)

The underlined care line (`_Don't reach for high notes._`).

### 2 (2026-11-10)

The selector, one control to a sentence, line breaks in a text, no stock lines.

### 1 (2026-11-10)

What was once called the "new teaching style".

### 0

The older style, from before the teaching skills.

## AGENTS.md

### 2 (2026-11-15)

A third version, the prompt's, with this changelog beside it; the history of every version moves here from `AGENTS.md`.

### 1 (2026-11-10)

Versions are kept: this file and the teaching skills carry one, and every example records the two it was written to.

### 0

Everything before versions were kept.
