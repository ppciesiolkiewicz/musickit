# /dev/questionnaire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local-only dev page where you answer the first questionnaire and see, live, what each answer does to the topics, area levels, concepts, example selection and starting outcome.

**Architecture:** One pure function, `startOutcome`, in a new `model/outcome.ts` (Part C extends this file later). A client view in `features/devtools/questionnaire/` renders the real questionnaire screens (`questionSteps`) stacked in one column on the left, saving nothing, and bare tables on the right computed from the same draft answers. The page is one entry in the dev registry and one route under `src/app/dev/(local)`.

**Tech Stack:** Next.js app router (read `node_modules/next/dist/docs/` before touching routing), React, Tailwind, node:test via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-15-blocks-and-progress-design.md` (Part A).

## Global Constraints

- Local only: the page lives under `src/app/dev/(local)/questionnaire`; a production build answers 404 (the group's layout does this).
- Saves nothing: no `PlanStore`, no `localStorage`; draft answers live in component state, starting from `DEFAULT_ANSWERS`.
- Bare data: plain tables and lists, no charts.
- `src/features/plan/intake` imports nothing from the plan's prompt, store or week view (its README rule); the new code lives outside `intake/`.
- Commit only this task's paths via a temp `GIT_INDEX_FILE` (memory shared-index-staging), straight on main; never `git add` in the shared checkout.

## Review Focus

- No area chosen yet (areas empty): the tables show nothing for areas and `selectExamples` must not throw; expect the page to render with an "No area chosen" line.
- An area switched off after its topics were answered: its answers stay in the draft (the questionnaire keeps them), but the tables show only chosen areas for levels and concepts; the starting-outcome table shows all areas, since answers are kept.
- A topic left unanswered: shown as "unanswered" with score null, not 0, and `levelOf` ignores it (an area with nothing answered reads "beginner").
- Rounding at .5: `levelOf` rounds a mean of 1.5 up to intermediate; the table shows the mean as well as the level, so a reader sees why.
- The RangeFinder (mic) on the voice screen: it may ask for the microphone; it must not break the page when denied (it already handles this; check by denying once).

Tests for the first three are in Task 1.

---

### Task 1: `startOutcome`

**Files:**
- Create: `src/features/plan/model/outcome.ts`
- Test: `src/features/plan/model/outcome.test.ts` (already covered by the `src/features/plan/model/*.test.ts` glob in `package.json`)

**Interfaces:**
- Consumes: `AREAS`, `Area` (`model/concepts.ts`); `topicsFor` (`intake/topics.ts`); `PlanAnswers` (`intake/answers.ts`).
- Produces (Part C relies on these exact names):
  - `export type TopicScore = { topic: string; label: string; score: number | null }`
  - `export function startOutcome(topics: PlanAnswers["topics"]): { area: Area; topics: TopicScore[] }[]`: every area in `AREAS` order, its topics in `topicsFor` order; `score` is the rung, or `null` when the topic is unanswered.

- [ ] **Step 1: Write the failing tests**

```ts
test("startOutcome: every area in AREAS order, six topics each, unanswered is null", () => {
  const out = startOutcome({});
  assert.deepEqual(out.map((a) => a.area), AREAS.map((a) => a.id)); // guitar, voice, theory today; never literals
  assert.ok(out.every((a) => a.topics.length === 6));
  assert.ok(out.every((a) => a.topics.every((t) => t.score === null)));
});

test("startOutcome: a rung is the topic's score, 0 is kept as 0", () => {
  const out = startOutcome({ "guitar-caged": 2, "voice-pitch": 0 });
  const t = (id: string) => out.flatMap((a) => a.topics).find((x) => x.topic === id)!;
  assert.equal(t("guitar-caged").score, 2);
  assert.equal(t("guitar-caged").label, "CAGED");
  assert.equal(t("voice-pitch").score, 0);
  assert.equal(t("guitar-scales").score, null);
});

test("startOutcome: an unknown topic id in the answers is ignored", () => {
  const out = startOutcome({ nope: 3 } as PlanAnswers["topics"]);
  assert.ok(out.flatMap((a) => a.topics).every((t) => t.score === null));
});
```

- [ ] **Step 2: Run, expect FAIL** (`startOutcome` not exported)

Run: `npx tsx --test src/features/plan/model/outcome.test.ts`

- [ ] **Step 3: Implement `startOutcome` in `src/features/plan/model/outcome.ts`**, with a file comment saying Part C adds the ratings-based outcome here.

- [ ] **Step 4: Run, expect PASS**; then `npx tsc --noEmit 2>&1 | grep -v '^.next/'` shows nothing new.

- [ ] **Step 5: Commit** `src/features/plan/model/outcome.ts`, `src/features/plan/model/outcome.test.ts`:
  `feat(plan): startOutcome, each topic's starting score from the questionnaire` + the Co-Authored-By line.

### Task 2: the /dev/questionnaire page

**Files:**
- Create: `src/features/devtools/questionnaire/QuestionnaireLab.tsx` (client component, the whole view)
- Create: `src/app/dev/(local)/questionnaire/page.tsx` (`<DevShell wide><QuestionnaireLab /></DevShell>`, like `dev/(local)/onboarding/page.tsx`)
- Modify: `src/features/devtools/registry.ts` (one `DEV_TOOLS` entry)
- Modify: `src/features/devtools/README.md` (list the page, if the README lists tools)
- Modify: `src/features/plan/intake/README.md` (one line: `/dev/questionnaire` shows what the answers do)
- Test: `src/features/devtools/registry.test.ts` only if it pins the tool list (run it either way)

**Interfaces:**
- Consumes: `questionSteps(draft, set)` and `SetAnswer` (`intake/ui/Questionnaire.tsx`); `DEFAULT_ANSWERS`, `levelOf` (`intake/answers.ts`); `topicsFor`, `topicById` (`intake/topics.ts`); `AREAS`, `CONCEPTS`, `conceptsFor` (`model/concepts.ts`); `selectExamples` (`model/exampleSelection.ts`); `startOutcome` (Task 1).
- Produces: nothing other code uses.

- [ ] **Step 1: Add the registry entry**

```ts
{ href: "/dev/questionnaire", label: "Questionnaire", tone: "prompt", desc: "Answer the first questionnaire and see what each answer does: topic rungs, area levels, the concepts the prompt offers, the examples picked and the starting outcome." },
```

Placed after `/dev/prompt`. Not `live`.

- [ ] **Step 2: Build `QuestionnaireLab`**

Two columns on desktop (`desk:` breakpoint, as elsewhere in the repo), one column on a phone, left first.

Left: `questionSteps(draft, set)` rendered as stacked cards, each the step's `title`, `hint` and `body`, plus a **Reset answers** button that sets the draft back to `DEFAULT_ANSWERS`. There's no step navigation, so every screen is visible at once and an answer anywhere updates the right side.

Right, in this order, each a heading and a plain table:
1. **Topics:** per chosen area, each topic's label, its rung (or "unanswered") and the level that rung names (`["new","beginner","intermediate","advanced"][rung]`).
2. **Area levels:** per chosen area, the mean of its answered rungs (2 decimals, or "–"), and `levelOf(draft, area)`. With no area chosen, the line "No area chosen".
3. **Concepts:** per chosen area, every concept of the area (`CONCEPTS` filtered by area) with its level and topic label, marked "in" or "out" of `conceptsFor(area, levelOf(draft, area))`, with "in" rows first.
4. **Examples picked:** `selectExamples(draft)`, the plan's id, level and areas, then each exercise's id, areas and level.
5. **Starting outcome:** `startOutcome(draft.topics)`, per area (all areas), each topic and its score ("–" for null).

Uses the repo's table styles if `src/components/ui` has one (read `src/components/ui/CLAUDE.md`), otherwise plain `<table>` with Tailwind classes like the other dev pages.

- [ ] **Step 3: Check it on the dev server**

Run `npm run dev` (retry once if it exits on the upgrade notice), open `http://localhost:3000/dev/questionnaire`. Check that:
- the page appears in the /dev index;
- picking Guitar and answering CAGED 2 and Scales 1 shows a mean of 1.50 and level intermediate, concepts move between in and out, and the examples change;
- switching Guitar off keeps its starting-outcome scores but drops it from the other tables;
- Reset answers clears everything;
- at phone width (375px) it's one column with no horizontal scroll.

- [ ] **Step 4: Verify**

`npx tsx --test src/features/devtools/*.test.ts src/features/plan/model/outcome.test.ts` passes; `npx tsc --noEmit 2>&1 | grep -v '^.next/'` is clean; `npx eslint src/features/devtools/questionnaire src/app/dev/\(local\)/questionnaire src/features/devtools/registry.ts` is clean.

- [ ] **Step 5: Commit** the files above: `feat(devtools): /dev/questionnaire shows what each answer does` + the Co-Authored-By line.
