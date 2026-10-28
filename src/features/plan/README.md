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
  tools.ts        the tools an exercise shows (PlanTool, parseTool, TOOL_DOCS for the prompt, toolFromLink for older plans)
  config.ts       parsePlanConfig(): the pasted reply to a checked PlanConfig, with warnings
  prompt.ts       buildPrompt(), weekReport()
  schedule.ts     local dates, today's day, progress, when the week is over
store/
  PlanStore.ts    the storage interface: load() / save() of one PlanState
  localPlanStore.ts  the localStorage implementation ("musickit.plan"), with sanitising
  usePlan.tsx     the hook the UI uses, and PlanStoreProvider to swap the store
ui/               PlanFlow, Questionnaire (the question screens), PromptAndPaste, WeekView, GuidedSteps, ExerciseTimer, ExerciseTool
PlanApp.tsx       the page body: no plan → Start; a plan → header, week, history; the flow modal
reminders.ts, PracticeReminder.tsx   notifications (PracticeReminder is mounted in PageShell, on every page)
```

## Storage, and moving to an API

The UI only talks to `PlanStore`. To keep plans on a server, write a `PlanStore` whose `load`/`save` call the API and
wrap the page in `<PlanStoreProvider store={apiStore}>`. `PracticeReminder` reads `localPlanStore` directly; point it at
the same store. The open flow (step, answers, pasted text) is kept in `sessionStorage` (`musickit.plan.flow`) so a
reload doesn't lose it; that one stays local.

## The plan format

The prompt asks for one JSON object, exactly seven days:

```json
{ "title": "…", "summary": "…", "days": [ { "theme": "…", "exercises": [
  { "title": "…", "focus": "A minor pentatonic · boxes 1 & 2", "minutes": 8, "how": "…",
    "steps": ["…"], "why": "…",
    "tools": [ { "type": "scale", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2] },
               { "type": "band", "bpm": 60, "key": "a", "parts": ["click", "drone"] } ],
    "link": "/theory/scales/minor-pentatonic/a" } ] } ] }
```

On paste: a code fence or prose around it is fine; minutes are clamped to 1–120; unknown links are dropped with a
warning; tools that can't be shown (unknown scale, unreadable chord) are left out with a warning; fewer than seven
days or an empty day is refused. Plans pasted before tools existed show the tool their link stands for.

## Tools

The AI writes an exercise's text and its tools separately; the page draws only from the tools. So the prompt makes
them agree: every note the steps play is in the scale or its `add`, and any outside note is named as outside, with why. Plain scale first, then extended: two scale tools in order, the
second with `add` (up to 3 tools, or one per step when guided; at most 6).
Steps that use different views: each tool sets `step` (from 1) and the section walks through the steps one at a time
(`ui/GuidedSteps.tsx`), showing that step's tools; tools without `step` (a band) stay on across steps.

Few on purpose, each a view with no settings: the AI sets it up, the player plays.

| type | shows | built from |
| --- | --- | --- |
| `scale` | the boxes asked for, plus any `add` notes from outside the scale played in them; tap a note or ▶ a box | `PositionBox` (chordKit), `pentatonicPositions` / `positionsFor` |
| `chords` | one shape per chord, tap to strum | `ChordDiagram`, `shapesForTones` |
| `sing` | the scale on a staff in the voice's range, live pitch | `SingingStaff`, `useMicPitch` (as on the singing page) |
| `band` | one line: Play only the chosen parts, tempo, key; "More" for the rest | `PracticeBand` (instruments) |
| `notes` | the fretboard-notes game, settings hidden (`bare`) | `NoteGame` |
| `ears` | ear training, settings hidden (`bare`) | `EarGame` |

To add one: a type and its parsing in `model/tools.ts`, a line in `TOOL_DOCS` (what the prompt tells the AI), a view in
`ui/ExerciseTool.tsx` (lazy-load anything with its own sound engine), and a test.
