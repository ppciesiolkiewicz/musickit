---
name: exercise-example
version: 2
description: Write or fix a hand-tuned exercise or 7-day plan JSON in src/features/plan/examples - the gold standard the AI plan prompt copies - so it meets every example rule and reads well against its tools. Use when asked to add, write, improve or fix an example exercise or plan, or a showcase.
---

# Exercise and plan examples

The prompt shows these examples to the AI as the standard to copy, so any flaw in them shows up in every generated plan. Write the text as the **teaching-voice** skill says. Read that skill first.

## Read before writing (each time, since they change)

- `src/features/plan/examples/README.md`: the file format, the metadata, and the rules every example meets.
- `src/features/plan/model/prompt.ts`, the parts `rules`, `mistakes` and `writing`. These are the rules the AI follows, so an example must follow them too. The wrong → right pairs in `mistakes` are the quickest check.
- `src/features/exercises/docs/docs.generated.json` (or the `*.props.ts` files) for each tool's real props. Only use tools and props listed there.
- One existing example from the same area and level, as a model for length and pacing.

## Steps

1. **Pick the gap.** Find an area × level × concept, or showcase kind, that no example covers yet. `concepts` ids come from `model/concepts.ts`, links from `model/catalogue.ts`. Never invent either.
2. **Get the facts from the calculator.** Run `npm run -s theory -- …` for the key, scale, positions and chords. Check that the notes the text names are really in the scale or chord.
3. **Shape the blocks.** Over 5 minutes means two or more `heading` blocks with `minutes` (2–5 each) that add up to the exercise `minutes`. Each block changes one real thing: tempo, key, position, which notes are lit, or the task. Write the block plan as one line per block before writing any JSON.
4. **Write it.** The rules below are grouped by what they are about; an example meets all of them.

   *The why, the title, the headings*
   - `why` is one sentence: what the drill trains and why it works, so the learner could make up the next one. Sections start with the first block, so don't repeat the why there. The blocks themselves model "make it your own": the same drill, with one thing changed each time. A why that only says the skill matters is not a why:
     - Wrong: "Matching one note and holding it steady is the base every other singing skill stands on."
     - Right: "When your note matches the drone, the two blend into one sound, so the drone tells you when you are on the note."
     - Wrong: "Joining positions turns five separate shapes into one neck you can move along mid-phrase."
     - Right: "Position 2 starts on the notes where position 1 ends, so one slide along one string carries a phrase from the first into the second."
   - `title` names what is practised in the learner's words. `focus` is the spec line, parts joined with " · ": key and scale, what changes block to block, tempos. Each block heading names its task in five words or fewer.

   *The steps*
   - Each text step says which control to press and where it is ("Press Play below to start the metronome"), then what to play or sing. Controls and game answers carry the label the screen shows (see "Words about the app" in **teaching-voice**): read it in the tool's component before you name it.
   - Each block carries at most one extra line beyond the doing, and it is one of: a feel to reach ("until your fingers find the next note without you looking"), what to do when it goes wrong ("if a change comes late, keep strumming and catch the next beat 1"), the sense it trains, or a variation to try. Not all four.

   *The tools and the notes they light*
   - Pick each tool from "Which tool for what" in `prompt.ts`, not from the example you are copying: the way from one position to the next is a position-neck with `cross`, a listening exercise for any instrument hears its chords from a backing-track, a tempo in the text has a tool sounding it. The text never carries what the tool shows: no fret numbers, no fingerings, no note lists.
   - A part the exercise depends on is `"always"` in `parts` (the drone in a drone exercise); a strum-along gets the `pattern` the text describes.
   - Mark every note the text names as `{{3}}` or `{{c-sharp}}`, and light it in the tool right after. `enable` lists the notes in play and `highlight` the few that matter. Never give both the same notes. Never mute the root.

   *Singing*
   - An exercise is singing or playing, never both. A singing staff has `labels`, and a non-singing staff has `"mic": false`.
   - Keep the singer's range to the level. The staff runs from the lowest Do in the voice's range up to its top, and `mute`/`hide` take a degree away in every octave, so they can't drop only the high notes: the key and the text do that. For a new or beginner singer, every note the text asks for sits three semitones or more under the top of the range (`tenor`: A4 at most). Pick a key where the drill fits low (a tenor's Do Mi Sol fits in C, D and A; in F and G it reaches C5 or B4), or say where to start ("from the low {{1}}"), and give any high note on "oo", which is easier up high than "ah". An intermediate exercise can open eased, the drill in a lower key on "oo", then open the full range in a later staff (see `voice-intermediate-leaps`). Advanced uses the whole range. Check a staff's notes with `buildLadder` in `src/features/theory/singing.ts`.

   *A second key*
   - A sung or played pattern (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, with one plain line, on a line of its own, that says what stays the same in this drill ("When you change the key, the notes change but the drop is still an octave."), never the stock "The notes change, the pattern doesn't." The same drill in 2-4 keys is one block with a `{ "type": "step-choice", "options": [{ "key": "d" }, { "key": "a" }, { "key": "c" }] }` tool right before the tool it moves (the first is the key the block's tools are written in). The text invites and names the selector, never a chip or the keys: "Then sing it in another key. Use the Key selector below to change the key, then press Play to hear the tune there." A new key with a new task is a later block or another tool. Check each key fits the voice or the position with `npm run -s theory`.

   *Stages and variants*
   - A step-choice also carries one drill through 2-4 versions without a copy of its tools: each option sets a `key`, a `bpm`, a `position`, or several of them, and option 1 is how the block's tools are written. `"label": "stage"` when each option is harder than the last, most often a faster tempo (`showcase-stages-tempo-ladder`): say what a stage feels like before the next one, and what to do when a stage is too fast. `"label": "variant"` when the options are equals to compare, such as one pattern in two keys or positions (`showcase-variants-same-frets`): say what to look or listen for between them; don't ask the learner to find it.
   - Name the selector, never a chip ("The selector" in **teaching-voice**): "When every note lands on the click, try a faster stage. Use the Stage selector below to change the tempo, then press Play to start the metronome again." A change restarts the block's tools, so say what Play starts again. All of a block's text that names the selector sits in the text above it, with line breaks between the drill, the invitation and what to do when it goes wrong; no text about the selector comes after the tools. The text of a block with a step-choice names no tempo, key or position as the only one; `focus` lists them all.
   - A change that needs new words or a new task is a later block, not a chip.

   *The metadata*
   - Every exercise is tagged (the card shows them as chips, and the AI copies them): `"level"` = the file's `level`, `"area"` = its area (in a guitar + theory plan, ear and theory drills are `"theory"`), `"tags"` = 1 to 3 kinds from `EXERCISE_TAGS` (`model/tools.ts`: ear, sing, rhythm, technique, theory, improv, song, multi-octave). Write them as `"level": "beginner", "area": "voice", "tags": ["sing", "ear"]` right after `minutes`; `examples.test.ts` checks level and area match the metadata.
   - Every example has at least one `learnBefore`: the course section(s) that teach what the drill uses (`/course/<stage>/<section>`, from `src/features/course/stages`). A planned stub section counts. If nothing fits, add a stub section to the right stage first (a *planned* section in the **course-article** skill: `section(slug, title, topic, about)` with no blocks), then link it.
   - `note` (metadata) is one or two sentences on why this is a good example: what each block does and which rule it shows off.
5. **Register and test.** A new example gets `"updated"`, `"model"` and `"docs"` as in "Rewriting an example that exists" below. Add a static import to `examples/index.ts`, then:
   ```
   TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)
   $TSX --test src/features/plan/examples/*.test.ts src/features/plan/model/*.test.ts
   ```
6. **Read it in the app.** Open `/dev/examples` on the dev server: it draws every example with its real tools and touches no stored plan (pasting into `/plan` replaces the user's own plan in this browser, so don't). Read every step against the tool under it: are the notes it names lit, does the tempo match, is the control where the text says, is the timer what the text says? A test passing is not the same as a good example. Then run the **review-teaching-text** skill on it. If the dev server won't build because of another session's work, say so in your report: don't claim the example was read in the app.

## Rewriting an example that exists

A rewrite keeps the file, its `id`, `level`, `areas`, `topic`, `concepts` and minutes, so nothing that points at it breaks. Do it in this order:

1. Read the old example against the list below and write down what fails, one line each. If nothing fails, leave it alone.
2. Fix the tools first (a better tool, a missing `labels`, `pattern`, `step-choice` or `"always"`), then the text around them.
3. Set `"updated"` to today, `"model"` to your API id and `"docs"` to the versions you wrote it to (`DOC_VERSIONS` in `examples/index.ts`: the `Version:` in `AGENTS.md` and the `version:` of this skill), and rewrite `note` to say what the example now shows off.
4. Steps 5 and 6 above.

What usually fails in an older example:

- The why says the skill matters instead of what makes the drill work.
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
- A singing step that doesn't say what to sing on, or a high note on "ah" for a beginner.
- "Box" or "pattern" for a scale position in a title, heading or step.

## A rule the example can't meet

If the example can't meet a rule because a tool can't show something, don't bend the text to fit. A tool option is missing. Tell the user which tool needs it and what the example needed.
