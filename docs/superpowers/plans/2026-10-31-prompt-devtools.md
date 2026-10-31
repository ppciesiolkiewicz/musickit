# Dev Tools: Prompt Studio and Example Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Local `/dev` pages to see the autoplan prompt as labelled parts, edit/toggle them, run it through the local Claude Code CLI, render the resulting plan below, keep every run in a history folder, and view the prompt's examples.

**Architecture:** `buildPrompt` becomes a join of `promptParts()` (plan model). A new `src/features/devtools/` feature holds pure logic in `model/` (compose, preview, run records), Node-only code in `server/` (spawn `claude`, history files) used only by `src/app/api/dev/*` routes, and UI in `prompt/` and `examples/`. Pages live under `src/app/dev/`, gated to 404 in production. Plans render with the real `WeekView`.

**Tech Stack:** Next.js 16 (repo version; read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` and the dynamic-route/`notFound` docs before writing routes), React 19, TypeScript, `node:test` via tsx, `node:child_process`, Claude Code CLI 2.1.

**Spec:** `docs/superpowers/specs/2026-10-31-prompt-devtools-design.md`

## Global Constraints

- Dev only: every `src/app/dev/**` page and `src/app/api/dev/**` route answers 404 when `process.env.NODE_ENV === "production"`. `/dev` stays out of `sitemap.ts`.
- `src/features/devtools/` may import plan internals (`@/features/plan/model/*`, `@/features/plan/ui/WeekView`, `ui/PromptAndPaste`); nothing outside devtools and `src/app/{dev,api/dev}` imports devtools. `server/` files are imported only by route files (they use `node:child_process`/`node:fs`).
- History folder: `tools/prompt-history/` at the repo root, one `<id>.json` per run, added to `.gitignore`.
- Dev-tool UI state (answers text, overrides, mode) is kept in `localStorage` key `musickit.dev.prompt`, never in `musickit.plan`. "Load my /plan answers" only reads `musickit.plan`.
- Tests: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1); $TSX --test src/features/plan/model/*.test.ts src/features/devtools/**/*.test.ts` (never `npx tsx`). Add `src/features/devtools/*/*.test.ts` to `npm test` in `package.json`.
- Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` prints nothing. Lint: `npx eslint src/features/plan src/features/devtools src/app/dev src/app/api/dev`.
- UI check with `npm run dev` (not `next build`; fonts fail locally). Chrome is the user's real profile: back up and restore `musickit.plan` and `musickit.dev.prompt` around browser checks.
- Commit straight to main with a temporary index: `export GIT_INDEX_FILE=$SCRATCH/idx; git read-tree HEAD; git add <files>; git commit -m "…"; unset GIT_INDEX_FILE; git reset -q -- <files>`. Never `git add` with the shared index. End messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Style: match the plan feature (Tailwind slate/sky, `@/components/ui` atoms, short plain-English JSDoc). Keep `src/features/devtools/README.md` current from Task 2 on.
- Coordination with the autoplan plan: its Task 10 edits `promptParts` (one `example` part per selected example, id `example:<example id>`), not a single string.

## Review Focus

1. **Claude CLI fails or isn't logged in / not on PATH:** run shows the CLI's error text, the record is saved with `error`, the page stays usable. Test in Task 3 (`parseClaudeResult` on error output and non-JSON stdout), Task 4 (route saves error records).
2. **Cancel or closing the tab mid-run:** the `claude` child is killed (no orphan process), record saved with `error: "cancelled"`. Test in Task 3 (`runClaude` with an aborted signal kills a fake command).
3. **Reply that isn't a plan** (prose, broken JSON, 3 days): result shows the parse error and the raw reply, never a crash; history still lists it. Test in Task 4 (`summaryOf` with an unparseable reply → `title` undefined, `ok: true`), Task 6 manual.
4. **History id from the URL** (`../../etc/passwd`, empty, unknown): `readRun` returns null → 404, never reads outside the folder. Test in Task 4.
5. **Overrides from an older prompt** (a part id that no longer exists, or an override equal to the current text): ignored / not marked edited, composed prompt still valid. Test in Task 5.

---

### Task 1: Prompt as labelled parts

**Files:**
- Modify: `src/features/plan/model/prompt.ts`, `src/features/plan/model/plan.test.ts`, `src/features/plan/README.md` ("The prompt")

**Interfaces:**
- Produces (in `prompt.ts`):
  ```ts
  export type PromptPartKind = "intro" | "student" | "history" | "rules" | "interface" | "links" | "format" | "example";
  export interface PromptPart { id: string; label: string; kind: PromptPartKind; text: string; example?: { id: string; json: string } }
  export function promptParts(answers: PlanAnswers | null, entries: CatalogueEntry[], previous?: StoredPlan[]): PromptPart[];
  export function buildPrompt(...same args): string; // = promptParts(...).map((p) => p.text).join("\n")
  ```
  Part ids, in order: `intro`, `student`, `history` (only when `previous` has plans), `how-to-plan`, `rules`, `mistakes`, `exercise-format`, `sections`, `tools`, `links`, `answer-format`, `example:week-1` (the current `EXAMPLE`, kind `example`, `example.json` = `EXAMPLE`). Each part's text includes its own `## …` heading and the blank line that follows it in today's output, so the join is unchanged.

- [ ] **Step 1:** Before touching code, save today's output: a scratch script printing `buildPrompt(DEFAULT_ANSWERS, catalogue())`, `buildPrompt(null, [])` and `buildPrompt(DEFAULT_ANSWERS, catalogue(), [<the "done" plan fixture from plan.test.ts>])` to `$SCRATCH/prompt-before-{1,2,3}.txt`.
- [ ] **Step 2: Failing tests** in `plan.test.ts`:
  - `prompt parts have unique ids in the documented order` (assert the id list above for the next-week case; without `previous` there is no `history`).
  - `buildPrompt is the join of its parts`.
  - `the example part carries parseable JSON` (`JSON.parse(part.example.json).days.length >= 1`, `part.example.id === "week-1"`).
  - `skipped questionnaire: the student part asks for the answers` (matches `/skipped the questionnaire/`).
- [ ] **Step 3: Run, expect FAIL** (`promptParts` missing).
- [ ] **Step 4: Implement** `promptParts`; `buildPrompt` joins.
- [ ] **Step 5:** Tests PASS; rerun the scratch script and `diff` against `prompt-before-*.txt`: no difference. tsc clean.
- [ ] **Step 6: Commit** `refactor(plan): prompt built from labelled parts`.

---

### Task 2: `/dev` area and tool registry

**Files:**
- Create: `src/app/dev/layout.tsx`, `src/app/dev/page.tsx`, `src/features/devtools/registry.ts`, `src/features/devtools/gate.ts`, `src/features/devtools/gate.test.ts`, `src/features/devtools/README.md`
- Modify: `.gitignore` (`/tools/prompt-history/`), `package.json` (`test` glob)

**Interfaces:**
- Produces:
  ```ts
  // registry.ts
  export interface DevTool { href: string; label: string; desc: string }
  export const DEV_TOOLS: DevTool[]; // /dev/prompt "Prompt studio", /dev/examples "Prompt examples"
  // gate.ts
  export const devOnly = (env: { NODE_ENV?: string } = process.env): boolean => env.NODE_ENV !== "production";
  export function devGate(): Response | null; // 404 Response in production, else null; first line of every /api/dev handler
  ```
  `layout.tsx` calls `notFound()` when `!devOnly()`, then renders children inside `PageShell` (title "Dev tools"). `page.tsx` lists `DEV_TOOLS` as links with their desc.

- [ ] **Step 1: Failing test** `gate.test.ts`: `devOnly({NODE_ENV:"production"})` false; `"development"` and `{}` true; `devGate()` under a production env returns status 404 (pass env through an optional param if needed).
- [ ] **Step 2: FAIL. Step 3: Implement** the files above; README says what `/dev` is, the gating rule, the import rule from Global Constraints, the history folder.
- [ ] **Step 4:** tests, tsc, eslint clean; `npm run dev`, open `/dev`: both tools listed (their links 404 for now).
- [ ] **Step 5: Commit** `feat(devtools): dev-only /dev area`.

---

### Task 3: Claude CLI runner

**Files:**
- Create: `src/features/devtools/model/models.ts`, `src/features/devtools/server/claude.ts`, `src/features/devtools/server/claude.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/features/devtools/model/models.ts (pure, so the client can import it): export type DevModel = "sonnet" | "opus" | "haiku"; export const DEV_MODELS: DevModel[];
  export interface RunOptions { model: DevModel; effort?: "low" | "medium" | "high" }
  export type RunOutput = { ok: true; text: string; durationMs: number; costUsd?: number } | { ok: false; error: string; durationMs: number };
  export function claudeArgs(o: RunOptions): string[];
  export function parseClaudeResult(stdout: string, stderr: string, code: number | null): Omit<RunOutput, "durationMs">;
  export function runClaude(prompt: string, o: RunOptions, signal?: AbortSignal, cmd?: string): Promise<RunOutput>; // cmd defaults to "claude"
  ```
  `claudeArgs` → `["-p", "--output-format", "json", "--model", o.model, "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--setting-sources", "project", ...(effort ? ["--effort", effort] : [])]`. `runClaude` spawns `cmd` with `cwd: os.tmpdir()` (no project settings, no CLAUDE.md), writes the prompt to stdin, kills the child (SIGTERM) on `signal` abort or after 10 minutes, resolves `{ ok:false, error:"cancelled" }` / `"timed out after 10 minutes"`. Spawn error ENOENT → `"claude CLI not found on PATH"`. `parseClaudeResult` reads the CLI's JSON (`{ type:"result", is_error, result, total_cost_usd }`): `is_error` or non-zero code → `{ ok:false, error: result || stderr.trim() || "claude exited with code N" }`; stdout not JSON → `{ ok:false, error: "Unexpected output: <first 300 chars>" }`.

- [ ] **Step 1: Check the CLI flags by hand** (from `$SCRATCH`): `echo 'Reply with exactly: pong' | claude -p --output-format json --model haiku --tools "" --strict-mcp-config --no-session-persistence --setting-sources project`. Expect JSON with `"result":"pong"` and no hook text. If `--setting-sources project` breaks login or a flag is rejected, adjust `claudeArgs` and note why in a comment.
- [ ] **Step 2: Failing tests:** `claudeArgs` for sonnet without effort, and with `effort:"high"` (ends with `--effort high`); `parseClaudeResult` success → text + cost; `is_error:true` → error from `result`; non-JSON → `Unexpected output`; code 1 with empty stdout → stderr text. `runClaude` with `cmd` = a scratch script that echoes a valid result JSON → ok; with a script that sleeps 30 s and a signal aborted after 100 ms → `error:"cancelled"` within 2 s and the process gone (`process.kill(pid, 0)` throws); `cmd` = `"no-such-binary-xyz"` → `claude CLI not found on PATH`. (Pass extra args or env so the fake scripts live in `os.tmpdir()`, written by the test.)
- [ ] **Step 3: FAIL. Step 4: Implement.** **Step 5: PASS**, tsc clean.
- [ ] **Step 6: Commit** `feat(devtools): run a prompt through the local claude CLI`.

---

### Task 4: Run records, history files, API routes

**Files:**
- Create: `src/features/devtools/model/history.ts`, `src/features/devtools/model/history.test.ts`, `src/features/devtools/server/history.ts`, `src/features/devtools/server/history.test.ts`
- Create: `src/app/api/dev/run/route.ts`, `src/app/api/dev/history/route.ts`, `src/app/api/dev/history/[id]/route.ts`

**Interfaces:**
- Consumes: `runClaude`, `DevModel` (Task 3); `devGate` (Task 2); `parsePlanConfig`, `catalogue`.
- Produces:
  ```ts
  // model/history.ts (pure, shared with the client)
  export type Overrides = Record<string, { text?: string; off?: boolean }>;
  export interface RunRecord {
    id: string; at: string; mode: "first" | "next"; model: DevModel | "pasted";
    answers: unknown; overrides: Overrides; previousId?: string; feedback?: string;
    parts: { id: string; label: string; edited: boolean; off: boolean }[];
    prompt: string; reply?: string; error?: string; durationMs: number; costUsd?: number;
    title?: string; warnings?: number;
  }
  export interface RunSummary { id: string; at: string; mode: RunRecord["mode"]; model: RunRecord["model"]; ok: boolean; title?: string; warnings?: number; durationMs: number; costUsd?: number; chars: number; edited: string[] }
  export const newRunId: (at: Date, rand?: string) => string; // "2026-10-31T14-05-09-a1b2"
  export const RUN_ID = /^[0-9T-]+-[a-z0-9]{4}$/;
  export function summaryOf(r: RunRecord): RunSummary; // ok = !r.error
  // server/history.ts
  export const HISTORY_DIR: string; // path.join(process.cwd(), "tools/prompt-history")
  export function saveRun(r: RunRecord, dir?: string): Promise<void>; // mkdir -p, write <id>.json pretty
  export function listRuns(dir?: string): Promise<RunSummary[]>;      // newest first; skips unreadable files; [] when no folder
  export function readRun(id: string, dir?: string): Promise<RunRecord | null>; // null unless RUN_ID matches and file exists
  ```
  Routes (each starts with `devGate()`; `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `json()` helper like `api/nam/route.ts`):
  - `POST /api/dev/run` body `{ prompt, model, effort?, mode, answers, overrides, parts, previousId?, feedback? }` → `runClaude(prompt, …, req.signal)`; sets `title`/`warnings` from `parsePlanConfig(reply, catalogue())` when it parses; saves the record (also on error/cancel); returns the `RunRecord`. Missing/empty `prompt` or unknown `model` → 400.
  - `POST /api/dev/history` body = a record without `id`/`at` and `model: "pasted"` (a reply from another AI) → saved, returned.
  - `GET /api/dev/history` → `{ runs: RunSummary[] }`; `GET /api/dev/history/[id]` → `RunRecord` or 404.

- [ ] **Step 1: Failing tests:** `newRunId(new Date("2026-10-31T14:05:09Z"), "a1b2")` → `"2026-10-31T14-05-09-a1b2"` and matches `RUN_ID`; `summaryOf` marks `ok:false` with error, `chars = prompt.length`, `edited` = ids of edited parts, unparseable reply → `title` undefined. Server tests in a `mkdtemp` dir: save two, `listRuns` newest first; a corrupt `x.json` is skipped; `readRun("../x")`, `readRun("")`, `readRun("2026-01-01T00-00-00-zzzz")` (absent) → null; `listRuns` on a missing dir → `[]`.
- [ ] **Step 2: FAIL. Step 3: Implement** model, server, routes.
- [ ] **Step 4:** tests, tsc, eslint clean. With `npm run dev`: `curl -s localhost:3000/api/dev/history` → `{"runs":[]}`; `curl -s -X POST localhost:3000/api/dev/run -H 'content-type: application/json' -d '{"prompt":"Reply with exactly: pong","model":"haiku","mode":"first","answers":null,"overrides":{},"parts":[]}'` → record with `reply:"pong"`, a file appears in `tools/prompt-history/`; delete it after.
- [ ] **Step 5: Commit** `feat(devtools): run history and dev API routes`.

---

### Task 5: Prompt studio: inputs, decomposed and composed views

**Files:**
- Create: `src/features/devtools/model/compose.ts`, `src/features/devtools/model/compose.test.ts`
- Create: `src/features/devtools/prompt/PromptStudio.tsx`, `src/features/devtools/prompt/PartList.tsx`, `src/features/devtools/prompt/StudioInputs.tsx`, `src/app/dev/prompt/page.tsx`
- Modify: `src/features/plan/ui/PromptAndPaste.tsx` (export `DebugList`)

**Interfaces:**
- Consumes: `promptParts`, `PromptPart` (Task 1); `Overrides`, `RunRecord` (Task 4); `offeredInterface`, `catalogue`, `sanitiseState`, `PLAN_KEY` (plan); `DebugList`.
- Produces:
  ```ts
  // compose.ts
  export interface Composed { text: string; edited: string[]; off: string[]; parts: RunRecord["parts"] }
  export function composePrompt(parts: PromptPart[], o: Overrides): Composed; // off parts dropped; override text replaces; join "\n"
  export function answersFromText(text: string): { answers: PlanAnswers | null; error?: string }; // JSON.parse then sanitiseState({ answers }).answers; "null" → null (skipped questionnaire)
  export function storedPlanFrom(r: RunRecord, done: Record<string, boolean>, feedback: string): StoredPlan | null; // parses r.reply; startedOn from r.at's date; null if it doesn't parse
  export interface StudioState { answersText: string; mode: "first" | "next"; overrides: Overrides; model: DevModel; previousId?: string; feedback: string }
  export const STUDIO_KEY = "musickit.dev.prompt"; // StudioState is persisted here
  export const DEFAULT_STUDIO: StudioState; // answersText = JSON of DEFAULT_ANSWERS, mode "first", overrides {}, model "sonnet", feedback ""
  ```
  Layout, top to bottom: inputs (answers JSON textarea with Reset to defaults / Load my /plan answers; mode First week · Next week; in Next week a select of history runs that parsed, plus feedback input), then the part list, then the composed prompt (read-only textarea, chars, `~N tokens` = chars/4 rounded, Copy, list of edited/off parts). Part row: label, kind badge, chars, Off toggle, Edit (textarea over the override text, Reset). Open shows the text; for `tools`/`sections` parts it also shows `DebugList` of `offeredInterface(entries).tools` + `.shapes` / `.sections`, for `links` the link list. Run controls are Task 6.

- [ ] **Step 1: Failing tests** `compose.test.ts`: no overrides → `text === buildPrompt(...)`; `off` on `mistakes` drops it and lists it in `off`; override on `rules` replaces its text and lists it in `edited`; override equal to the original text is not `edited`; override for unknown id `"gone"` is ignored; `answersFromText("{")` → error, `("null")` → `answers:null`, `("{}")` → defaults filled; `storedPlanFrom` with a reply that isn't a plan → null, with the 7-day fixture → `config.days.length === 7` and the given `done`.
- [ ] **Step 2: FAIL. Step 3: Implement** `compose.ts`, then the UI and page.
- [ ] **Step 4:** tests, tsc, eslint clean; `npm run dev`, `/dev/prompt`: parts listed in order; switching off "Common mistakes" removes it from the composed text; editing a part marks it edited and survives reload; Next week with no history shows "No past runs yet".
- [ ] **Step 5: Commit** `feat(devtools): prompt studio with labelled, editable parts`.

---

### Task 6: Prompt studio: run, render, history

**Files:**
- Create: `src/features/devtools/prompt/RunPanel.tsx`, `src/features/devtools/prompt/PlanPreview.tsx`, `src/features/devtools/prompt/HistoryList.tsx`
- Modify: `src/features/devtools/prompt/PromptStudio.tsx`, `src/features/devtools/README.md`

**Interfaces:**
- Consumes: routes and `RunRecord`/`RunSummary` (Task 4); `composePrompt`, `storedPlanFrom` (Task 5); `parsePlanConfig`, `WeekView`, `PasteBox`.
- Produces:
  ```ts
  PlanPreview props: { reply: string; onDone?: (done: Record<string, boolean>) => void } // parses, shows error or warnings + WeekView (day 0, today 0, local ticks)
  RunPanel props: { composed: Composed; inputs: StudioState; onRecord: (r: RunRecord) => void }
  HistoryList props: { selectedId?: string; onOpen: (r: RunRecord) => void; refreshKey: number }
  ```
  RunPanel: model select (sonnet default, opus, haiku), Run (disabled while running or when the composed text is empty), elapsed `m:ss`, Cancel (aborts the fetch, which kills the child via `req.signal`). "Paste a reply instead" opens `PasteBox` and saves through `POST /api/dev/history`. The result area under it shows the open record: model, time, cost (`$0.123`), error in rose, else `PlanPreview`, then the raw reply in `<details>`. HistoryList (side column on wide screens, under the result on narrow): date-time, model, title or "not a plan", warnings count, cost, edited parts; click opens the record; "Load inputs" on the open record restores answers/mode/overrides/model into the studio. In Next week mode, the ticks made in the preview of the selected past run feed `storedPlanFrom(…, done, feedback)` for the prompt's `previous`.

- [ ] **Step 1: Implement** the three components and wire them into `PromptStudio`.
- [ ] **Step 2:** tsc, eslint clean.
- [ ] **Step 3: Manual check** (`npm run dev`, back up/restore localStorage): run with haiku on the default answers; while running the timer counts and Cancel ends it with "cancelled" in history and no `claude` process left (`pgrep -f "claude -p"` empty); run again to completion: plan renders under the prompt with days, tools and timers; history shows it; reload, open it from history, Load inputs restores the state. Paste a broken reply: error shown, raw reply visible, page usable. Next week: pick that run, tick two exercises, check the composed prompt's "Earlier weeks" part lists them as `[done]`.
- [ ] **Step 4: README** (how to run, CLI flags and why, history format). **Commit** `feat(devtools): run the prompt with claude and render the plan`.

---

### Task 7: Example viewer (prompt examples)

**Files:**
- Create: `src/features/devtools/model/preview.ts`, `src/features/devtools/model/preview.test.ts`, `src/features/devtools/examples/ExampleViewer.tsx`, `src/app/dev/examples/page.tsx`

**Interfaces:**
- Consumes: `promptParts` (Task 1), `answersFromText` + the studio's saved state (Task 5), `PlanPreview` (Task 6).
- Produces:
  ```ts
  export function previewPlanText(json: string): string; // preview.ts
  ```
  An exercise (object with `sections`) becomes `{ title: <its title>, days: 7 × { theme: "Preview", exercises: [it] } }`; a plan with fewer than 7 days is padded by repeating its days in order; 7+ days unchanged; anything else is returned as is (so `parsePlanConfig` reports the error). The viewer builds `promptParts` from the studio's saved answers (defaults if none), takes the `example` parts, and shows each as a card: id, the part's "Why it's good" line when present, total minutes of its first day, warnings, and `PlanPreview` of `previewPlanText(part.example.json)`. A note at the top says which answers were used and links to `/dev/prompt`.

- [ ] **Step 1: Failing tests:** an exercise → 7 days each holding it; a 2-day plan → days `[a,b,a,b,a,b,a]`; a 7-day plan → identical text after parse; `"[1,2]"` → unchanged; `parsePlanConfig(previewPlanText(EXAMPLE), catalogue())` is `ok`.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4:** tests, tsc, eslint; `/dev/examples` shows the `week-1` example rendered.
- [ ] **Step 5: Commit** `feat(devtools): view the prompt's examples`.

---

### Task 8: Example library view (after autoplan Tasks 9 and 10)

Do this task only once `src/features/plan/examples/index.ts` and `selectExamples` exist.

**Files:**
- Modify: `src/features/devtools/examples/ExampleViewer.tsx`, `src/features/devtools/README.md`

**Interfaces:**
- Consumes: `EXERCISE_EXAMPLES`, `PLAN_EXAMPLES`, `ExerciseExample`, `PlanExample` (autoplan Task 9); `selectExamples` (autoplan Task 10); `conceptById` (autoplan Task 1); `previewPlanText` (Task 7).
- Produces: two tabs, "In the prompt" (Task 7 view) and "Library". Library: filter chips for kind (exercise/plan), area, level, showcase; each card shows id, area · level, concept labels, `note`, an "in prompt" badge when `selectExamples(answers)` includes it, and the rendered preview.

- [ ] **Step 1: Implement. Step 2:** tsc, eslint clean.
- [ ] **Step 3: Manual check:** library shows 15 exercises and 4 plans; filtering Voice · Beginner shows the voice-beginner exercise; with guitar-intermediate answers in the studio, exactly the selected examples carry "in prompt".
- [ ] **Step 4: Commit** `feat(devtools): browse the example library`.
