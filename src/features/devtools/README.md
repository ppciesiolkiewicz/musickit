# Dev tools

Local-only pages under `/dev` for working on the app: today the autoplan prompt (studio, examples), later other views of
the app's data. Spec: `docs/superpowers/specs/2026-10-31-prompt-devtools-design.md`.

## Rules

- **Dev only.** `src/app/dev/layout.tsx` calls `notFound()` in production; every `src/app/api/dev/*` handler starts
  with `devGate()` (`gate.ts`). `/dev` is not in the sitemap.
- **Imports.** Dev tools may import plan internals (`@/features/plan/model/*`, its UI). Nothing outside this folder,
  `src/app/dev` and `src/app/api/dev` imports dev tools.
- **`server/` is Node only** (`child_process`, `fs`) and is imported only by route files. Pure logic in `model/`, with tests.
- **A new tool** is one entry in `registry.ts` and one page under `src/app/dev/`.

## History

Runs of the prompt are kept in `tools/prompt-history/` at the repo root, one JSON file per run (gitignored).

A record (`model/history.ts` `RunRecord`) holds when, mode, model (or `"pasted"`), the answers, part overrides and part
list, the prompt, the reply or error, time, cost, and the plan's title and warning count when the reply parses.

## Prompt studio (`/dev/prompt`)

Inputs (answers JSON, first or next week; next week takes a past run as last week, with the ticks made on its preview),
every prompt part (`promptParts` in the plan model) as a row to switch off or edit in place, the composed prompt, Run, and
the result: the reply rendered with the plan's real `WeekView`, its parse warnings and the raw text, beside the history.
Its state stays in `localStorage` key `musickit.dev.prompt`; "Load my /plan answers" only reads `musickit.plan`.

## Prompt examples (`/dev/examples`)

"In the prompt": the example parts `promptParts` builds for the studio's saved answers, each with its "Why it's good" note.
"Library": every example in `src/features/plan/examples` with filters (kind, area, level, showcase), marked "in prompt"
when `selectExamples` picks it for those answers. Opening a card renders it (`model/preview.ts`): an exercise as its
header and sections, a plan in the real week view, with the parser's warnings.

## Running the prompt

`POST /api/dev/run` runs the local `claude` CLI (`server/claude.ts`) in print mode with no tools, no MCP servers, no
saved session, only project settings, from the temp folder, and with a plain system prompt in place of Claude Code's (that
one brings auto-memory, and the model "reads its memory" instead of answering; `--bare` would avoid it but fails login).
The child also drops the `CLAUDE_CODE_*` variables of any Claude session the dev server runs in. So the model sees only the
prompt, like a player's own AI.

A run lives on the server, not in the page (`server/running.ts`): a reload, which any edit to the plan model can cause,
does not stop it. `GET /api/dev/run` lists runs in progress (the studio polls it and shows each with Cancel),
`DELETE /api/dev/run?id=` cancels one, and 10 minutes kills it. Every run is saved, failed and cancelled ones too.
`POST /api/dev/history` keeps a reply pasted from another AI; `GET /api/dev/history` lists runs, `GET /api/dev/history/<id>`
returns one.

## Code map

- `gate.ts`: `devOnly`, `devGate`.
- `registry.ts`: the tools listed on `/dev`.
- `model/models.ts`: the Claude models a run can use.
- `model/history.ts`: run records, summaries, ids, request checks, `describeReply`.
- `model/compose.ts`: `composePrompt` (overrides on parts), answers from text, a past run as last week, the studio's saved state.
- `server/claude.ts`: `claudeArgs`, `childEnv`, `parseClaudeResult`, `runClaude`.
- `server/running.ts`: runs in progress (`startRun`, `cancelRun`, `endRun`, `listRunning`), kept on `globalThis`.
- `server/history.ts`: `saveRun`, `readRun`, `listRuns` over `tools/prompt-history/`.
- `model/preview.ts`: an example's JSON made parseable and parsed for display; `whyOf`.
- `prompt/`: `PromptStudio` (state), `StudioInputs`, `PartList`, `RunPanel`, `PlanPreview`, `HistoryList`, `api.ts` (fetches), `storage.ts` (saved state, `useMounted`).
- `examples/ExampleViewer.tsx`: the examples page.
- Routes: `src/app/api/dev/run`, `src/app/api/dev/history`, `src/app/api/dev/history/[id]`; pages `src/app/dev`.
