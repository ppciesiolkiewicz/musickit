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

## Code map

- `gate.ts`: `devOnly`, `devGate`.
- `registry.ts`: the tools listed on `/dev`.
