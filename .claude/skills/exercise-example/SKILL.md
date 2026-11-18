---
name: exercise-example
version: 7
description: Write or fix a seed exercise (block) or 7-day plan file in src/features/library/seed - what agents find in the library and copy - so it meets every writing rule and reads well against its tools. Use when asked to add, write, improve or fix a seed exercise or plan, or a showcase.
---

# Seed exercises and plans

Agents look these up in the library (`find_blocks`, `get_block`, `find_plans`, `get_plan`) and copy them as the standard, so any flaw in them shows up in every plan written after. Write the text as the **teaching-voice** skill says. Read that skill first.

## Read before writing (each time, since they change)

- `src/features/library/seed/README.md` ("Adding one" and "Writing rules") and `seed/CLAUDE.md`: the file format, the metadata, and the rules every seed file meets.
- `src/features/plan/model/prompt.ts`, the parts `rules`, `mistakes` and `writing`. These are the rules the AI follows, so a seed file must follow them too. The wrong → right pairs in `mistakes` are the quickest check.
- `src/features/exercises/docs/docs.generated.json` (or the `*.props.ts` files) for each tool's real props. Only use tools and props listed there.
- One existing block from the same area and level, as a model for length and pacing: look with the library tools (`find_blocks`, then `get_block`; `get_plan` for a whole week), preferring the ones whose `versions.teaching` is the current one (`docs_teaching`).

## Steps

