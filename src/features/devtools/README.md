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

## Running the prompt

`POST /api/dev/run` runs the local `claude` CLI (`server/claude.ts`) in print mode with no tools, no MCP servers, no
saved session and only project settings, from the temp folder: the model sees only the prompt, like a player's own AI,
and no user hooks or CLAUDE.md reach it. Closing the request (Cancel) or 10 minutes kills the process. Every run is saved,
failed and cancelled ones too. `POST /api/dev/history` keeps a reply pasted from another AI; `GET /api/dev/history` lists
runs, `GET /api/dev/history/<id>` returns one.

## Code map

- `gate.ts`: `devOnly`, `devGate`.
- `registry.ts`: the tools listed on `/dev`.
- `model/models.ts`: the Claude models a run can use.
- `model/history.ts`: run records, summaries, ids, request checks, `describeReply`.
- `server/claude.ts`: `claudeArgs`, `parseClaudeResult`, `runClaude`.
- `server/history.ts`: `saveRun`, `readRun`, `listRuns` over `tools/prompt-history/`.
- Routes: `src/app/api/dev/run`, `src/app/api/dev/history`, `src/app/api/dev/history/[id]`.
