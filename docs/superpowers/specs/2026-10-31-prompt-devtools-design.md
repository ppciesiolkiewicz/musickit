# Dev tools: prompt studio and example viewer

Local-only pages for working on the AI autoplan prompt (and, later, other views of the app's data). They live in the main
app under `/dev`, return 404 in production, and reuse the real plan model and exercise components, so what they show is
what a player gets.

## Why

The autoplan prompt (`src/features/plan/model/prompt.ts`) is one long string built from the student's answers, the rules,
the generated tool interface, the link catalogue and the examples. Changing it today means editing code, copying the prompt
into an AI by hand, pasting the reply into `/plan` and losing the run. The questionnaire/examples plan
(`2026-10-31-autoplan-questionnaire-examples.md`) makes the prompt bigger and example-driven, so this gets worse.

## What

### 1. Labelled prompt parts (plan model)

`buildPrompt` is built from a list of labelled parts; the copied prompt is their join, byte for byte the same as today.
Parts: intro, student, earlier weeks (only in the next-week prompt), how to plan, rules, common mistakes, exercise format,
section interface, tool interface, links, answer format, and one part per example. An example part also carries its id and
JSON so tools can render it. The autoplan rewrite (its Task 10) keeps producing parts.

### 2. `/dev` area

- `/dev`: a list of the dev tools (a small registry, so a later "course in another view" page is one entry and one route).
- Every `/dev` page and `/api/dev/*` route is 404 when `NODE_ENV === "production"`. Not in the sitemap.

### 3. Prompt studio (`/dev/prompt`)

- **Inputs:** the student's answers as JSON (seeded from the defaults; "Load my /plan answers" reads the real ones),
  mode first week / next week. Next week takes a past run from the history as "last week", its ticks and a feedback line.
- **Decomposed view:** every part as a row: label, kind, size; open it to see its text. Interface parts also show the
  existing tool/shape/section/link lists. Each part can be switched off or edited in place (an override, marked "edited",
  with reset). Overrides are for trying ideas; the real change is then made in `prompt.ts`.
- **Composed view:** the final prompt as sent, its size (chars, ~tokens), Copy.
- **Run:** runs the composed prompt through the local Claude Code CLI (`claude -p`), with a model choice, an elapsed
  timer and Cancel. Claude runs with no tools, no MCP, no session saved, outside the repo and without user/project
  settings or hooks, so it sees only the prompt, like a player's own AI.
- **Result (below):** status, time, cost, parse warnings, the plan rendered with the real week view (days, sections,
  tools, timers; ticks local), the raw reply. A reply from another AI can be pasted instead.
- **History:** every run (and every pasted reply) is a JSON file in `tools/prompt-history/` (gitignored): when, mode,
  model, answers, overrides, part list, prompt, reply or error, time, cost, plan title, warning count. The page lists them
  newest first; opening one shows its result and can load its inputs back.

### 4. Example viewer (`/dev/examples`)

- Shows every example part of the prompt for the current answers: id, its "why it's good" note, and the example
  rendered (an exercise as a week of that exercise, a short plan padded to seven days), with its parse warnings.
- After the example library lands (autoplan Task 9/10): the whole library with filters (kind, area, level, showcase),
  each marked whether the current answers put it in the prompt.

## Not in scope

A separate app or workspace packages; editing `prompt.ts` from the browser; streaming the reply; other views (course)
beyond the registry slot.
