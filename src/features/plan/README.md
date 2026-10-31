# AI practice plan

`/plan`: a continuous daily practice plan, written by the player's own AI (ChatGPT, Claude, Gemini…). attunr never calls
an AI: it writes the prompt, the player pastes it into theirs, and pastes the reply back. Everything is stored in the
browser.

## The player's path

1. **Start** opens one step modal (`ui/PlanFlow.tsx`, mode `"start"`): the questionnaire (`ui/Questionnaire.tsx`): a level per
   area (Guitar, Voice, Theory & ear, each skippable), one 1-5 star concept screen per area that isn't skipped, your voice
   (with *Find my range*) if Voice isn't skipped, this week's focus (up to 3), minutes a day, notes and styles. Then *Copy your prompt*,
   then *Paste its reply*. Every screen has the same fixed height (the body scrolls inside), so Back and Next never move.
   **Build my plan** is enabled once the reply parses.
2. **The week** (`ui/WeekView.tsx`): seven day buttons; any day can be opened, days ahead are dashed and marked "coming up". The day's
   exercises are a list of sections: title, focus ("A minor pentatonic · boxes 1 & 2"), how, steps, why, a countdown
   timer (chimes and ticks the exercise at zero; with timed blocks it shows "block 2 of 4 · 2:41", ticks at each block and marks the current block's heading), Done.
3. **Tools in the section**: each exercise carries 1–2 `tools`, set up by the AI, with nothing to configure: a scale's
   boxes on the neck, chord shapes, a staff with live pitch for singing, a folded play-along band (one Play for only the
   chosen click / drone / drums / bass), or the notes / ear games with their settings hidden. A `link` is an
   "Open page" link for more.
4. **Plan next week** (mode `"next"`, any time; a banner shows it once the week is over): how did it go, then every
   questionnaire screen again, prefilled with the stored answers, then copy the prompt (it carries this week's exercises,
   done or skipped, the notes and up to three earlier weeks), paste.
5. **Start anew**: the first flow again; its prompt leaves out past weeks. Earlier plans stay listed and can be restarted.
6. **Reminders**: a daily browser notification at a chosen time while any attunr tab is open.

## Code map

```
model/            pure, no React; tested in model/plan.test.ts
  types.ts        PlanAnswers, PlanConfig (what the AI returns), StoredPlan, PlanState (the stored document)
  questions.ts    the questionnaire's choices and defaults
  catalogue.ts    the attunr pages a plan may link to; checkLink() keeps only those
  tools.ts        THE one file for what an exercise is made of, like an MCP server: TOOLS (one parse per learning component; description and props come from the components' COMPONENT_DOCS), the section kinds, tags, link resources, derivedMinutes; the prompt's interface is generated from it; legacySections reads older plans
  migrate.ts      migrateTool(): old tool names (scale, chords, sing, band, comp, notes, ears) to today's components
  config.ts       parsePlanConfig(): the pasted reply to a checked PlanConfig, with warnings
  prompt.ts       buildPrompt(), weekReport()
  schedule.ts     local dates, today's day, progress, when the week is over
store/
  PlanStore.ts    the storage interface: load() / save() of one PlanState
  localPlanStore.ts  the localStorage implementation ("musickit.plan"), with sanitising
  usePlan.tsx     the hook the UI uses, and PlanStoreProvider to swap the store
examples/         the example library: exercises/*.json, plans/*.json (standalone JSON), index.ts loads them; see its README
ui/               PlanFlow, Questionnaire (the question screens), PromptAndPaste, WeekView, Sections (an exercise's sections in order), ExerciseTimer, ExerciseTool
PlanApp.tsx       the page body: no plan → Start; a plan → header, week, history; the flow modal
reminders.ts, PracticeReminder.tsx   notifications (PracticeReminder is mounted in PageShell, on every page)
```

## Storage, and moving to an API

The UI only talks to `PlanStore`. To keep plans on a server, write a `PlanStore` whose `load`/`save` call the API and
wrap the page in `<PlanStoreProvider store={apiStore}>`. `PracticeReminder` reads `localPlanStore` directly; point it at
the same store. The open flow (step, answers, pasted text) is kept in `sessionStorage` (`musickit.plan.flow`) so a
reload doesn't lose it; that one stays local.

## The plan format

The prompt asks for one JSON object, exactly seven days. An exercise is a linear list of `sections`, shown in order:
`heading`, `text`, `list` (numbered steps), `tool` (one of the tools below, set up) and `link` (an attunr page). A tool sits
right after the text it belongs to, so a step that needs another view just adds another tool.

```json
{ "title": "…", "summary": "…", "days": [ { "theme": "…", "exercises": [
  { "title": "…", "focus": "A minor pentatonic · boxes 1 & 2", "minutes": 8, "tags": ["technique"], "why": "…",
    "sections": [
      { "type": "text", "text": "…" },
      { "type": "tool", "tool": { "type": "backing-band", "bpm": 60, "key": "a", "parts": ["click", "drone"] } },
      { "type": "list", "items": ["…"] },
      { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2], "highlight": ["1"] } },
      { "type": "link", "href": "/theory/scales/minor-pentatonic/a" } ] } ] } ] }
```

On paste: a code fence or prose around it is fine; minutes are clamped to 1–120; sections and tools that can't be shown
(unknown scale, unreadable chord, unknown link) are left out with a warning; unknown tags are dropped; fewer than seven
days or an empty day is refused. Plans pasted before sections (`how`, `steps`, `tools` with a `step`, `link`) are read as
sections, a step followed by its tools; plans stored that way are converted on display (`sectionsOf`).

## The prompt

`prompt.ts` writes the student section from the answers (per area: level, then its concepts as `Major scale ★★☆☆☆`, or
`(unsure)` when unrated; voice type and range in note names; focus; minutes; notes; styles marked "flavour only"), then the
rules for good exercises (build on high ratings, drill low or unsure, follow `buildsOn`, singing keys inside the range; one
skill each; `minutes` are the truth and a play-along loops until stopped; exercises over 5 minutes in 2+ timed blocks, each
block changing something real; sing or play, never both; longer singing made musical; every named note lit, the root never
muted, one chart per step; intervals inside an octave unless tagged `multi-octave`; a progression practised several ways;
no genre-driven plans), a "Common mistakes" list of wrong → right pairs (box far from open chords, wrong degree highlighted,
chord tones as prose, muted Do, one chart for five steps, 12 minutes of one tool, sing-and-play, timer vs text),
then the interface, generated from
`model/tools.ts`: every section kind and tool as name, description and `inputSchema` (as an MCP server lists tools), and the
pages a link may go to as a few URI templates (`/theory/scales/{scale}/{key}`, `/course/{stage}/{section}`).

The prompt is built as labelled parts (`promptParts`: intro, student, earlier weeks, how to plan, rules, mistakes,
exercise format, section and tool interfaces, links, answer format, one `example:<id>` part per example); `buildPrompt` joins them.

Examples come from the library (`examples/`), chosen by `model/exampleSelection.ts` (`selectExamples`): per non-skipped area the
exercise at its level (plus the next level when at least 70% of that level's concepts are rated 4-5), the `blocks` and
`progression` showcases always, the `pick` showcase only with Voice, and one whole plan (most shared areas, then closest
level). Each prints as `### Example: <id>`, `Why it's good: <note>` and its JSON; the plan comes last, under the answer format.
A typical prompt (guitar intermediate + theory beginner) is about 63,000 characters, 23,000 of them the plan example. The dev prompt studio (`src/features/devtools`, `/dev/prompt`) shows, edits and runs them part by part.

## Tools

The AI writes an exercise's text and its tools in the same list; the page draws only from the tools. So the prompt makes
them agree: every note the text plays is in the scale or its `add`, any outside note is named as outside, with why.

Notes on a neck or staff have four states (`noteState` in `exercises/cues/visibility.ts`): hidden, muted, normal,
highlighted. The AI lists `highlight`, `mute` and `hide` as degrees or note names (`"c-sharp"`, read against the key, or
the chord on `arpeggio-neck`); `others` (`normal` / `muted` / `hidden`, old `dimmed` reads as `muted`) sets the rest.
Notes in `add` are highlighted without muting the scale. `scale-neck` and `arpeggio-neck` take a `placement` instead of
`boxes` (`exercises/cues/placement.ts`): `{ by: "open" | "fret" | "root" | "box" | "chords" }`; `chords` is resolved on
paste from the exercise's chord-shapes or play-along (`resolveChordPlacement`: open voicing → open, barre → the first
chord's fret). Not yet: `placement` on the shapes' per-chord `place`, and `mute` / `hide` / note names on `play-along`
(it keeps chord-relative degree `highlight`, `others` muted or hidden).

Notes in an exercise's text are written `{{3}}` (a degree) or `{{c-sharp}}` (a note name) and drawn as the fretboard's
dot inline (`ui/InlineNote.tsx`, the same `NoteDot` the necks use): coloured by degree, labelled by the global label
setting (`useLabelSystem`), the other name on hover, played on tap. `model/noteText.ts` splits the tokens out and reads
them against the root of the tool after the text (else the one before); a token it can't read stays as text.

The tools are the learning components of `src/features/exercises` (see its README): `scale-neck`, `chord-shapes`,
`staff`, `click-drone`, `backing-band`, `note-finder`, `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer`
and the guided `play-along` (one shape: `progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`,
`solo-over`). The prompt lists them from `COMPONENT_DOCS`, the debug panel shows each one's short doc (open it for the
prop table). `melody-singer` and `run-singer` take a `pick` ({ difficulty, stage, index }, `theory/melodyPick.ts`) instead of a number; it is resolved at parse (never stored) and a pick that matched no tune exactly warns. The exercise's `minutes` is what the timer follows. Headings with `minutes` start timed blocks (`blocks.ts`); on paste the block minutes are scaled to add up to the exercise's, and an exercise over 5 minutes with fewer than two blocks gets a warning. An exercise that asks the student to both sing and play their instrument also warns (`checks.ts`, `mixesSingAndPlay`), a narrow heuristic: singing is a mic tool (`melody-singer`, `run-singer`, a `staff` without `mic: false`) or the word "sing" in text; playing is text only ("play", "strum", "pick the strings", "find it on the guitar"), so an instrument tool shown as a visual doesn't count. Play-along, "press Play" and the app or backing playing are ignored. A play-along's `under` picks what sounds under single
notes (the chords held by default). In development each tool shows its name above it (`DevName`).
Three tools are stubs, for the course's dexterity basics: `finger-pattern` (the spider), `picking-drill` and
`legato-trill`. The AI can use them now; until their real views exist they show a "Stub exercise: …" box with their settings.

Old stored or pasted tools are migrated before parsing (`model/migrate.ts`): `scale` → `scale-neck`, `chords` →
`chord-shapes`, `sing` → `staff` with the mic, `band` → `backing-band`, `notes` → `note-finder`, `ears` →
`interval-ears`, `comp` → a `play-along` progression on the neck. Stored sections are parsed again on display.

To add one: the component with its `@component` doc, its parse in `TOOLS` in `model/tools.ts`, a view in
`ui/ExerciseTool.tsx` (lazy-load anything with its own sound engine), and a test.

## Explained words

Hard words in an exercise's text and steps ("comp", "guide tones", "eighths"…) get a dotted underline and an (i) with a
one-line meaning and a link to the course article. The AI writes plain text; `explain()` in
`src/features/course/glossary.ts` finds the terms (plurals, -ing forms, multi-word and hyphenated) and marks each once
per exercise. To add a word: an entry in `GLOSSARY`, and an article; if there is none yet, add an empty `section()` to
the course and point at it. The prompt lists the terms with their meanings (generated from `GLOSSARY`) and asks the
AI to use them by name without defining them.

## Example library

`examples/` (its own README): hand-tuned exercises (one per area and level, plus three rule showcases) and four 7-day
plans, as standalone JSON with metadata (`areas`, `level`, `concepts`, `note`). `examples.test.ts` checks every one
pastes with zero warnings and keeps the exercise rules: blocks, sing or play, named notes lit, root never muted.

## Concepts

`model/concepts.ts` is the catalogue the questionnaire rates: `CONCEPTS` (per area, easiest first, with `buildsOn` and a
`course` link), `AREAS`, `conceptsFor(area, level)` (that level and the one below) and `conceptById`.

### Course sections to write

Empty `section()` stubs added so concept links resolve: matching-a-pitch and breath-and-holding-a-note (stage 3),
augmented-chords, diminished-chords, chords-in-pop-rock, chords-in-folk (stage 7), singing-leaps, sight-singing,
harmony-line, vocal-runs (stage 6), fast-runs, stretching-your-range, improvising-a-melody (stage 9).
