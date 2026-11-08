# Onboarding tours, complexity levels and wider hints

Date: 2026-11-08. Status: approved.

## Intent and why

New visitors land on dense pages (looper, theory tools, AI practice exercises) and do not know what each section does. Experienced users do not want the explanations in their way. Three linked features fix this:

1. A **page tour**: a short, stepped walkthrough of each page's sections.
2. **Exercise tours**: every tool in "AI practice" explains itself.
3. A **complexity level** (first version: Simple / Standard, built so more levels can be added) that hides controls a beginner does not need yet.

Plus a fourth, smaller piece: extend the existing **hint cursor** (`Hint`) to more components, especially the AI-plan tools.

## Goals

- Every page can start a tour of its sections in plain words, e.g. looper: "Click any note to hear it", "Pick a position to see it on the neck", "Scale, key and other settings live in the side panel", "Start the drone and metronome any time".
- The tour button is noticeable until first used: it wobbles and sends out concentric rings, then goes quiet (but stays available).
- Every exercise tool type used in AI practice has its own short tour, including tools in plans the AI wrote.
- One site-wide level setting changes how much each page shows; the tour only covers what is visible at that level.
- The hint cursor works on `/plan` and on the main controls of every exercise tool.

- A dev-only page at `/dev/onboarding` that shows which components support levels, tours and hints (see "Dev coverage page").

## Dev coverage page (requested by the user)

- Components and pages register themselves when they use the system, so the page can list them without a hand-kept list. The user suggested a decorator-like registration.
- Claude's call on shape: the `Tier` wrapper, the tour-step files and the `Hint` wrapper each call a small `registerCoverage({ kind, id, levels })` in development builds only. In production it compiles to nothing (guarded by `process.env.NODE_ENV`), and `/dev/*` routes stay as they are today.
- Because registration happens when a component renders, the page can only list what has rendered in the current session. Claude's call to cover that: the page also loads the static tour-step files and the list of exercise tool types directly, and shows each page's route with a link, so unvisited pages show as "not yet visited" instead of missing.
- The page shows, per page and per tool: which levels have tagged controls (every level in the config list), whether a tour exists, how many steps, and whether `Hint`s are present. Gaps stand out (tool with no tour, page with no tags).
- A level switch on the page lets the user preview a level across components.

## Non-goals

- No accounts or server storage. State is localStorage (`musickit.*`).
- The AI plan prompt and plan schema do not change; tours are not AI-written.
- No auto-default to Simple from plan answers (possible later).
- No "new things unlocked" re-pulse when the level is raised (possible later).
- No removal or redesign of the existing hint cursor; the tour does not replace it.

## Anti-goals (a failure even if it technically works)

- A tour that traps users: it must always be skippable and never re-open by itself after being skipped.
- Simple view that strands users: they must always be able to raise the level.
- Motion that ignores `prefers-reduced-motion`.

## Decisions by the user

- **Tour is separate from the hint cursor.** Own button, own behavior. The hint cursor stays: arm it, tap a control, read a card.
- **Tour style: spotlight steps.** The page dims, one section is lit with an outline, a small card explains it, with dots and Back / Next / Skip.
- **Tour button attention:** wobble plus concentric rings until first clicked.
- Exercise tours are per tool type and come "for free" for AI-written plans. (Decided in chat as a guess the user did not object to.)
- **Levels, first version: Simple and Standard only.** The user wants the simplified view extracted now, with the ability to split into more levels later. Controls hide, not just explanations.
- **Standard means exactly what every page shows today.** Simple only hides things. No existing control is hidden at Standard, so returning visitors lose nothing.
- **Levels are an ordered list in one config file** (`["simple", "standard"]` for now). Adding a level later (for example a Full level that reveals advanced controls, or a split of Simple) means adding a name to the list and tagging controls; no API or storage change. Tags say "visible from level X up" and compare by position in the list.
- **Exercise tools on `/plan`:** a control the exercise turns on stays visible whatever the level. Otherwise the tool follows the level.
- A per-page "Show more" escape raises the level one step (with "Show less" to go back).

## Decisions by Claude (user can change)

