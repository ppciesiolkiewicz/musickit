# AI practice plan

`/plan`: a continuous daily practice plan, written by the player's own AI (ChatGPT, Claude, Gemini…). attunr never calls
an AI: it writes the prompt, the player pastes it into theirs, and pastes the reply back. Everything is stored in the
browser.

## The player's path

1. **Start** opens one step modal (`ui/PlanFlow.tsx`, mode `"start"`): the questions (what they play, level, where they
   want to go, what feels hard, minutes a day, styles, notes), then *Copy your prompt*, then *Paste its reply*.
   **Build my plan** is enabled once the reply parses.
2. **The week** (`ui/WeekView.tsx`): seven day buttons; today and earlier days open, later days locked. The day's
   exercises are a list of sections: title, focus ("A minor pentatonic · boxes 1 & 2"), how, steps, why, a countdown
   timer (chimes and ticks the exercise at zero), Done.
3. **The tool in the section**: when an exercise links one of the embeddable tools, the tool is right in its section,
   set up for the exercise (key, strings, interval level). Other links are an "Open page" link.
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
  embed.ts        which links open a tool on the plan page (EMBEDS, embedFor())
  config.ts       parsePlanConfig(): the pasted reply to a checked PlanConfig, with warnings
  prompt.ts       buildPrompt(), weekReport()
  schedule.ts     local dates, today's day, progress, when the week is over
store/
  PlanStore.ts    the storage interface: load() / save() of one PlanState
  localPlanStore.ts  the localStorage implementation ("musickit.plan"), with sanitising
  usePlan.tsx     the hook the UI uses, and PlanStoreProvider to swap the store
ui/               PlanFlow, Questionnaire (the question screens), PromptAndPaste, WeekView, ExerciseTimer, ExerciseEmbed
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
    "steps": ["…"], "why": "…", "link": "/theory/scales/minor-pentatonic/a" } ] } ] }
```

On paste: a code fence or prose around it is fine; minutes are clamped to 1–120; unknown links are dropped with a
warning; fewer than seven days or an empty day is refused.

## Adding an embedded tool

The set is small on purpose (scale/pentatonic pages, fretboard notes, ear training, metronome & drone). To add one:
a kind in `model/embed.ts` (`Embed`, `embedFor`, and a line in `EMBEDS` telling the AI its path and query), a case in
`ui/ExerciseEmbed.tsx` (lazy-loaded, with any address-bar syncing turned off), and a test.
