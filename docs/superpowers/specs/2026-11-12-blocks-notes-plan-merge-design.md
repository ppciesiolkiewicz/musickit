# Blocks: one format for notes and plan exercises (design)

Status: approved. Plan 1 (the block format) is built and merged. Plans 2 (the reader) and 3 (new tools and one family table) are built on `worktree-blocks-notes-plan-merge`; plans 4–6 (block editor and notes creator, plan edited in place, WebMCP block tools) are to come.

## Why

The notes creator (`/teachers/studio?notes=1`) and the AI practice plan (`/plan`) are the same thing twice: text with
music tools between the paragraphs. They share about 15% of their code, one way (the stage reads the plan's tools), and
build the rest twice: fretboard views, text, the JSON format, the parser, the way a browser AI talks to the page.

We want one content format, the **block**: a plan day is a list of blocks, a note is one block. Then:

- a teacher's note can be made by their browser AI from a request, and changed by it;
- a running plan can be changed, by hand and by the AI; an edited exercise starts afresh and loses its rating;
- every widget a teacher can put in a note, the AI can put in a plan, and the other way round;
- both are edited the same way: a column of cells, notebook-style.

The user's words: "one day of a plan consists of multiple blocks and technically one note would be just one block";
"the UI we give to teachers should be easier than to AI"; "skip committing a plan and just let AI rewrite the plan,
and edited exercises just lose their rating"; "if it's ugly or the UX is clunky" it has failed, and "currently it
looks pretty nice".

## Goals

- One format underneath, two front doors. The teacher's door is the palette: families with a few controls and a key.
  The AI's door is the full tool interface (`inputSchema`, enable/highlight/mute/placement). The teacher never sees
  the AI's door; the AI never sees the palette.
- Every widget of the notes creator is a plan tool or a section kind. The stage-only subjects go away from notes.
- Steps are written down: a **section** is a cell that frames other cells, with a heading, minutes and an optional
  choice. The plan's exercises are made of sections; a note may use them or not.
- Same look for both: the article look of today's note (title style, text column, widgets as figures) is the reader
  for a note and for a plan exercise; the plan's chrome (day, timer, stars) sits around it.
- The key selector is a variant of the step choice. One component, three homes: the plan's chips, the note's key bar,
  the studio's Key widget. Global on the block, local in a step.
- Notebook-style editing of a block, used by the notes creator and the plan page.
- The browser AI (WebMCP) can read and write blocks on both pages, through one set of tools, checked by the one parser.
- Nothing old is read. Stored plans, saved stages and shared links from before the format are dropped (the user's
  call: "we don't need to support any old saved data, I can clear it all"); the examples and preset notes in code
  are rewritten. The old-shape readers (`legacySections`, `sectionsOf`'s fallbacks, `migrateTool`, `linkSlots`'s
  old `link`, `layersOf`'s pre-`enable` reading, the stage's `arpLegacyValues`) go.
- The studio keeps its own extra components (camera, screen share, tuner, audio input, and the video kinds for widget videos) on top of the shared families, which it adds as tools like the notes creator does. The Free layout lives only there, and the studio is separate: no AI tools are mounted on it.

## Non-goals

- A review step or a commit. There is no draft: **Build my plan** starts the plan as today, and from then on the
  plan is edited in place.
- Keeping a rating across an edit. An edited exercise is a new exercise.
- Teachers editing a student's plan. The plan stays the player's own, written by their AI. Nothing here shuts a teacher
  out later, but nothing is built for it.
- Cell-level AI tools (replace one section). The AI rewrites a block whole.
- Any change to the studio's recording stage: Free layout, camera, screen share, tuner, audio input, video widgets and
  preview stay as they are. Its palette changes only in what a row stores (a tool where it stored a stage-only
  subject; see "One family table").
- A no-extension path for *editing* (copy / paste) on the plan. Generation keeps both paths; follow-up is the
  extension only.
- A new look. The plan page and a shared note read as they do today.

## Anti-goals

- A page that looks worse or feels clunkier than today's plan page or note. The current look is the bar.
- The teacher's controls growing to match the AI's schema. A family keeps 2–5 controls.
- A rating that silently moves to an exercise it was not given for. An edit clears it; the progress log keeps the old
  row under the old id.
- An edit that loses the day's elapsed time or the untouched exercises' ratings.
- Two ways to group cells (headings and frames side by side). A section is the only group.
- A reader, an editor or a tool depending on data it does not use (see "Interfaces").
- Tools learning about the chooser. They keep receiving plain props (`stepChoice.ts` stays pure).

## The format

A **block** is a title, an optional choice and a list of **cells**. A cell is text, a list, a notice, a tool, or a
**section**: a frame with a heading, minutes, an optional choice and its own cells (one level deep: a section holds no
section). A note and a plan exercise are the same block; the plan's exercises use sections for their steps, a note
may use them or not (the user's words: "they are the same, the plan just uses the section component and the note
doesn't, but a note should be able to add sections").

```json
{ "title": "A minor pentatonic, positions 1 and 2 #guitar #beginner #technique",
  "choice": { "key": "a", "scale": "minor-pentatonic" },
  "cells": [
    { "type": "text", "text": "Two shapes that sit next to each other." },
    { "type": "section", "heading": "Position 1", "minutes": 3,
      "cells": [
        { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "a", "boxes": [1] } },
        { "type": "list", "items": ["Low root up and back.", "Again with the drone."] } ] },
    { "type": "section", "heading": "Position 2, in D", "minutes": 3,
      "choice": { "label": "variant", "options": [ { "key": "d" }, { "key": "a" }, { "key": "e" } ] },
      "cells": [
        { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "d", "boxes": [2], "highlight": ["1"] } },
        { "type": "tool", "tool": { "type": "backing-band", "key": "a", "pinned": ["key"], "bpm": 60, "parts": { "click": "on", "drone": "on" } } } ] } ] }
```

- **Naming** (my call): today's `sections` list becomes `cells`, and `section` is the frame, since that is what the
  user calls it. A `heading` cell no longer exists: a heading is a section's.
- **Hashtags in the title**: `#guitar #beginner #technique` at the end of a title are the exercise's `area`, `level`
  and kind tags. The parser reads them out of the title into the fields (and reads the fields when written as fields;
  both doors write either), and the title is shown without them, the tags after it in small muted type. `focus` is
  removed from the format and the screen: the title and the first text say what to work on ("Breath · in, hold and out
  for the same count · 6 counts growing to 11" goes).

- **Tools are stored complete, as today.** Every tool is written with its own key, scale and tempo; the parsers in
  `TOOLS` stay context-free and unchanged. A choice is a layer on top: an `options` choice is applied on draw by
  `applyOption`, as now, and its tools are written as option 1 (`choiceWarnings` keeps saying so when they
  disagree). An `open` choice holds a value, and the tools under it are written in that value: when the key bar
  moves, the editor rewrites every unpinned tool under it (what the stage's `withMaster` does today), so the cell's
  JSON tab, `read_block`, `show_exercise_tool`, the week report and `{{3}}` all read a complete, current tool. A
  pasted tool written in another value than the open choice above it follows the choice and gets a warning saying
  so ("scale-neck written in G under a block in A; it will follow A"), unless it pins the part.

- **Section**: `{ type: "section", heading, minutes?, choice?, cells }`. Cells outside any section are the block's
  own (a note's prose, an exercise's intro). The cell kinds are `text`, `list`, `tool`, the new `notice`, and
  `section`.
- **Choice**: today's `step-choice` tool, moved from a tool in the step to the section's header (or the block's). Its parts are `key`,
  `bpm`, `position`, `level` (`PARTS` in `stepChoice.ts`) and the new `scale`. Two shapes:
  - `options`: 2–4 chips, every option holding the same parts, exactly as `step-choice` is written today;
  - `open`: written as the parts themselves (`{ "key": "a", "scale": "minor-pentatonic" }`), any value; drawn as a
    picker (key, scale) or a field (tempo). The note's Key & scale is an open choice on the block.
- **Global and local**: the block's `choice` applies to every cell; a section's `choice` wins inside it. A tool follows
  the nearest choice above it for each part it has (`follows` in `PARTS`), unless it names the part in `pinned`
  (`["key"]`, `["bpm"]`…); a pinned part keeps the tool's own value. A tool with no choice above it uses its own value,
  as today, so a block without a choice is exactly a plan exercise of today.
- The rest of the exercise (`why`, `level`, `area`, `tags`, `topic`, `concepts`, `learnBefore`, `exploreMore`,
  `minutes`) stays as it is on `PlanExercise`, apart from `focus`, which goes. On a note every one of them is
  optional.
- `PlanConfig` is unchanged apart from `cells` replacing `sections` on an exercise. A note is one block, stored where
  the stage was stored (`musickit.studio.stage` is left as the studio's; the note gets `musickit.note`), shared the
  same way (`encodeNote`, now of a block), and preset notes (`presetNotes.ts`) are blocks in code.

### What exists today

- **Stored data is not read.** A stored plan without `cells` is dropped by `localPlanStore` on load (the player sees
  Start, as with no plan; the progress log, which has its own store, is kept). A saved stage with a stage-only subject
  is dropped the same way, and a shared note link of the old shape opens with one line saying the note was made
  with an older version. No migration code is written for any of it.
- **Code is rewritten.** The example library (`examples/`) is rewritten to steps in the same change: the examples are
  what the prompt tells the AI to copy, so they are the format. The rewrite is mechanical (a one-off script in the
  scratchpad: a `heading` section opens a `section` cell that runs to the next heading, a `step-choice` tool becomes
  its section's `choice`, sections before the first heading are the block's own cells, `focus` is dropped and
  `area`, `level` and `tags` stay as fields) and `examples.test.ts` checks the new shape. The preset notes
  (`presetNotes.ts`) are rewritten by hand as blocks, with the table below.
- **The teaching version is raised** (`AGENTS.md`: a rule that changes what gets written raises it). The
  `exercise-example` skill and `examples/README.md` describe `heading` sections with `minutes` and a `step-choice`
  tool before the tool it moves; they are rewritten to steps and `choice`, the four teaching skills move together
  (4 → 5) with `DOC_VERSIONS.teaching` in the same commit. Every example keeps its own `docs.teaching` (the user's
  call, 2026-11-12): the mechanical rewrite changes the format, not the text, so an example written to older teaching
  rules is still marked behind on `/dev/examples`. `AGENTS.md`'s own version does not move unless its text changes.

### What each note widget becomes

| Palette row today | Stored as | Work |
| --- | --- | --- |
| Scale (neck, positions), Chord shapes, Staff, Melody, run-singer, backing-track | the plan tool it already is | none |
| Metronome (`band`) | `backing-band` | allow it |
| Text | `text` sections; a `# ` line is the block's `title`, a `## ` line opens a step, a `- ` or `1. ` line a `list` (`parseText`) | small |
| Use headphones | new section kind `notice` (`{ "type": "notice", "notice": "headphones" }`) | small |
| 3 notes per string position | `position-neck` with `kind: "3nps"` | new prop |
| CAGED shape / overview, CAGED compact page | new tool `caged-neck` (`shape`: C A G E D or `overview`) | new tool |
| Arpeggio family, Arpeggios compact page | `arpeggio-neck`, extended: a `show` of `neck` and/or `positions` and `roots` (the root strings), drawn as the arpeggios page draws them; the family's Key / Scale / On / Type make the chord. Everything `arpeggio-neck` has today (any chord, `boxes`, `part`, `placement`, marks, `{{3}}` against the chord root) stays, so the prompt, the examples and `transposeTool` are untouched | extend a tool |
| Relative modes | new tool `relative-modes` | new tool |
| Intervals within each mode | new tool `mode-intervals` | new tool |
| Chords in the key | new tool `key-chords` | new tool |
| Triads | new tool `triads` | new tool |
| Progressions | new tool `progressions` | new tool |
| Sus & extensions (one per degree) | new tool `chord-circle` (`degree`) | new tool |
| Circle of fifths, Piano keys, Improvisation, Tunings | one new tool each | new tools |
| Key & scale | the block's open `choice` | the chooser's `open` shape |
| The 10 full cheatsheet pages | dropped; a block links to the page in `exploreMore` | drop |
| Logo, URL | dropped from notes (studio chrome) | drop |

Every new tool is a learning component in `src/features/exercises` with `COMPONENT_DOCS`, so it enters `TOOLS`, the
prompt's tool interface and "which tool for what" (`prompt.test.ts` fails otherwise), the stage's tool widget, and
`/dev/stories`. The teacher's family for it keeps the controls the palette row has today, no more.

**One family table.** `stage/model/families.ts` stays the only source of families and makes tools for every row
(it makes the stage's own `caged` and `arpeggio` subjects today); the one palette (`Palette.tsx`, `FamilyStep.tsx`)
serves the studio and the notes creator, each filtering the rows it offers. The studio keeps its own extra
components beside the families: **Camera**, **Screen share**, **Tuner** and **Audio input** in the palette, and the
video kinds (`melody`, `countdown`, `intro`, `progress`, `next`) for widget videos, never offered; the notes creator
has none of them. So the studio's palette adds tool widgets where it added stage-only subjects, which its stage
already draws (`STAGE_TOOLS` becomes every tool). The stage-only subjects (`caged`, `arpeggio`, `section`, `bubble`,
`plugin`, `position`, `neck`) are removed from `Subject`, with their renderers and `arpLegacyValues`; the `creator`
plugins they drew with stay only where a new tool's component uses them. `spec/studio.md` says so. The studio's
stage, Free layout and recording are otherwise untouched.

Once the format is one, the plan tools the notes could not show (`backing-band`, `note-finder`, `interval-ears`,
`string-singer`, `interval-singer`, `breathwork`, `guitar-play-along`, `strum-along`, `finger-pattern`,
`picking-drill`, `legato-trill`) are note widgets too, under a palette section of their own, each with a family of
a few controls (the builder picks which props are controls; the rest stay at the parser's defaults).

### The studio (later, minimal interest now)

The studio could store the same structure: a stage as a block plus a **placement** per cell (`x`, `y`, `w`, `h`,
`z`, zoom, as fractions of the frame), so a note or a plan exercise can be opened in the studio and its cells
given positions, with Auto layout for the first ones. The block's choice is the studio's Key widget. Not built in
this project (the user: "studio is of minimal interest now"); the design only keeps the door open: cells carry an
`id` (my call, the editor's drag needs one anyway), so a placement map can key on them later. Until then the studio
keeps its own stage format, Free layout, extras and no AI, and shares only the families and tools.

## What the teacher sees: the notes creator

The notes creator leaves the studio and becomes its own page on the plan's side, built on one **block editor**.
`/teachers/studio?notes=1` and the redirects (`/cheatsheet`, `/creator`, `/theory/cheatsheet`) land on it. The studio
keeps its stage, Free layout and recording widgets, and no longer has a notes mode.

- **One column of cells**, in reading order, the width the Grid with One per row gives today. Canvas (Free) is gone
  from notes; there is no Grid / Free selector and no One per row switch.
- **The block is the outer frame**: its title and its key bar (the open choice: Key, Scale, Labels) in the frame's
  header. **A section is a frame inside it**: heading, minutes and, when it has one, its choice (chips, or a picker)
  in the section's header; the cells inside, indented a little. A note that never adds a section is a plain column.
- **A cell is one section**: text (typed in place; the box keeps working with the browser's and extensions' writing
  helpers, as today), list, notice, or a tool. A tool cell shows the tool as the player will see it, with the
  family's controls under it (the teacher's door) and a **JSON** tab beside them (the full tool, the AI's door, as Edit
  as JSON shows it today). Tags in the cell's corner say what it follows and what is pinned.
- **The gutter** on every cell: a handle (drag; Move up / Move down for a keyboard or a browser AI, named with the
  cell's kind and first words, so the page can be driven by its accessibility tree alone), and on hover: add above,
  add below, delete. **Section** is a row of the palette like any widget; it adds an empty frame. **Add a widget**
  (`/`, ⌘K) opens the palette as today and adds a cell after the selected one, inside its section when it is in one.
- **Share as a note**, **Edit as JSON** (now the block's JSON), and the preset notes stay. The shared note and the
  preset note read as an article, as today (`NoteArticle`, made to read a block), with the block's title and first
  text as the page header.
- The master key, hover tags for pinning, and the Layers list are gone from notes; the cell's follow / pinned tags and
  the step's choice do that job.

## What the player sees: the plan

- **Generation is unchanged**: the questionnaire, Send your prompt (extension or any AI chat), Paste your AI's reply.
- **The plan reads like an article.** One reader for a note and a plan exercise: `NoteArticle`'s look (the title
  style, the text column, widgets as figures), reading a block. A section inside it draws its heading, minutes and
  choice as the plan's step draws them today (the rail, the chips). The plan's card keeps what is the plan's and not
  the block's: why, the links, the hashtags after the title, the stars, and the day timer's lift. Gone from the card:
  the focus line and the level / area / kind chips (they are the title's hashtags now). `Sections.tsx` is retired
  into the reader; "Start exercise" and "Top of exercise" stay as the card's buttons. A staff listens only when its
  tool says `mic`, in a note and in a plan alike.
- **The running plan is edited in place.** The week view gets **Edit** on a day: the day's blocks as the notebook,
  each block the editor above, with the exercise's title (hashtags included), minutes, why and links in the outer
  frame's header; **Done** returns to the week. The player changes a block by hand or asks their extension to
  (`write_block`); a day can gain or lose a block within the 2–5 rule. Warnings from the parser show on the block as
  the paste step shows them, with **Copy fix request**.
- **An edited block is a new exercise**: it gets a new id, so its stars and done tick are cleared and the progress
  log keeps the old row under the old id as history. A block left untouched keeps its id and rating; a block removed
  loses its rating the same way. The day's elapsed time stays (it is the day's, not an exercise's). Next week's
  prompt reports the week as it stands (`weekReport`): a rewritten exercise with its own rating or "skipped".
- No draft, no commit: **Build my plan** starts the plan as today, and the week is editable from the first day.
- The day timer, ratings, Plan next week, Start anew, reminders: unchanged. `Sections` draws a block's
  steps as it draws sections today; a step's choice is drawn where `step-choice` sits now; a block's open choice with
  one option is drawn as the key bar (the note's) only when the block has no exercise metadata, otherwise it is not
  drawn and simply sets the tools (a plan exercise's key is the AI's business, not a control for the player).

## What the AI sees

One set of WebMCP tools (`@/lib/webmcp`), mounted on the notes creator and on the plan page while a plan is running, never on the studio.
The existing `get_practice_plan_prompt` / `submit_practice_plan` (the flow) and `list_exercise_tools` /
`show_exercise_tool` / `close_exercise_tool` (every page) stay.

- `get_authoring_guide()`: the prompt's definitions, rules and examples without the student section (`promptParts`
  minus `student`, `earlier weeks` and `how to plan`), plus one short part on what a note is (a block alone, no days,
  the metadata optional). What the AI reads before writing or editing anything.
- `read_block(where)`: the block's JSON and its current warnings. `where` is nothing on a note, `{ day, exercise }` on
  the running plan (1-based, as the week shows them). `read_plan()` returns the whole week the same way, with each
  exercise's rating, so the AI can see what it is changing.
- `write_block(where, block)`: replaces the block, parsed by the one parser (`parsePlanConfig`'s exercise part), and
  reads back `agentReply()`: what was changed or left out and why, the warnings, or refused (fewer than 2 or more
  than 5 exercises in the day, a block with no `learnBefore` on the plan, no cells). On the plan it is saved at once
  under a new exercise id (the rating rule above); the page shows the new block at once.
- `insert_block(where, block)` and `remove_block(where)` on the running plan, within the 2–5 rule. Not on a note.
- The teacher types their request in the extension's own chat. The notes creator shows, where the plan's prompt step
  does, the one line to paste into the extension ("Read the authoring guide, then write a note about … and submit it
  with write_block"); without WebMCP it shows Edit as JSON as the path, as today.

## Interfaces

Interface segregation (the user's ask): nothing depends on data it does not use. The types, in `plan/model`:

- `Block = { title, choice?, cells }`: the content. What the reader draws, the editor edits, `read_block` /
  `write_block` carry, `encodeNote` shares, a preset note is.
- `ExerciseMeta = { minutes, why?, level?, area?, tags?, topic?, concepts?, learnBefore?, exploreMore? }`: what the
  plan knows about a block. The prompt, the week report, the progress log and the plan's card use it; the reader
  and the editor never see it (the editor shows it in the outer frame's header through a small separate meta form).
- `PlanExercise = Block & ExerciseMeta & { id? }`, `PlanDay`, `PlanConfig`: the plan as the AI writes it.
- `ExerciseState = { rated?, done?, elapsed? }` stays in `StoredPlan`, keyed by exercise id; only the week view and
  the stars read it.
- `Section`, `Choice`, `Cell`, `PlanTool`: a tool receives its own props and nothing else (as today); a section
  component receives a `Section` and the choice above it, resolved to plain values; the chooser receives a `Choice`.
- The palette and families receive a key and make a cell; they know nothing of blocks. The WebMCP tools receive a
  `Block` (and, on the plan, `where`), never the store.

## How it gets made

- Next.js, React, TypeScript, as the repo is. The block editor lives in `src/features/plan/ui/editor/` (the user's
  call that the notes creator moves to the plan's side; the builder may name the folder). The notes creator page keeps
  its feature folder under `src/features/teachers/` for its page shell, palette and sharing, importing the editor.
- `@dnd-kit` for the cells, as the Grid uses it.
- Teaching text and interface copy follow `AGENTS.md`: the skills before any word on the screen.
- Checked on the screen: the notes creator, a shared note, a preset note, the plan's review step and the plan page,
  at phone width too.

## Left to the builder

- The exact shape of each new tool's props and controls, from the family's controls today.
- How `parseText` splits a note's text into cells (title, sections, lists) and joins them back for the text box.
- The gutter chrome: the notebook is the edit mode (the notes creator, Edit on a day), with the gutter always on;
  the read mode is the article. (The user did not pick among the three mockup options; this is my call.)
- How Edit on a day sits in the week view (in place, or a page state the day buttons switch out of).
- Names on the screen (with the skills), and the order of palette sections once the plan-only tools join.
- The order of work. A sensible one: the format and its readers (cells, sections, choice, `pinned`, hashtags,
  examples rewritten, the parser and prompt updated, tests) → the article reader for both → the new tools → the
  block editor and the notes creator on it → Edit on the plan's days → the WebMCP tools.

## Later

- Teachers writing plans for students, from notes: a plan day assembled from blocks.
- Cell-level AI tools, if whole-block rewrites turn out too coarse.
- Keeping a rating across a small edit (a typo fixed), if losing it turns out to hurt.
