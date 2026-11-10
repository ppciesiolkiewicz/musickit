# AI practice plan

`/plan`: a continuous daily practice plan, written by the player's own AI (ChatGPT, Claude, Gemini…). attunr never calls
an AI: it writes the prompt, the player pastes it into theirs, and pastes the reply back. Everything is stored in the
browser.

## The player's path

1. **Start** opens one step modal (`ui/PlanFlow.tsx`, mode `"start"`): the first questionnaire (`intake/`, see its
   README): what you play (Guitar, Voice, Theory & ear), one screen per chosen area with its six topics, each answered by
   picking the one line of four that sounds like you (or left unanswered), your voice (with *Find my range*) if Voice is
   chosen, minutes a day, notes and styles. It only has to get week 1 roughly right. Then *Send your prompt to an AI*,
   then *Paste your AI's reply*. Every screen has the same fixed height (the body scrolls inside), so Back and Next never move.
   **Build my plan** is enabled once the reply parses.
   The prompt step is a choice of two cards of the same shape, one open at a time (`CopyPrompt`, `ui/PromptAndPaste.tsx`):
   **Let your AI extension do it** (Recommended, in colour; open first with WebMCP) for an AI extension or AI browser
   (Claude in Chrome, Gemini in Chrome, ChatGPT Atlas, Comet…): four numbered steps, the words to paste into it (with a
   copy button) and the prompt as plain page text, which the AI extension reads before it fills the labelled reply box.
   **Use any AI chat**: four numbered steps, Copy prompt and Show prompt in the first. The flow's dialog is StepModal
   `medium`. The prompt's debug lists live on /dev/prompt only. Where the browser has WebMCP (`document.modelContext`, Chrome behind a flag, or a
   polyfill), `ui/useBrowserAgentTools.ts` offers two tools while the flow is open: `get_practice_plan_prompt` and
   `submit_practice_plan`; a submitted plan lands in the paste box on the paste step, and the AI reads back
   `agentReply()` (`model/fixRequest.ts`): refused and why, or the warnings to fix and send again. The player still
   presses Build my plan. The prompt it reads starts with `PROMPT_VIA_TOOLS` (`model/agentTools.ts`): send the JSON
   with the tool instead of replying with a code block. The register and feature check live in `@/lib/webmcp`.
   **Exercise tools on every page** (`ui/AgentExerciseTools.tsx`, mounted in `PageShell`): with WebMCP the browser's AI
   also gets `list_exercise_tools` (the prompt's own `toolInterface()`), `show_exercise_tool({ tool })` (checked with
   `parseToolDiag`, opened in a dialog, `ui/AgentToolModal.tsx`; the AI reads back what was changed or why not) and
   `close_exercise_tool`. Without WebMCP nothing is loaded; the parser and views load on first call.
2. **The week** (`ui/WeekView.tsx`): seven day buttons; any day can be opened, days ahead are dashed and marked "coming up". The day's
   exercises are colour-coded cards (a hue per position, tags keep their own colour): title in the display face, focus
   ("A minor pentatonic · boxes 1 & 2"), the level (outlined chip), area and kind tags (a phone shows only the focus), sections (timed headings show their minutes), why, and five stars, "How did it go?" (1 Can't do it yet … 5 Easy now: the
   scale in `src/features/progress/stars.ts`). Rating an exercise marks it done; tapping the same star again clears both
   (`ratePlan`; ratings in `StoredPlan.rated`, done ticks still in `StoredPlan.done`, which older plans only have).
   Every rating also goes to the **progress log** (`src/features/progress`, one row per rated exercise, by exercise id),
   which outlives the plan history.
   **One floating day timer** (`ui/DayTimer.tsx`, bottom right) counts down the whole day's minutes: it starts by itself
   for the day shown on page load, can be paused, resumed and reset, shows the exercise the time falls in (`model/dayClock.ts`)
   and lifts that card a little (no tag: the timer is a guide), and chimes at zero. On a phone it is one short row: ring,
   time left, the exercise's own time and number, the buttons side by side. Its used seconds are saved in the plan (`StoredPlan.elapsed`, per day)
   every 5 seconds, on pause and when the tab hides, so a reload or a later visit picks up where it stopped. There is no
   per-exercise timer.
   No settings column: the exercises set their own keys and always count from the scale's root (`FixedLabelRoot`), so the
   only setting is the Labels dropdown, floating over the day timer in the bottom-right corner; on a phone it sits in the
   header row with the reminder instead.
