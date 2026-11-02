---
name: exercise-example
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
4. **Write it.**
   - `why` is one sentence: what the drill trains and why it works, so the learner could make up the next one. Sections start with the first block, so don't repeat the why there. The blocks themselves model "make it your own": the same drill, with one thing changed each time.
   - Each text step says which control to press and where it is ("Press Play below to start the metronome"), then what to play or sing.
   - Mark every note the text names as `{{3}}` or `{{c-sharp}}`, and light it in the tool right after. `enable` lists the notes in play and `highlight` the few that matter. Never give both the same notes. Never mute the root.
   - An exercise is singing or playing, never both. A singing staff has `labels`, and a non-singing staff has `"mic": false`.
   - Every exercise is tagged (the card shows them as chips, and the AI copies them): `"level"` = the file's `level`, `"area"` = its area (in a guitar + theory plan, ear and theory drills are `"theory"`), `"tags"` = 1 to 3 kinds from `EXERCISE_TAGS` (`model/tools.ts`: ear, sing, rhythm, technique, theory, improv, song, multi-octave). Write them as `"level": "beginner", "area": "voice", "tags": ["sing", "ear"]` right after `minutes`; `examples.test.ts` checks level and area match the metadata.
   - Every example has at least one `learnBefore`: the course section(s) that teach what the drill uses (`/course/<stage>/<section>`, from `src/features/course/stages`). A planned stub section counts. If nothing fits, add a stub section to the right stage first (a *planned* section in the **course-article** skill: `section(slug, title, topic, about)` with no blocks), then link it.
   - A sung or played pattern (Do Mi Sol, a leap, a tune, guide tones) comes back in a second key, in a later block or another staff/tool, with one plain line such as "The notes change, the pattern doesn't." Check the key fits the voice or the position with `npm run -s theory`.
   - `note` (metadata) is one or two sentences on why this is a good example: what each block does and which rule it shows off.
5. **Register and test.** Add a static import to `examples/index.ts`, then:
   ```
   TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)
   $TSX --test src/features/plan/examples/*.test.ts src/features/plan/model/*.test.ts
   ```
6. **Read it in the app.** Paste it into `/plan` (dev server). Read every step against the tool under it: are the notes it names lit, does the tempo match, is the timer what the text says? A test passing is not the same as a good example. Then run the **review-teaching-text** skill on it.

## A rule the example can't meet

If the example can't meet a rule because a tool can't show something, don't bend the text to fit. A tool option is missing. Tell the user which tool needs it and what the example needed.
