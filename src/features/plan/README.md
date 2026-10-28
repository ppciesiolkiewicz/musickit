# AI practice plan

`/plan`: a continuous daily practice plan, written by the player's own AI (ChatGPT, Claude, Gemini…). attunr never calls
an AI: it writes the prompt, the player pastes it into theirs, and pastes the reply back. Everything is stored in the
browser.

## The player's path

1. **Start** opens one step modal (`ui/PlanFlow.tsx`, mode `"start"`): the questions (what they play, level, where they
   want to go, what feels hard, minutes a day, styles, notes), then *Copy your prompt*, then *Paste its reply*.
   **Build my plan** is enabled once the reply parses.
2. **The week** (`ui/WeekView.tsx`): seven day buttons; any day can be opened, days ahead are dashed and marked "coming up". The day's
   exercises are a list of sections: title, focus ("A minor pentatonic · boxes 1 & 2"), how, steps, why, a countdown
   timer (chimes and ticks the exercise at zero), Done.
3. **Tools in the section**: each exercise carries 1–2 `tools`, set up by the AI, with nothing to configure: a scale's
   boxes on the neck, chord shapes, a staff with live pitch for singing, a folded play-along band (one Play for only the
   chosen click / drone / drums / bass), or the notes / ear games with their settings hidden. A `link` is an
   "Open page" link for more.
4. **Plan next week** (mode `"next"`, any time; a banner shows it once the week is over): how did it go, still heading
   the same way (goals, minutes), copy the prompt (it carries this week's exercises, done or skipped, the notes and up
   to three earlier weeks), paste.
5. **Start anew**: the first flow again; its prompt leaves out past weeks. Earlier plans stay listed and can be restarted.
6. **Reminders**: a daily browser notification at a chosen time while any attunr tab is open.

## Code map

```
model/            pure, no React; tested in model/plan.test.ts
  types.ts        PlanAnswers, PlanConfig (what the AI returns), StoredPlan, PlanState (the stored document)
  questions.ts    the questionnaire's choices and defaults
  catalogue.ts    the attunr pages a plan may link to; checkLink() keeps only those
  tools.ts        THE one file for what an exercise is made of, like an MCP server: TOOLS (name, description, input schema, parse), the section kinds, tags, link resources; the prompt's interface is generated from it; legacySections reads older plans
  config.ts       parsePlanConfig(): the pasted reply to a checked PlanConfig, with warnings
  prompt.ts       buildPrompt(), weekReport()
  schedule.ts     local dates, today's day, progress, when the week is over
store/
  PlanStore.ts    the storage interface: load() / save() of one PlanState
  localPlanStore.ts  the localStorage implementation ("musickit.plan"), with sanitising
  usePlan.tsx     the hook the UI uses, and PlanStoreProvider to swap the store
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
      { "type": "tool", "tool": { "type": "band", "bpm": 60, "key": "a", "parts": ["click", "drone"] } },
      { "type": "list", "items": ["…"] },
      { "type": "tool", "tool": { "type": "scale", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2], "highlight": ["1"] } },
      { "type": "link", "href": "/theory/scales/minor-pentatonic/a" } ] } ] } ] }
```

On paste: a code fence or prose around it is fine; minutes are clamped to 1–120; sections and tools that can't be shown
(unknown scale, unreadable chord, unknown link) are left out with a warning; unknown tags are dropped; fewer than seven
days or an empty day is refused. Plans pasted before sections (`how`, `steps`, `tools` with a `step`, `link`) are read as
sections, a step followed by its tools; plans stored that way are converted on display (`sectionsOf`).

## The prompt

`prompt.ts` writes the rules for good exercises (one skill each, minutes that match the work, singing in short musical bursts
rather than long bare drills, show only the notes the exercise is about, intervals inside an octave unless tagged
`multi-octave`, a progression practised several ways, no two of a kind in a row), then the interface, generated from
`model/tools.ts`: every section kind and tool as name, description and `inputSchema` (as an MCP server lists tools), and the
pages a link may go to as a few URI templates (`/theory/scales/{scale}/{key}`, `/course/{stage}/{section}`).

## Tools

The AI writes an exercise's text and its tools in the same list; the page draws only from the tools. So the prompt makes
them agree: every note the text plays is in the scale or its `add`, any outside note is named as outside, with why.

Few on purpose, each a view with no settings: the AI sets it up, the player plays.

| type | shows | built from |
| --- | --- | --- |
| `scale` | the boxes asked for, `add` notes from outside the scale played in them, `highlight` degrees that stand out (the rest dimmed); tap a note or ▶ a box | `PositionBox` (chordKit, `highlight`), `pentatonicPositions` / `positionsFor` |
| `chords` | one shape per chord, tap to strum | `ChordDiagram`, `shapesForTones` |
| `comp` | a progression played as arpeggios or comping, looping, the chord playing lit; patterns switch live | `CompPlayer`, `lib/practice/comping.ts` |
| `sing` | the scale, or only `notes` (chord tones), on a staff in the voice's range, live pitch | `SingingStaff` (`highlight`), `useMicPitch` |
| `band` | one line: Play only the chosen parts, tempo, key; "More" for the rest | `PracticeBand` (instruments) |
| `notes` | the fretboard-notes game, settings hidden (`bare`) | `NoteGame` |
| `ears` | ear training, settings hidden (`bare`); inside an octave unless `wide` (tags the exercise `multi-octave`) | `EarGame` |

To add one: its entry in `TOOLS` in `model/tools.ts` (description, schema, parse; the prompt follows), a view in
`ui/ExerciseTool.tsx` (lazy-load anything with its own sound engine), and a test.
