# Onboarding tours, Simple view and wider hints: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page and every AI-practice tool can run a spotlight tour; a site-wide Simple/Standard level hides controls; hints reach the plan tools; a dev page shows coverage.

**Architecture:** A new feature folder `src/features/guide/` holds pure logic (levels, tour steps, seen state, coverage registry) that is unit tested with `node:test`, plus thin React stores written like `useLabelSystem.tsx` (`useSyncExternalStore`, localStorage `musickit.*`). Generic UI (spotlight tour, attention ring) goes in `src/components/ui` per its CLAUDE.md; the feature wires pages and tools to it. Pages opt in with `<PageHelp pageId>` and `<Tier>` / `data-tour` attributes.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before writing page or layout code, per AGENTS.md), React 19, Tailwind 4, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-08-onboarding-tours-design.md`

## Global Constraints

- Levels are an ordered list `["simple", "standard"]` in one config; tags say "visible from level X up"; Standard shows exactly what pages show today.
- Tour starts only from its button, never automatically. "Seen" = button clicked once; it stops the wobble and rings.
- Tour style: page dims, one section lit with an outline, card with dots and Back / Next / Skip.
- Storage is localStorage under `musickit.*`; unavailable or corrupt storage falls back to defaults.
- A control an exercise turns on stays visible at every level.
- Hidden control uses its default while hidden; saved value returns when shown.
- Reduced motion: wobble and rings become a static ring.
- UI components import from `@/components/ui` only; `ui/` imports nothing from `@/features`; theme tokens, no hex.
- Learner-facing text follows the `teaching-voice` skill; any music fact comes from `npm run -s theory -- ...`.
- Local `next build` cannot fetch Google Fonts; verify with the dev server (`npm run dev -- --webpack` in a worktree), `npx tsc --noEmit` (ignore `.next` errors) and tests.
- The `test` script in `package.json` lists globs; add `src/features/guide/*.test.ts` (and fix the existing `src/features/contact/*.test.tssrc/features/styles/*.test.ts` run-together glob while there).

## Review Focus

- Tour step whose `data-tour` target is not in the page (hidden by level, not rendered): step is skipped; a tour with no visible steps does not open.
- Stored level or tour value that is not a known name (a level later removed, hand-edited): treated as default, never crashes.
- Server render and first client render must match (hydration): stores return the Standard default until storage is read.
- Window resize or scroll while a tour is open: spotlight and card stay on the target and inside the viewport; a target taller than the screen scrolls into view.
- Escape and Skip close the tour and count as seen; closing never leaves the page dimmed or scroll-locked.

---

### Task 1: Levels (pure logic)

**Files:**
- Create: `src/features/guide/levels.ts`
- Test: `src/features/guide/levels.test.ts`
- Modify: `package.json` (test script globs)

**Interfaces:**
- Produces: `LEVELS: readonly ["simple","standard"]`; `type Level = (typeof LEVELS)[number]`; `DEFAULT_LEVEL: Level = "standard"`; `isLevel(v: unknown): v is Level`; `atLeast(current: Level, min: Level): boolean`; `effectiveLevel(global: Level, pageOverride: Level | null): Level`; `stepUp(l: Level): Level` and `stepDown(l: Level): Level` (clamped at the ends).

- [ ] **Step 1: Write failing tests** in `levels.test.ts`: `atLeast("standard","simple")` true, `atLeast("simple","standard")` false, `atLeast("simple","simple")` true; `isLevel("full")` false and `isLevel(null)` false; `effectiveLevel("simple","standard")` is `"standard"` and `effectiveLevel("simple", null)` is `"simple"`; `stepUp("standard")` is `"standard"`, `stepDown("simple")` is `"simple"`.
- [ ] **Step 2:** Run `npx tsx --test src/features/guide/levels.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the signatures above in `levels.ts`; `atLeast` compares `LEVELS.indexOf`.
- [ ] **Step 4:** Run the same command. Expected: PASS. Add the glob to `package.json` and run `npm test`; expected: all green.
- [ ] **Step 5:** Commit `feat(guide): level ordering and resolution`.

### Task 2: Level store, Tier and page context

**Files:**
- Create: `src/features/guide/useLevel.tsx`, `src/features/guide/Tier.tsx`
- Test: `src/features/guide/levelStorage.test.ts` (pure parse/serialise helpers)

**Interfaces:**
- Consumes: Task 1.
- Produces in `levelStorage.ts` (pure, create it): `readLevel(raw: string | null): Level` (unknown → default); `readOverrides(raw: string | null): Record<string, Level>` (invalid JSON or non-level values dropped); `GLOBAL_KEY = "musickit.level"`, `PAGE_KEY = "musickit.level.page"`.
- Produces in `useLevel.tsx` (client): `useLevel(pageId?: string): { level: Level; global: Level; setGlobal(l: Level): void; showMore(): void; showLess(): void; overridden: boolean }`. `setGlobal` clears all page overrides. `showMore/showLess` store an override for `pageId` using `stepUp/stepDown`. Module store + `useSyncExternalStore`, same shape as `useLabelSystem.tsx`; server snapshot is `DEFAULT_LEVEL`.
- Produces in `Tier.tsx`: `GuideProvider({ pageId, children })` (context carrying `pageId`); `useLevelAtLeast(min: Level, force?: boolean): boolean` (true when `force` or `atLeast(level, min)`); `<Tier min={Level} force?={boolean}>` rendering children or null.

- [ ] **Step 1:** Write failing tests for `readLevel(null)` = `"standard"`, `readLevel("bogus")` = `"standard"`, `readOverrides('{"looper":"simple","x":"nope"}')` = `{looper:"simple"}`, `readOverrides("{not json")` = `{}`.
- [ ] **Step 2:** Run `npx tsx --test src/features/guide/levelStorage.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `levelStorage.ts`, then `useLevel.tsx` and `Tier.tsx` to the signatures above.
- [ ] **Step 4:** Run the test (PASS) and `npx tsc --noEmit` (no new errors outside `.next`).
- [ ] **Step 5:** Commit `feat(guide): level store, Tier wrapper, page context`.

### Task 3: Tour steps and seen state (pure logic)

**Files:**
- Create: `src/features/guide/tour.ts`
- Test: `src/features/guide/tour.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `type TourStep = { target: string; title: string; text: string; minLevel?: Level }` (`target` is a `data-tour` value); `visibleSteps(steps: TourStep[], level: Level, present: (target: string) => boolean): TourStep[]` (drops steps above the level and steps whose target is absent); `seenKey(pageId: string): string` returning `musickit.tour.<pageId>`; `parseSeen(raw: string | null): boolean` (only `"1"` is true).

- [ ] **Step 1:** Write failing tests: a step with `minLevel:"standard"` is dropped at `"simple"`; a step whose `present` returns false is dropped; order is kept; `[]` returned when nothing is visible; `seenKey("looper")` is `"musickit.tour.looper"`; `parseSeen("1")` true, `parseSeen(null)` false, `parseSeen("x")` false.
- [ ] **Step 2:** Run `npx tsx --test src/features/guide/tour.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement to the signatures.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(guide): tour step filtering and seen key`.

### Task 4: Spotlight tour and attention ring (UI)

**Files:**
- Create: `src/components/ui/organisms/Tour/Tour.tsx`, `src/components/ui/organisms/Tour/index.ts`, `src/components/ui/atoms/AttentionRing/AttentionRing.tsx`, `src/components/ui/atoms/AttentionRing/index.ts`
- Modify: `src/components/ui/index.ts` (two `export *` lines; update the header comment lists), `src/app/globals.css` (keyframes `tour-wobble`, `tour-ring`; add both classes to the reduced-motion list at the end of the animation block, with a static `outline` fallback)

**Interfaces:**
- Produces: `<Tour steps={{ target: string; title: string; text: string }[]} root?={ParentNode} open onClose={(finished: boolean) => void} />`: portal overlay; the target is found with `(root ?? document).querySelector('[data-tour="<target>"]')`; the lit section is cut out of a dimmed layer (box-shadow cutout or clip-path); card shows title, text, dots, Back / Next (Done on last) / Skip; Escape and Skip call `onClose(false)`, Done calls `onClose(true)`; rect is recomputed on resize and scroll; target scrolled into view on each step; the card is clamped inside the viewport like `Hint` (`Hint.tsx` is the model for placement). `<AttentionRing active>{children}</AttentionRing>`: wraps a button with the wobble and two staggered rings (reuse the look of `wheel-ripple` and `style-pulse` in `globals.css`) while `active`, plain children otherwise.

- [ ] **Step 1:** Implement both components and the CSS.
- [ ] **Step 2:** Verify in the browser on a throwaway page (dev server): wobble and rings show, the spotlight tracks the target on window resize and on a 375px-wide viewport, Escape closes, reduced motion (DevTools emulation) shows a static ring, and no dimmed layer remains after closing.
- [ ] **Step 3:** Run `npx tsc --noEmit` and `npm run lint`. Expected: no new errors.
- [ ] **Step 4:** Commit `feat(ui): spotlight Tour and AttentionRing`.

### Task 5: PageHelp cluster and PageShell wiring

**Files:**
- Create: `src/features/guide/PageHelp.tsx`, `src/features/guide/useTourSeen.tsx`
- Modify: `src/components/PageShell.tsx:16` (new optional `pageId?: string` and `tour?: TourStep[]` props; render `PageHelp` in the title row)

**Interfaces:**
- Consumes: Tasks 2, 3, 4; `HintToggle` from `@/components/ui`.
- Produces: `useTourSeen(pageId: string): [seen: boolean, markSeen: () => void]` (module store, key from `seenKey`). `<PageHelp pageId tour />` (client): a small cluster with the level switch (Simple / Standard), a "Show more" / "Show less" link when the page is overridden or below the top level, the tour button wrapped in `AttentionRing active={!seen}`, and `<HintToggle />` (it renders nothing without a provider, so it can sit there always). Clicking the tour button opens `Tour` with `visibleSteps(tour, level, present)`; if none are visible the button does nothing but still marks seen. When `pageId` is set, `PageShell` also wraps the page content in `GuideProvider` so `Tier` knows the page.

- [ ] **Step 1:** Implement; keep `PageShell` a server component with `PageHelp` as the client island.
- [ ] **Step 2:** Verify on `/tuner` after giving it a two-step tour: wobble until first click, quiet after reload, Simple/Standard switch persists across pages, "Show more" affects only that page, switching the global level clears it.
- [ ] **Step 3:** Run `npx tsc --noEmit`. Expected: no new errors.
- [ ] **Step 4:** Commit `feat(guide): PageHelp cluster in PageShell`.

### Task 6: Looper as the first full example

**Files:**
- Create: `src/features/guide/tours/looper.ts`
- Modify: `src/components/looper/LooperApp.tsx` (add `data-tour` attributes; wrap advanced controls in `Tier`); `src/app/looper/page.tsx` (render `PageHelp` with `pageId="looper"`; the page has no `PageShell`, so place the cluster in the looper's own top bar next to the existing icon buttons)

**Interfaces:**
- Consumes: Tasks 2 to 5.
- Produces: `LOOPER_TOUR: TourStep[]` with the four steps from the spec (copy checked against the `teaching-voice` skill): click any note to hear it; pick a position to see it on the neck; scale, key and other settings live in the side panel; start the drone and metronome any time. Targets are `data-tour` values on the matching sections.

- [ ] **Step 1:** Decide what Simple hides on the looper by listing every control in `LooperApp.tsx` once and tagging the advanced ones `min="standard"`; Standard shows everything as today. Record the list in the commit message.
- [ ] **Step 2:** Add attributes and the tour file.
- [ ] **Step 3:** Verify in the browser: Standard looks identical to before; Simple hides the tagged controls and a hidden control's saved value is not applied; the tour skips steps whose target is hidden.
- [ ] **Step 4:** Commit `feat(looper): page tour and Simple view`.

### Task 7: Plan page hints, tool tours and tool levels

**Files:**
- Create: `src/features/guide/toolTours.ts`, `src/features/guide/toolTours.test.ts`
- Modify: `src/app/plan/page.tsx` (wrap in `HintProvider`, pass `pageId="plan"` and a page tour: day view, week view, exercise card); `src/features/plan/ui/Sections.tsx:28` (`ToolFrame` gets a small tour button with `AttentionRing`; only the first unseen tool on screen wobbles); each `src/features/exercises/basics/<tool>/index.tsx` (`data-tour` targets, `Hint` wrappers on main controls, `Tier` on advanced ones with `force` set when the exercise's props turn the control on, e.g. staff `mic`, `drone`, `click`, and `enable` lists)

**Interfaces:**
- Consumes: Tasks 2 to 5; the `TOOLS` map in `src/features/plan/model/tools.ts:216` (export it if it is not exported).
- Produces: `TOOL_TOURS: Record<PlanTool["type"], TourStep[]>`; `toolTourSeenKey(type: string): string` returning `musickit.tour.tool.<type>`.

- [ ] **Step 1:** Write failing test `toolTours.test.ts`: `Object.keys(TOOL_TOURS)` equals `Object.keys(TOOLS)` (sorted); every tool has at least one step; every step has non-empty title and text; `toolTourSeenKey("staff")` is `"musickit.tour.tool.staff"`.
- [ ] **Step 2:** Run `npx tsx --test src/features/guide/toolTours.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Write `toolTours.ts` for all tool types (use `src/features/exercises/CLAUDE.md` and each tool's `*.props.ts` for what the controls are; run `npm run -s theory -- help` for any music fact). Then add attributes, `Hint`s and `Tier`s tool by tool.
- [ ] **Step 4:** Run the test (PASS). Verify in the browser on `/plan` with an example from `src/features/plan/examples/exercises/`: the "?" now shows, a tool's tour runs scoped to its frame, a control the exercise enables stays visible at Simple, only one tool button wobbles.
- [ ] **Step 5:** Commit `feat(plan): hints, tool tours and levels in exercise tools`.

### Task 8: Coverage registry and /dev/onboarding

**Files:**
- Create: `src/features/guide/coverage.ts`, `src/features/guide/coverage.test.ts`, `src/app/dev/onboarding/page.tsx`, `src/features/guide/CoverageView.tsx`
- Modify: `src/features/guide/Tier.tsx`, `src/features/guide/PageHelp.tsx` and the `Hint` call sites' registration (Hint itself stays untouched: tools register through a `useCoverage` call), `src/features/devtools/registry.ts` (new `DEV_TOOLS` entry; add a tone only if none fits)

**Interfaces:**
- Produces: `registerCoverage(entry: { kind: "page" | "tool"; id: string; levels: Level[]; tourSteps: number; hints: number }): void` (merges entries by `kind:id`, and does nothing when `process.env.NODE_ENV === "production"`); `listCoverage(): CoverageEntry[]`; `CoverageEntry` is that object type.
- Consumes: `LOOPER_TOUR`, `TOOL_TOURS`, the page tour files, and the list of routes (a static list in `coverage.ts` of every page with a tour; pages not yet visited show "not yet visited").

- [ ] **Step 1:** Write failing tests: registering the same `kind:id` twice merges `levels` without duplicates and sums nothing twice; with `NODE_ENV = "production"` `listCoverage()` stays empty; entries sort by kind then id.
- [ ] **Step 2:** Run `npx tsx --test src/features/guide/coverage.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `coverage.ts`, call it from `Tier`, `PageHelp` and tool wrappers, then build the page (table per page and tool: levels with tags, tour steps, hints, gaps highlighted; a level switch to preview).
- [ ] **Step 4:** Run the test (PASS); open `/dev/onboarding`, confirm tools with no tour or no tags stand out, and that a production build answers 404 as the other `/dev` pages do (the layout's `devOnly` gate).
- [ ] **Step 5:** Commit `feat(dev): onboarding coverage page`.

### Task 9: Tours and Simple view for the remaining pages

**Files:**
- Create: `src/features/guide/tours/<page>.ts` for each page below
- Modify: each page's component to add `data-tour` attributes and `Tier` tags, and its `PageShell` call to pass `pageId` and `tour`

Pages, in order: `/tuner`, `/theory` tools (arpeggios, backing, basics, caged, chords, circle, ears, improv, metronome-drone, notes, piano, rhythm, scales, singing, triads, tune-by-ear, tunings), `/course`, `/cheatsheet`, `/faq`. Marketing pages and `/dev` get none.

- [ ] **Step 1:** Per page: list its sections, write 3 to 5 steps (voice rules), tag only controls a beginner truly does not need yet; Standard must stay identical to today.
- [ ] **Step 2:** Per page: open it in the browser at Standard and Simple at desktop and 375px width and run its tour; check `/dev/onboarding` shows it covered.
- [ ] **Step 3:** Commit once per page: `feat(<page>): page tour and Simple view`.

---

## Self-review notes

- Spec coverage: tour (Tasks 3 to 5), exercise tours (7), levels and overrides (1 to 2, 5), hint extension (7), dev page (8), rollout (6, 9). Non-goals respected: no AI/prompt changes, no auto-start, no re-pulse on level change.
- Where the spec leaves it to the builder: exact tier assignment per page, step copy, spotlight technique, rollout order beyond looper first.
