# Versions of the writing rules

Three documents carry a version, each raised by one when a rule changes what an AI writes (see "Version" in `AGENTS.md`):

- **Prompt**: the AI plan prompt (`prompt.ts`), the authoring guide built from it (`agentBlocks.ts`) and the page's tools for the browser's AI (`agentTools.ts`, `ui/useBlockAgentTools.ts`). `PROMPT_VERSION` in `prompt.ts`. Examples don't carry it.
- **Teaching**: the four teaching skills (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`), one shared `version:`. `DOC_VERSIONS.teaching` in `library/seed/versions.ts`.
- **AGENTS.md**: `Version:` in `AGENTS.md`. `DOC_VERSIONS.agents`.

Add an entry here in the same commit that raises a version, newest first: the version, the date, what changed. A test holds the newest entry of each section to its number in code.

## Prompt

### 18 (2026-11-24)

- Writing rules: whatever the app plays under the student (the drums and bass of a backing-band, a backing-track, a song-chart, the chords under a guitar-play-along) is "the backing track" in the text, never "the band" or "the backing". "Which tool for what" says "backing track" where it said "band".
- Writing rules: no mental shortcuts. The short name a teacher would say is written out the first time ("play position 1 of the A minor pentatonic scale", not "play position 1"; where a run starts, which way it goes and where it turns, not "up and down").

### 17 (2026-11-24)

- Writing rules: a position's number is not a description. No bare "position 1": the first time a text names a position it says the scale and what is on the screen; an exercise with one position on the screen names no number, in its title and headings too; a number comes in only where there are two or more positions to tell apart, with its scale the first time.
- The rule that scale shapes are "positions" no longer gives "position 1" as its example.

### 16 (2026-11-22)

- A new shape of `guitar-play-along`, `interval` (LibraryGrowth4): one interval, or a few in turn, as a shape on the neck, its two notes played one after the other, one note a beat, in a major key. Props `key`, `intervals` ("2nd" to "7th", "octave"), `strings` (the lower note's string, then the upper note's: "64" two strings over, "65" the next string, "66" along one string), `direction` ("up", "down", "both"), `walk` ("scale": from every note of the scale along the strings; "note": above and below the key note), `from`, `to`. The app finds every fret; an interval that does not fit its strings within 4 frets is refused with the reason.
- The `melody` shape has a new prop, `octave`: 1 plays the tune an octave higher, and is refused in a key where a note would pass fret 17.
- "Which tool for what": the line for playing a line on the guitar names the interval shape and the melody's `octave`, and says the text names the strings and which note comes first, never the frets.
- The list of each concept's steps is unchanged; `intervals-on-neck:1` to `:4` and `:6` now have an interval shape standing for them, and `guitar-melodies:6` a tune of the book that leaps an octave.

### 15 (2026-11-22)

- A new tool, `vowel-guide` (MissingTools14): a drawn mouth shows the vowel to sing ("ah", "eh", "ee", "oh", "oo") and how its shape opens a little as the note climbs; the note plays, the student holds it on that vowel, and a ring fills while the mic hears the voice on the note. Then the next vowel, and after the last vowel the next note up. Props `level`, `climb`, `vowels`, `seconds`, `voice`.
- "Which tool for what" names it in the singing line: keeping a note steady while the vowel changes is vowel-guide. Its mic checks the note only, so the text never says the app hears or checks the vowel, and says to copy the mouth.
- It is in the list of tools that take a `level` (one easy note for new and beginner, up to the first break, across the break) and in the list of mic tools that make an exercise a singing one.
- The list of each concept's steps has a new track, `vowels` ("Vowels", in the Breath & range topic): Five vowels on one note (beginner), Vowels up to the break (intermediate), Vowels across the break (advanced).

### 14 (2026-11-22)

- A new tool, `staff-reading` (MissingTools15): a game that draws one note on the staff for the student to name, by pressing its letter or, with the mic switched on, by singing or playing it in any octave. It says the note and where it sits and asks the next one; no score, no round. Natural notes only. Props `level`, `notes`, `clef`, `mic`.
- "Which tool for what" has a line for it: reading notes from the staff is staff-reading; the text counts lines and spaces from the bottom as the game does and names the buttons by their letters; a staff never asks for a note's name.
- It is in the list of tools that take a `level` (the lines, the spaces, the notes on ledger lines, then all of them) and in the tools allowed in a singing or a playing exercise alike.
- The list of each concept's steps has a new track, `reading-staff` ("Reading the staff", in the Basics topic): Notes on the lines, Notes in the spaces, Mix: lines and spaces, Ledger lines, Every note, The bass clef. `note-names:3` now comes after `reading-staff:2` and `sight-singing:1` after `reading-staff:1`.

### 13 (2026-11-22)

- A new tool, `song-chart` (MissingTools8): a whole song's chords and form as a chart, each section's bars under its name with every change on a bar line, played by the backing band after a bar of count-in, the bar playing lit. Props `key`, `sections`, `form`, `repeat`, `style`, `bpm`, `parts`, `hide`.
- "Which tool for what" has a line for it: a whole song where the form is the lesson is song-chart, each section written once and the order in `form`; `hide` with the keys always on for working a song's chords out by ear. The song is the writer's own progression, never a real song's title, words, or its chords named as that song, and the text names the sections as the chart does.
- It is in the tools whose chords the text may name, in the tools allowed in a singing or a playing exercise alike, and in the tools that sound the beat for a tempo the text names. A song-chart with no `repeat` has no length of its own.
- A chord the band has no voicing for stays on the chart, marked, and the band rests in its bar; a bar that is not a chord at all refuses the chart with the bar named.
- The list of each concept's steps is unchanged; `open-chords:8` and `hearing-changes:5` now have a tool standing for them.

### 12 (2026-11-22)

- A new tool, `double-stops-neck` (MissingTools1): the 3rds or 6ths of one key as pairs on two strings, walked up the neck, each pair with its chord named and that chord's root ringed; a pair sounds when tapped, and Play runs the walk up and back down. Props `key`, `scale`, `interval`, `strings`, `level`, `from`, `to`.
- "Which tool for what": the line for seeing notes on the guitar names it, and says that double stops in time or mixed into a riff stay guitar-play-along grips.
- It is in the list of tools that take a `level`: new and beginner frets 0 to 7, intermediate frets 0 to 12, advanced frets 0 to 17. The interval and the strings are written beside the level.
- The list of each concept's steps is unchanged; `double-stops:2`, `double-stops:3` and `double-stops:5` now have a tool level standing for them.

### 11 (2026-11-22)

- `interval-ears` has a third `kind`, `"change"` (MissingTools3): the I chord plays, then one other chord of a major key, and the student picks the second chord's numeral. Its `level` is the game's own number 1-5 (1 IV and V, 2 adds vi, 3 ii, 4 iii, 5 vii°) or a word (new and beginner 1, intermediate 2, advanced 5).
- `interval-ears` with `kind` `"chord"` takes `qualities`, the chord kinds to ask: the five it had, and now `dim`, `aug`, `sus2`, `sus4`, `add9`, `9`, `13` and `dim7`. Left out, it asks the first five as before.
- "Which tool for what": the ears line says what each kind is for, that a chord change with the answer checked is interval-ears and not a backing-track, and that the text names the game's answers as its buttons show them.
- The list of each concept's steps is unchanged; `hearing-changes:2` and `hearing-changes:3` now have a tool level standing for them.

### 10 (2026-11-22)

- A new tool, `clap-along` (MissingTools2): a one-bar rhythm to clap, tap or strum on muted strings, each hit marked by how close to the beat it lands. Props `level`, `pattern`, `bpm`, `bars`, `input`.
- "Which tool for what" has a line for it: rhythm with no notes is clap-along, and the text counts the rhythm aloud the way the tool writes it.
- It is in the list of tools that take a `level` (quarters, eighths, sixteenths, then hits off the beat), in the tools allowed in a singing or a playing exercise alike, and in the tools that sound the beat for a tempo the text names.
- The list of each concept's steps is unchanged; `beat:1`, `beat:3`, `beat:4` and `beat:6` now have a tool level standing for them.

### 9 (2026-11-19)

- The showcase blocks are named by their library ids (the seed file's id), the ids `get_block` finds, no longer by a content hash.
- Copying a library block: an exercise written or copied is one block by its content and tags; a library block keeps its own fixed id. It no longer says the library counts the use of a copied block.

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

### 10 (2026-11-24)

- `teaching-voice`, "Words about the app": "the backing track" is the one name for whatever the app plays under the learner. It replaces "the band" (a backing-band's drums and bass, a backing-track) and "the backing" (a guitar-play-along). Every seed block, the tool tours, the backing tracks page tour, the teachers' preset notes and the song chart's notice say it.
- `teaching-voice`, "Sentences": no mental shortcuts. The short name a teacher or a player would say is written out the first time a text uses it.
- `review-teaching-text` lists both among what fails; `exercise-example`'s heading example says "Over the backing track". The seed README's writing rules say the same. `course-article` changes only its version.

### 9 (2026-11-24)

- `teaching-voice`, "Words": a position's number is not a description. A bare "position 1" is a shortcut; the first time a text names a position it says the scale and what is on the screen. One position on the screen: no number, in the title and headings too. Two or more to tell apart: the number, with its scale the first time.
- `teaching-voice`, "Sentences": a name the learner hasn't been shown is shorthand too; say what they see or do.
- `review-teaching-text` and `exercise-example` list a bare position number among what fails; `exercise-example`'s example of a title with `{{=key}}` no longer ends in "position 1". The seed README's writing rules say the same. `course-article` changes only its version.

### 8 (2026-11-19)

- Choices: `exercise-example` has "The file: one block and its choices". `exercise` holds what every way of playing a drill shares; each choice in `choices` has its `name`, `level`, `steps`, `moves` and `minutes`. One block per exercise: another level or range of the same drill is a choice, not a copy. Words that must differ by level are separate blocks. Another tool or another drill is a new block: never edit one block into another. A choice that isn't ready is `draft`.
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