3. **Tools in the section**: each exercise carries 1–2 `tools`, set up by the AI, with nothing to configure: a scale's
   boxes on the neck, chord shapes, a staff with live pitch for singing, a folded play-along band (one Play for only the
   chosen click / drone / drums / bass), or the notes / ear games with their settings hidden. Links sit in two slots:
   "Learn before" at the top (prerequisite lessons) and "Explore more" at the bottom (going deeper), each shown as
   "Learn <the page's name>" and opening in a new tab. On a phone a link shows only the page's short name (`linkLabel(…,
   true)`: a course section's `short` title).
4. **Plan next week** (mode `"next"`, any time; a banner shows it once the week is over): how did it go, minutes, notes
   and styles, then copy the prompt, paste. The topic screens are not shown again (the week's stars say more), except
   once for an area with no answered topic (answers kept from before the topics) and when the player taps *Change my
   answers*. The prompt carries this week's exercises grouped by topic with their stars or "skipped", the notes, the
   **AI's own progress summary** from the last plan, and the course sections the student rated
   (`features/course/ratings.ts`). The summary is the AI's memory of the student: it returns one with every plan
   (`PlanConfig.progress`), the app stores it with the plan and never shows it (only `/dev/data` does), and the next
   prompt sends it back in place of the earlier weeks. The prompt uses the newest summary any stored plan has (a reply
   may come without one), with the weeks practised since it in full; with no summary at all, the two weeks before this
   one go in full. An earlier plan started again keeps the running plan's summary (`restartPlan`).
5. **Start anew**: the first flow again; its prompt leaves out past weeks. Earlier plans stay listed and can be restarted.
6. **Reminders**: a daily browser notification at a chosen time while any attunr tab is open. Switching it on shows one notification straight away, so the player sees one get through; a permission taken back in the browser shows as blocked.

## Demos

`/demo` lists every demo in `DEMO_PLANS`. `/demo/guitar-beginner`, `/demo/voice-beginner`, `/demo/guitar-intermediate` and `/demo/voice-intermediate` each open a hand-tuned example plan (`demos.ts`, `DemoPlan.tsx`) from day 1, kept in memory only (a swapped-in `PlanStore`), so a pitch can link to a finished plan. Not indexed; canonical is `/plan`.

## Code map

```
model/            pure, no React; tested in model/plan.test.ts
  types.ts        PlanAnswers, PlanConfig (what the AI returns), StoredPlan, PlanState (the stored document)
  questions.ts    LEVELS (what an exercise is pitched at), labelOf()
  catalogue.ts    the attunr pages a plan may link to; checkLink() keeps only those; linkLabel() names a link's page
  tools.ts        THE one file for what an exercise is made of, like an MCP server: TOOLS (one parse per learning component; description and props come from the components' COMPONENT_DOCS), the section kinds, tags, link resources; the prompt's interface is generated from it; legacySections reads older plans
  migrate.ts      migrateTool(): old tool names (scale, chords, sing, band, comp, notes, ears) to today's components; linkSlots(): an exercise's links in its two slots, old `link` sections and fields as "Explore more"; toolFromLink()
  concepts.ts     the fine concepts exercises are tagged with, per area and level; each belongs to one questionnaire topic
  exerciseIds.ts  randomId(), withExerciseIds(): an id on every exercise of a plan
  progressLog.ts  entryFor(), backfill(): a plan's ratings as progress-log rows
  blocks.ts       blocksOf(), fitBlocks(), blockAt(): an exercise's timed blocks
  stepChoice.ts   applyOption(), choiceWarnings(): a step-choice's picked option set on the step's other tools; transpose.ts moves a tool to another key
  checks.ts       mixesSingAndPlay(), tempoWithoutMetronome(): paste-time exercise checks
  fixRequest.ts   fixRequest(warnings): the message the "Copy fix request" button copies, to paste back to the AI; agentReply(): what a browser AI reads back after submit_practice_plan
  exampleSelection.ts  selectExamples(): all exercise examples + the plan example for the player's level
  config.ts       parsePlanConfig(): the pasted reply to a checked PlanConfig, with warnings
  prompt.ts       buildPrompt(answers, entries, previous, course), weekByTopic(), weekReport()
  schedule.ts     local dates, today's day, progress, when the week is over, startPlan(), ratePlan()
  dayClock.ts     dayClock(): a day's countdown, which exercise its elapsed time falls in; elapsedOf()
intake/           the first questionnaire, its own feature: topics.ts (18 topics, four lines each), answers.ts (PlanAnswers, migrateAnswers(), levelOf()), ui/ (the screens, RangeFinder); see its README
store/
  PlanStore.ts    the storage interface: load() / save() of one PlanState
  localPlanStore.ts  the localStorage implementation ("musickit.plan"), with sanitising
  usePlan.tsx     the hook the UI uses, and PlanStoreProvider to swap the store
examples/         the example library: exercises/*.json, plans/*.json (standalone JSON), index.ts loads them; see its README
ui/               PlanFlow, PromptAndPaste, WeekView, Sections (an exercise's sections in order, each headed step ending in a small "Top of exercise" button that scrolls back to its card; under a SectionAside, the /dev/examples review view, each tool is framed with its type and each step is ruled off; every tool has its own tour button, `ToolTour` from `features/guide`, walking `TOOL_TOURS` inside that tool only, and only the first unseen one on the page wobbles), DayTimer (the floating day countdown), ExerciseTool
PlanApp.tsx       the page body: no plan → Start; a plan → header, week, history, a Back to top button; the flow modal
reminders.ts, PracticeReminder.tsx   notifications (PracticeReminder is mounted in PageShell, on every page)
```

## Storage, and moving to an API

The UI only talks to `PlanStore`. To keep plans on a server, write a `PlanStore` whose `load`/`save` call the API and
wrap the page in `<PlanStoreProvider store={apiStore}>`. `PracticeReminder` reads `localPlanStore` directly; point it at
the same store. The open flow (step, answers, pasted text) is kept in `sessionStorage` (`musickit.plan.flow`) so a
reload doesn't lose it; that one stays local.

The progress log has its own store with the same idea (`src/features/progress`: `ProgressStore`, `localProgressStore`
under `musickit.progress`, `useProgress`, `ProgressStoreProvider`). Exercises get their ids when a plan starts
(`startPlan`), new ones each time, also for a plan used again from the history; plans stored before ids get them on load.
Loading saves back at once whatever it changed (ids, answers moved to the topic shape); the document as it was before
the first such save is kept once under `musickit.plan.backup`.

## The plan format

The prompt asks for one JSON object, exactly seven days. An exercise is a linear list of `sections`, shown in order:
`heading`, `text`, `list` (numbered steps) and `tool` (one of the tools below, set up). A tool sits right after the text it
belongs to, so a step that needs another view just adds another tool. Links are not sections: `learnBefore` (at least one lesson to
read first) and `exploreMore` (going deeper), up to 3 attunr hrefs each; the app shows each with the page's real name.

```json
{ "title": "…", "summary": "…", "days": [ { "theme": "…", "exercises": [
  { "title": "…", "focus": "A minor pentatonic · boxes 1 & 2", "minutes": 8, "level": "beginner", "area": "guitar", "tags": ["technique"], "why": "…",
    "learnBefore": ["/course/5/pentatonic"],
    "sections": [
      { "type": "text", "text": "…" },
      { "type": "tool", "tool": { "type": "backing-band", "bpm": 60, "key": "a", "parts": { "click": "on", "drone": "on" } } },
      { "type": "list", "items": ["…"] },
      { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2], "highlight": ["1"] } } ],
    "exploreMore": ["/theory/scales/minor-pentatonic/a"] } ] } ] }
```

On paste: a code fence or prose around it is fine; minutes are clamped to 1–120. The parser is forgiving, but it says
so: everything it changes or drops is a warning in `parsePlanConfig` (`config.ts`), worded to be pasted back to the AI.
Left out, with why (`parseToolDiag`, `parseSectionDiag`): a tool of an unknown type, or one that can't be shown ("left out a
scale-neck (unknown scale "x")": each parser in `TOOLS` names its reason where it returns null, `no(d, why)`), an empty
section, an unknown link, unknown tags or concepts. Cut: a text at 700 characters, a heading 100, a list item 240, a list at
8 items, 24 sections, 8 exercises, `add` notes at 4, chord lists at 8 or 16, kind tags at 3 (the implied `multi-octave` is
added after the cut); the schemas in `SECTIONS` carry the same limits (`maxLength`), so the prompt states them. A default
standing in for something the AI got wrong or left out is named ("backing-band had no key; used A."): `key` and `bpm` of a
`backing-band`, `bpm` of `strum-along`, `guitar-play-along` and the technique stubs, a staff's `voice` (tenor, the prompt's
default), an out-of-range `bpm`, `fret` or `cents`; the documented defaults of optional props (an `interval-singer` left
without a key, a staff `click` without a `bpm`) are silent when left out and warn only when the value is wrong. A list prop that lost entries it couldn't read names them (`scale-neck "highlight" had entries it could not read (9, "x"); left them out.`): `boxes`, `positions`, `enable`, `highlight`, `mute`, `hide`, a staff's `notes`, `add`, `strings`, an `interval-singer`'s `intervals` and `keys`, an `arpeggio-neck`'s `part`, a backing band's or track's `parts` and `mute`, a scale-neck's `parts` (`lost` in `tools.ts`; duplicates are no loss); a step-choice names the options it left out. Numbers in the degree lists are removed from pasted input before parsing (the AI's `3` means the 3rd, not 3 semitones) and reported, saying to write degrees as strings ("3", "b7"). No voice-range check exists on purpose: every singing tool places its notes inside the voice by construction (the staff, runs, tunes and interval-singer fit the key to the range), so no key can be out of range. Rules the prompt
states are checked: an exercise with more than 6 tools or with no `learnBefore` link left, a day with fewer than 2 or more than
5 exercises. Stored plans (`stored: true`, `sectionsOf`, `legacySections`) are parsed the same way but never warn, and
`parseTool` and `parseSection` keep their plain signatures. Beside the warnings the paste step has a "Copy fix request" button
(`ui/PromptAndPaste.tsx`) that copies `fixRequest(warnings)`: the app checked the plan, these are the problems, send the whole
plan again as one JSON block. An exercise without a
known `level` (new, beginner, intermediate, advanced), `area` (guitar, voice, theory) or kind tag (`EXERCISE_TAGS`)
warns (`exerciseLevelArea`, `exerciseTags` in `tools.ts`); fewer than seven
days or an empty day is refused. Plans pasted before sections (`how`, `steps`, `tools` with a `step`, `link`) are read as
sections, a step followed by its tools; plans stored that way are converted on display (`sectionsOf`). An old `link`
(a `link` section, or the field before sections when it doesn't stand for a tool) goes to "Explore more" (`linkSlots`).

## The prompt

`prompt.ts` writes the student section from the answers (per area: a rough level worked out from the answers, then each
topic with the line the student picked, or `(not answered)`; voice type and range in note names; minutes; notes; styles
marked "flavour only"), on a next week the week by topic (`weekByTopic`) and the AI's last progress summary, then how to
plan (from the lines picked; how to keep the progress summary: one line per topic, rewritten each week, ratings over
starting answers, under about 300 words) and the
rules for good exercises (singing keys inside the range; one
skill each; `minutes` are the truth and a guitar-play-along or backing-track loops until stopped; exercises over 5 minutes in 2+ timed blocks, each
block changing something real; sing or play, never both; longer singing made musical; every named note lit, the root never
muted, one chart per step; intervals inside an octave unless tagged `multi-octave`; a progression practised several ways;
no genre-driven plans), a "Common mistakes" list of wrong → right pairs (box far from open chords, wrong degree highlighted,
chord tones as prose, muted Do, one chart for five steps, 12 minutes of one tool, sing-and-play, timer vs text, a why
paragraph, repeat counts and poetic lines, jargon), "How to write an exercise" (drills first with at most one sentence of
why in `why`; how to use the app over technique; playful, no repeat counts, one action per sentence; targets say which
chord they land on; syllables only with a reason; "position" for scale shapes; "the staff", explained for beginners;
non-singing staffs in tenor), then the interface, generated from
`model/tools.ts`: every section kind and tool as name, description and `inputSchema` (as an MCP server lists tools), and the
pages a link may go to as a few URI templates (`/theory/scales/{scale}/{key}`, `/course/{stage}/{section}`).

The prompt is built as labelled parts (`promptParts`: intro, student, earlier weeks, how to plan; then the definitions: exercise format, the section interface, which tool for what (every tool by what the student does;
`prompt.test.ts` fails when a tool is missing from it), the tool interface, links; then the rules that use them: rules, mistakes, how to write; then one `example:<id>` part per example; the answer format last, ending with a short final check the AI runs over its plan; each rule is stated once, and a skipped questionnaire makes the first reply the questions), `buildPrompt` joins them.

Examples come from the library (`examples/`), chosen by `model/exampleSelection.ts` (`selectExamples`): every exercise
example, each labelled `For: <area>, level <level>` under a heading telling the AI to pitch at the student's levels, and
one whole plan fitted to the player (most shared areas, then closest level). Each prints as `### Example: <id>`,
`Why it's good: <note>` and its JSON; the plan comes last, under `## Example plan`, followed by the answer format (a short TS `PlanConfig` type for the reply).
A typical prompt (guitar intermediate + theory beginner) is about 87,000 characters, 23,000 of them the plan example. The dev prompt studio (`src/features/devtools`, `/dev/prompt`) shows, edits and runs them part by part.

## Tools

The AI writes an exercise's text and its tools in the same list; the page draws only from the tools. So the prompt makes
them agree: every note the text plays is in the scale or its `add`, any outside note is named as outside, with why.

Notes on a neck or staff have four states (`noteState` in `exercises/cues/visibility.ts`): hidden, muted, normal,
highlighted, from two layers the AI sets apart: `enable` (the notes the student plays; absent: all) and `highlight` (the
few of interest among them, ringed; it never mutes anything). It lists them, and `mute` and `hide`, as degrees or note
names (`"c-sharp"`, read against the key, or the chord on `arpeggio-neck`); `others` (`muted` / `hidden`, old `dimmed`
reads as `muted`) sets the notes not enabled. A plan from before `enable` with a `highlight` and `others` muted or hidden
meant "only these": it parses as that `enable` (`layersOf`). Notes in `add` are highlighted without muting the scale.
`scale-neck` and `arpeggio-neck` take a `placement` instead of `boxes` (`exercises/cues/placement.ts`): `{ by: "open" | "fret" | "root" | "box" | "chords" }`; `chords` is resolved on
paste from the exercise's chord-shapes or guitar-play-along (`resolveChordPlacement`: open voicing → open, barre → the first
chord's fret). Not yet: `placement` on the shapes' per-chord `place`, and `mute` / `hide` / note names on `guitar-play-along`
(it keeps chord-relative degree `enable` and `highlight`, `others` muted or hidden).

Notes in an exercise's text are written `{{3}}` (a degree) or `{{c-sharp}}` (a note name) and drawn as the fretboard's
dot inline (`ui/InlineNote.tsx`, the same `NoteDot` the necks use): coloured by degree, labelled by the global label
setting (`useLabelSystem`), the other name on hover, played on tap. `model/noteText.ts` splits the tokens out and reads
them against the root of the tool after the text (else the one before); a token it can't read stays as text. A line
written between underscores (`_Don't reach for high notes._`) is a care line: `markRuns` (same file) pairs the
underscores across notes and explained words, and `ui/Sections.tsx` draws the line over a low band of amber. The words
"reach for high notes" are in `GLOSSARY`, so the app adds the (i) and the link to the lesson by itself.

The tools are the learning components of `src/features/exercises` (see its README): `scale-neck`, `chord-shapes`,
`staff`, `backing-band` (`parts`: each part offered, mapped to `"on"`, `"off"` or `"always"`), `note-finder`, `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer`, `string-singer`, `breathwork` (`drill`; `from` and `to` kept only for farinelli, `seconds` and `rounds` only for the others; it can't change key with a `step-choice`), `strum-along`,
`backing-track` (the backing tracks player, drums, bass and keys: a curated `progression` id or the lesson's own `numerals`
(pasted `chords` are read into numerals in the `key` at parse, so moving the key moves them), `key`, optional `style`,
`bpm` and `parts` (drums, bass, keys, each `"on"`, `"off"` or `"always"`, a part left out silent with no row; an older
`mute` list reads as those parts `"off"`; all `"on"` stores no `parts`); with neither a known progression nor chords the tool
is dropped; an old `chord-backing` migrates to one with the ballad style and the bass `"off"`; nothing is saved, so it opens as the plan set it; a "band" part
of its step) and the guided `guitar-play-along` (one shape: `progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`,
`solo-over`). The prompt lists them from `COMPONENT_DOCS`, the debug panel shows each one's short doc (open it for the
prop table). `melody-singer` and `run-singer` take a `pick` ({ difficulty, stage, index }, `theory/melodyPick.ts`) instead of a number; it is resolved at parse (never stored) and a pick that matched no tune exactly warns. The exercises' `minutes` add up to the day timer. Headings with `minutes` start timed blocks (`blocks.ts`); on paste the block minutes are scaled to add up to the exercise's, and an exercise over 5 minutes with fewer than two blocks gets a warning. An exercise that asks the student to both sing and play their instrument also warns (`checks.ts`, `mixesSingAndPlay`), a narrow heuristic: singing is a mic tool (`melody-singer`, `run-singer`, `string-singer`, a `staff` without `mic: false`) or the word "sing" in text; playing is text only ("play", "strum", "pick the strings", "find it on the guitar"), so an instrument tool shown as a visual doesn't count. Play-along, "press Play" and the app or backing playing are ignored. An exercise whose text asks for a tempo ("60 bpm", "play it at 80") but shows no tool that sounds the beat (a `backing-band` offering its click or drums, `play-along`, `strum-along`) warns too (`tempoWithoutMetronome`); the stubs' `bpm` is no metronome. A `strum-along` `pattern` (one bar of D / U / . strokes, 1-4 a beat) is kept only when it fills the bar evenly, rewritten with a `|` between beats; otherwise dropped (a down a beat). A `staff` can carry its own backing (`drone`, `click`, `bpm`; `PracticeBand` `view="inline"`, with its own Play beside the staff's "Start microphone"). Each step (a heading and what follows) is an `ExerciseStep` (`src/components/practice/exerciseStep.tsx`): when its tools have more than one kind of thing to start (the mic and a drone, the mic and chords) a "Start exercise" button above the first tool starts them all and "Stop exercise" stops them all, so a singing exercise says "Press Start exercise below" instead of pairing a `backing-band` with a staff; the prompt prefers it and keeps `backing-band` for a drone or click with no mic listening. A staff with its `click` counts as a metronome for `tempoWithoutMetronome`. A `step-choice` tool lists 2-4 `options`, one chip each; an option holds parts (`key` stored as a pitch class, `bpm`, `position`), the same parts in every option, and option 1 is how the step's tools are written. It is drawn as chips where it sits in the step (`exercises/basics/step-choice`, written right before the tool it moves): with `label` `"stage"` or `"variant"` the chips read "Stage 1", "Variant 2" over what each sets ("A · 80 bpm · Position 2"); without a label, for options of one part, the row is named Key, Tempo or Position and the chips show the values. `Sections` owns the picked option (an index), and `applyOption` (`model/stepChoice.ts`, one `PARTS` entry per part) sets every other tool in the step: a key moves them by the same interval (`model/transpose.ts`: keys, chord names, a play-along shape's `key`/`chord`/`chords` at any depth; degrees stay), a tempo is set on every tool that has one (a staff only with its click; a backing-track within its own range), a position on a `scale-neck`'s `boxes` and a `position-neck`'s `positions` (not one with `cross`). The tools remount so what played stops, and the `{{3}}` dots in the step's text follow, since they read the moved tools. On paste (`choiceWarnings`) a step warns for a second step-choice, no tool to move, a key with a tool that can't change key (an ear game, a run), a tempo or position no tool in the step has, or an option 1 that isn't how the tools are written; the parser drops options it can't read or that hold other parts than option 1, keeps 4, and names a chooser of several parts "variant" when it has no label. A step-choice doesn't count toward the 6 tools. It replaced `key-choice` (2026-11-10): a `key-choice`, pasted or stored, is read as a step-choice with an option per key (`migrateTool`), and a heading's `keys`, the form before that, become one before the step's first tool (`liftHeadingKeys`). A `scale-neck` takes `parts` like a band's (`positions`, `neck`, each `"on"`, `"off"` or `"always"`, a part left out not drawn): the whole neck lies above the position boxes with the same marks (`enable`, `highlight`, `add`) and the shown position framed, and chips show or hide the parts that aren't `"always"`; with `parts` the older `neck` / `positions` booleans (the scales page's guitar section, kept for the studio's Scale widget, no marks) are not stored. A staff's `labels` (`degree` or `solfege`) labels its notes whatever the student's label setting; a staff with the mic and no `labels` never shows bare note names (degrees when the setting is note names; `staffLabelSystem` in `theory/labels.ts`). The prompt asks for `labels` on every mic staff, and `examples/staffLabels.test.ts` checks every mic staff in the examples shows labels. A play-along's `under` picks what sounds under single
notes (the chords held by default). In development each tool shows its name above it (`DevName`).
Three tools are stubs, for the course's dexterity basics: `finger-pattern` (the spider), `picking-drill` and
`legato-trill`. The AI can use them now; until their real views exist they show a "Stub exercise: …" box with their settings.

Old stored or pasted tools are migrated before parsing (`model/migrate.ts`): `scale` → `scale-neck`, `chords` →
`chord-shapes`, `sing` → `staff` with the mic, `band` → `backing-band`, `click-drone` → `backing-band` with its click and drone (a list of `parts` reads as each `"on"`), `notes` → `note-finder`, `ears` →
`interval-ears`, `play-along` → `guitar-play-along`, `comp` → a `guitar-play-along` progression on the neck. Stored sections are parsed again on display.

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