- Default level on first visit: Standard.
- Level switch lives in the page header next to the tour button and the "?".
- "Seen" state is per page, stored under a `musickit.tour.<pageId>` key, modeled on `musickit.styleSeen`.
- Per-page "Show more" changes the level for that page only (stored per page, falling back to the global level).
- Tour steps are data: one file per page with `{ target, title, text, minLevel }`. Targets are `data-tour="..."` attributes so layout changes do not break steps.
- Tier tags on controls are a `<Tier min="standard">` wrapper (or hook `useLevelAtLeast`) from a new small module; no per-component prop plumbing.
- The hint cursor gets a `HintProvider` at the shared plan page shell, and `Hint` wrappers on each tool's main controls.
- Reuse existing keyframes: `wheel-ripple` for the rings and a variant of `style-pulse` for the wobble. Reduced-motion fallback is a static highlighted ring.
- Build UI parts as atoms/molecules in `src/components/ui` following `src/components/ui/CLAUDE.md`.

## More decisions by Claude (from the builder check; user can change)

- **Tour start:** only from the button, never automatically. "Seen" means the button was clicked once (wobble stops). This avoids colliding with the style-picker intro (`musickit.styleSeen`) and `PracticeReminder`.
- **Exercise tours:** each tool gets its own small tour button in its frame (`ToolFrame` in `Sections.tsx`). Seen state is per tool type. Only the first unseen tool on screen wobbles; others stay calm. The `/plan` page tour covers the page itself (day view, week view, exercise card), not tool internals.
- **Level switch and overrides:** the header switch sets the global level. "Show more" raises that page one step (today only Simple to Standard; more steps appear when levels are added) and is stored per page. A "Show less" link lowers it back. Changing the global level clears all per-page overrides, so the page always follows the global setting afterwards.
- **Header cluster:** one client component (`PageHelp`, taking a `pageId`) holds level switch, tour button and, only on pages that have hints, the "?". `PageShell` (server component) renders it; pages with a custom `header` or without `PageShell` (looper) place it themselves.
- **Hidden controls:** while a control is hidden, the page uses that control's default value; the saved value stays in storage and returns when the control is shown again. A beginner never hears an effect they cannot see.

## What exists today (from code recon)

- `Hint` / `HintProvider` / `HintToggle`: `src/components/ui/molecules/Hint/Hint.tsx`. No animation, state is in memory only. `/plan` has no provider, so the "?" in SingAlong renders nothing there.
- No tour, coach-mark or onboarding component exists.
- Keyframes `wheel-ripple` and `style-pulse` in `src/app/globals.css`. Reduced-motion override at the end of that block.
- Exercise tools: ~20 types, rendered through one switch in `src/features/plan/ui/ExerciseTool.tsx`.
- Preference hooks: `useSyncExternalStore` module store pattern in `src/features/theory/useLabelSystem.tsx`.
- Pages: `/looper`, `/tuner`, `/plan`, `/course`, `/cheatsheet`, `/faq`, `/theory/*` (about 20 tools), plus marketing pages.
- Next.js in this repo differs from common knowledge; builders must read `node_modules/next/dist/docs/` before writing code (see AGENTS.md).

## Constraints

- Follow `AGENTS.md`, `src/components/ui/CLAUDE.md`, `src/features/exercises/CLAUDE.md`.
- Any music fact in tour text must come from `npm run -s theory -- ...`.
- Learner-facing text follows the `teaching-voice` skill (plain, short, practical).
- Local `next build` cannot fetch Google Fonts here; verify via dev server, `tsc` and tests.

## Left to the builder

- Tier assignment for each page's controls (start with looper, then plan tools, then theory pages one by one).
- Exact copy of each step, within the voice rules.
- The spotlight implementation (portal + clip-path or box-shadow cutout), focus handling, and scroll-into-view.
- Rollout order: shared pieces first, looper as the first full example, then plan tools, then other pages.
- Tests: pure logic (levels, step filtering, seen state) unit tested; spotlight checked in the browser at mobile and desktop widths.

## Out of scope for the first plan

Marketing pages (`/`, `/players`, `/teach`, `/teachers`) and `/dev/*` get no tours.