1. **Pick the gap.** Read `library_coverage` and the steps on `/dev/path`: find an area × level × concept or path step, or showcase kind, that nothing covers yet. `concepts` ids come from `model/concepts.ts`, links from `model/catalogue.ts`. Never invent either.
2. **Get the facts from the calculator.** Run `npm run -s theory -- …` for the key, scale, positions and chords. Check that the notes the text names are really in the scale or chord.
3. **Shape the sections.** An exercise is a block: a `title`, an optional `choice`, and `cells` (text, list, notice, tool, section). A `section` cell has a `heading`, its own `cells`, `minutes` when it is a timed block, and a `choice` when its tools change key, tempo, position or level. Over 5 minutes means two or more sections with `minutes` (2–5 each) that add up to the exercise `minutes`. Each block changes one real thing: tempo, key, position, which notes are lit, or the task. Write the block plan as one line per section before writing any JSON.
4. **Write it.** The rules below are grouped by what they are about; a seed file meets all of them.

   *The why, the title, the headings*
   - `why` is one sentence: what the drill trains and why it works, so the learner could make up the next one. Sections start with the first block, so don't repeat the why there. The blocks themselves model "make it your own": the same drill, with one thing changed each time. A why that only says the skill matters is not a why:
     - Wrong: "Matching one note and holding it steady is the base every other singing skill stands on."
     - Right: "When your note matches the drone, the two blend into one sound, so the drone tells you when you are on the note."
     - Wrong: "Joining positions turns five separate shapes into one neck you can move along mid-phrase."
     - Right: "Position 2 starts on the notes where position 1 ends, so one slide along one string carries a phrase from the first into the second."
   - `title` names what is practised in the learner's words; it may end with hashtags for the metadata (`#guitar #beginner #technique`), which the app reads into the fields. There is no `focus`: the title and the first text say what the drill is. Each section's heading names its task in five words or fewer.
   - An exercise stands alone. The app hands out one block at a time, on any day, so its title, headings, text and why name no other day or week: no "day 2", "yesterday", "this week", "next week", "the week's". Say what to play, not when it was first played ("The Do to Sol run, twice as fast", not "Day 2's run, twice as fast"), and name the drill a block builds on by what it is ("the hammer-on drill"). A plan's `summary`, `progress` and day `theme` may name days: they don't travel with the block. `seed check` fails an exercise that names a day.

   *The steps*
   - Each text step says which control to press and where it is ("Press Play below to start the metronome"), then what to play or sing. Controls and game answers carry the label the screen shows (see "Words about the app" in **teaching-voice**): read it in the tool's component before you name it.
   - Each block carries at most one extra line beyond the doing, and it is one of: a feel to reach ("until your fingers find the next note without you looking"), what to do when it goes wrong ("if a change comes late, keep strumming and catch the next beat 1"), the sense it trains, or a variation to try. Not all four.

   *The tools and the notes they light*
   - Pick each tool from "Which tool for what" in `prompt.ts`, not from the block you are copying: the way from one position to the next is a position-neck with `cross`, a listening exercise for any instrument hears its chords from a backing-track, a tempo in the text has a tool sounding it. The text never carries what the tool shows: no fret numbers, no fingerings, no note lists.
   - A part the exercise depends on is `"always"` in `parts` (the drone in a drone exercise); a strum-along gets the `pattern` the text describes.
   - Mark every note the text names as `{{3}}` or `{{c-sharp}}`, and light it in the tool right after. `enable` lists the notes in play and `highlight` the few that matter. Never give both the same notes. Never mute the root.

   *Singing*
   - An exercise is singing or playing, never both. A singing staff has `labels`, and a non-singing staff has `"mic": false`.
   - Keep the singer's range to the level. The staff runs from the lowest Do in the voice's range up to its top, and `mute`/`hide` take a degree away in every octave, so they can't drop only the high notes: the key and the text do that. For a new or beginner singer, every note the text asks for sits three semitones or more under the top of the range (`tenor`: A4 at most). Pick a key where the drill fits low (a tenor's Do Mi Sol fits in C, D and A; in F and G it reaches C5 or B4), or say where to start ("from the low {{1}}"), and give any high note on "oo", which is easier up high than "ah". An intermediate exercise can open eased, the drill in a lower key on "oo", then open the full range in a later staff (see `voice-intermediate-leaps`). Advanced uses the whole range. Check a staff's notes with `buildLadder` in `src/features/theory/singing.ts`.

   - The staff still shows the notes above the ones a beginner's drill asks for, so where the singer could wander up (the first staff of a plan, a slide, a tune they make up, a skip up to Sol) the text carries the underlined care line ("The underlined line" in **teaching-voice**): `_Don't reach for high notes: sing only where your voice feels easy._`, on a line of its own, at most one in an exercise, with the words "reach for high notes" kept and the rest varied. Underline nothing else.

   *Moves: other keys, other tempos*
   - A drill that works in other keys or at other tempos states `moves` on the exercise, beside `cells`: `"moves": { "key": "any", "bpm": { "from": 60, "to": 90, "step": 10 } }`. `"key": "any"` when it can be played in any key; leave it out when the key is the lesson (open chord shapes, a song in its key). `bpm` is the range of tempos the drill makes sense in, `from` the tempo its first tool is written at. Write the tools at the start: the key the drill is first learned in (check where it sits with `npm run -s theory`) and the `from` tempo; a later, faster section keeps its distance. A tool that must not follow lists the part in `"pinned"`.
   - The app gives each player a version of the exercise (a key of theirs, a faster tempo once they found it easy, the earlier ones kept as chips) and draws the selector and the line about it itself. So an exercise with `moves` has no `choice` that sets a key or a tempo, and its text never mentions a selector.
   - Where the title, a heading or the text names the key or the tempo, write the param, never the value: `"{{=key}} minor pentatonic, position 1"`, `"Press Play below to start the metronome at {{=bpm}}."` A heading names the task, not the tempo ("Over the band", not "Over a band at 80"). The note dots are unchanged (`{{1}}`, `{{c-sharp}}`).
   - Say what stays the same in another key as a plain line, with no selector in it: "In another key the position sits on other frets, and the roots keep their places inside it."

   *A second key*
   - A sung or played pattern (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, with one plain line, on a line of its own, that says what stays the same in this drill ("When you change the key, the notes change but the drop is still an octave."), never the stock "The notes change, the pattern doesn't." The same drill in other keys is `moves` with `"key": "any"` (above): the app brings the second key, and the text names no selector. A new key with a new task is a later block or another tool. Check each key fits the voice or the position with `npm run -s theory`.

   *Stages and variants*
   - A section's `choice` carries one drill through 2-4 versions without a copy of its tools: `"choice": { "label": "stage", "options": [ … ] }` in the section's header, each option a `scale`, a `position`, a `level`, or several of them (never a `key` or a `bpm`: those are `moves`), and option 1 is how the section's tools are written. A choice with no `options`, only the parts (`"choice": { "key": "a" }`), is open: every tool under it is written in that value and follows it; a tool keeps its own value with `"pinned": ["key"]`. `"label": "stage"` when each option is harder than the last, most often the next level of a tool: say what a stage feels like before the next one, and what to do when a stage is too hard. (`showcase-stages-tempo-ladder` is the older shape, a tempo ladder as a choice: read it for the text, write the tempo as `moves`.) `"label": "variant"` when the options are equals to compare, such as one pattern in two keys or positions (`showcase-variants-same-frets`): say what to look or listen for between them; don't ask the learner to find it.
   - Name the selector, never a chip ("The selector" in **teaching-voice**): "When every answer comes without counting, try the next stage. Use the Stage selector below to change it, then press Start to begin the game again." A change restarts the block's tools, so say what Play starts again. All of a block's text that names the selector sits in the text above it, with line breaks between the drill, the invitation and what to do when it goes wrong; no text about the selector comes after the tools. The text of a block with a step-choice names no tempo, key or position as the only one; `focus` lists them all.
   - A change that needs new words or a new task is a later block, not a chip.

   *The metadata*
   - Every exercise is tagged (the card shows them as chips, and the AI copies them): `"area"` = its area (in a guitar + theory plan, ear and theory drills are `"theory"`), `"tags"` = 1 to 3 kinds from `EXERCISE_TAGS` (`model/tools.ts`: ear, sing, rhythm, technique, theory, improv, song, multi-octave). Write them as `"area": "voice", "tags": ["sing", "ear"]` right after `minutes`; the level is the highest of the exercise's path steps (the parser sets it).
   - Every exercise has at least one `learnBefore`: the course section(s) that teach what the drill uses (`/course/<stage>/<section>`, from `src/features/course/stages`). A planned stub section counts. If nothing fits, add a stub section to the right stage first (a *planned* section in the **course-article** skill: `section(slug, title, topic, about)` with no blocks), then link it.
   - `note` (metadata) is one or two sentences on why this is a good model: what each block does and which rule it shows off.
5. **Write the file and gate it.** A new file is `plans/<id>.json` or `blocks/<id>.json` in `src/features/library/seed` (shape and `versions` in the seed README), with `note` saying the gap in one line. Then:
   ```
   npm run -s seed -- check <file>
   npm run -s gen:json-index
   ```
   `check` says ✔ when the file reads with no parser warning, its `versions` are the current ones, every exercise names a concept and a path step, and a tool of a concept with steps sets its level or stage. `gen:json-index` makes the folder's `index.gen.ts` import the new file. Run the tests of what you touched too (`$TSX --test src/features/library/seed/*.test.ts src/features/plan/model/*.test.ts`, with `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)`).
6. **Read it in the app.** Open `/dev/library?item=<id>` on the dev server: it draws the plan or block with its real tools and touches no stored plan. Read every step against the tool under it: are the notes it names lit, does the tempo match, is the control where the text says, is the timer what the text says? A test passing is not the same as a good exercise. Then run the **review-teaching-text** skill on it. If the dev server won't build because of another session's work, say so in your report: don't claim the file was read in the app.

## Rewriting a seed file that exists

A rewrite keeps the file, its `id`, `area`, `topic`, `concepts`, `steps` and minutes, so nothing that points at it breaks. Do it in this order:

1. Read the old file against the list below and write down what fails, one line each. If nothing fails, leave it alone.
2. Fix the tools first (a better tool, a missing `labels`, `pattern`, `choice` or `"always"`), then the text around them.
3. Set `"model"` to your API id and `"versions"` to the versions you wrote it to (`prompt` from `PROMPT_VERSION`, `agents` and `teaching` from `DOC_VERSIONS` in `seed/versions.ts`: the `Version:` in `AGENTS.md` and the `version:` of this skill; `npm run -s seed -- versions` prints them), and rewrite `note` to say what the file now shows off.
4. Steps 5 and 6 above.

What usually fails in an older file:

- The why says the skill matters instead of what makes the drill work.
- A title, step or why that names another day or week ("Day 1's run again", "same frets as yesterday", "keep it for next week").
- The text carries fret numbers or note names the neck already shows ("D, 7th fret").
- A bare "Press Play below." that doesn't say what starts, or two controls in one sentence.
- A chip named or the options listed ("tap G in the Key row", "tap Stage 2 above the tab"), or text about a selector placed after the tools.
- "The notes change, the pattern doesn't." instead of what stays the same in this drill; what to notice not on its own line.
- Two names for the thing practised ("the way across" and "the crossing").
- No feel to reach in any block, or an exact count ("breathe in for four clicks").
- A singing staff with no `labels`; a strum-along with no `pattern`.
- A tool the prompt's "Which tool for what" would not pick (two scale-necks for joining positions, a guitar-play-along in an exercise for any instrument).
- A played or sung pattern that never comes back in a second key.
- A step that chains more than two actions, or asks the learner to discover something ("Which ones sound finished?").
- A singing step that doesn't say what to sing on, hangs the sound inside another instruction instead of its own "sing it on" clause, or puts a high note on "ah" for a beginner.
- "Once you know it" or another unspelled moment to move on, where the feel itself should be said ("once the names come without thinking").
- "Box" or "pattern" for a scale position in a title, heading or step.
- A beginner's slide, made-up tune or skip up to Sol with no underlined care line; an underline used to stress an ordinary instruction.

## A rule the file can't meet

If the file can't meet a rule because a tool can't show something, don't bend the text to fit. A tool option is missing. Tell the user which tool needs it and what the example needed.
