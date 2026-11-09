# Plan topics, progress log and AI summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 70-concept plan questionnaire with 18 one-tap topics, log every exercise rating by id, and send the week plus the AI's own progress summary in the next-week prompt.

**Architecture:** The cold-start questionnaire becomes its own sub-feature, `src/features/plan/intake/` (topics, answers, screens). Ratings go to a mock DB in `src/features/progress/` (localStorage behind an async interface, like `PlanStore`). The prompt gains a "This week" part grouped by topic and a "Progress summary" part that carries the AI's hidden `progress` text from the last plan. `/dev/data` shows the stored data.

**Tech Stack:** Next.js (this repo's version: read `node_modules/next/dist/docs/` before writing page code), React, TypeScript, Tailwind, `node:test` through tsx.

**Spec:** `docs/superpowers/specs/2026-11-10-plan-topics-progress-design.md`. Read it first; the topic table, the mapping of concepts to topics and the 72 lines are there and are not repeated here.

## Global Constraints

- No server: all storage is localStorage behind an async interface. Keys: `musickit.plan` (exists), `musickit.progress` (new).
- The AI's `progress` text is never rendered in the student-facing app. Only `/dev/data` shows it.
- No per-concept questions, no "level" screen, no "focus" screen.
- `src/features/plan/intake/` imports nothing from the plan's prompt, store or week view. It may import types from `../model/concepts` and `../model/types`.
- Learner-facing text follows the `teaching-voice` skill: "position", never "box"; ♯ ♭; Do Re Mi capitalised. Topic lines are copied from the spec word for word.
- Buttons are real `<button>`s, at least 44px tall, `aria-pressed` on a chosen option.
- Tests: `node:test` + `node:assert/strict`, files beside the code. Run with the cached tsx (memory `tsx-not-installed`), e.g. `<tsx> --test src/features/plan/intake/*.test.ts`. Type check: `npx tsc --noEmit` (ignore errors under `.next/`). Lint: `npx eslint <changed files>`.
- Commits: other sessions share this checkout and its index. Commit only your own paths through a temp `GIT_INDEX_FILE` (memory `shared-index-staging`). `PlanApp.tsx`, `WeekView.tsx`, `DayTimer.tsx` and `plan/README.md` have uncommitted work from another session: commit only your own hunks of them. Commit on main, do not push.

## Review Focus

1. The AI tags an exercise with an unknown topic id, a topic of another area, or concept ids that don't exist → the bad tag is dropped with a warning and the plan still pastes. (Task 3)
2. `musickit.progress` holds something that isn't an array, or one broken row → the log loads empty or without that row; rating still works. (Task 4)
3. A history plan is restarted ("use again") → its exercises get new ids, so its new ratings never overwrite the old week's rows. (Task 3)
4. A rating is changed several times, then cleared → the log has one row for that exercise, then none. (Task 4)
5. A half-finished flow saved in sessionStorage with the old answers shape is resumed after the update → the draft is migrated, the flow opens, nothing throws. (Task 2)

---

### Task 1: Topics and the topic of every concept

**Files:**
- Create: `src/features/plan/intake/topics.ts`, `src/features/plan/intake/topics.test.ts`, `src/features/plan/intake/README.md`
- Modify: `src/features/plan/model/concepts.ts`, `src/features/plan/model/concepts.test.ts`, `package.json` (add `src/features/plan/intake/*.test.ts` to the `test` script)

**Interfaces:**
- Produces:
  ```ts
  export type Rung = 0 | 1 | 2 | 3;
  export interface Topic { id: string; area: Area; label: string; desc: string; lines: readonly [string, string, string, string] }
  export const TOPICS: Topic[];                 // 18, in the spec's table order
  export const topicById: (id: string) => Topic | undefined;
  export const topicsFor: (area: Area) => Topic[];
  // concepts.ts: Concept gains `topic: string`
  export const conceptsOf: (topicId: string) => Concept[];
  ```
- Topic ids, in order: `guitar-scales`, `guitar-basic-chords`, `guitar-barre-chords`, `guitar-extended-chords`, `guitar-caged`, `guitar-techniques`, `voice-pitch`, `voice-intervals`, `voice-melodies`, `voice-breath-range`, `voice-runs`, `voice-harmony`, `theory-basics`, `theory-ear`, `theory-scales-keys`, `theory-building-chords`, `theory-progressions`, `theory-modes`.

- [ ] **Step 1: Write the failing tests**

  `topics.test.ts`: 18 topics; 6 per area; ids unique and equal to the list above; every `lines[0] === "Not yet"`; no line or desc contains "box"; `topicById("guitar-barre-chords")!.lines[1] === "I can hold an F or Bm, but it buzzes"`.
  `concepts.test.ts` (add): every concept's `topic` is a known topic of the concept's own area; every topic has at least one concept; `conceptById("bm-f-barre")!.topic === "guitar-barre-chords"`; `conceptById("spider")!.topic === "guitar-techniques"`; `conceptById("power-chords")!.topic === "guitar-basic-chords"`.

- [ ] **Step 2: Run them, expect FAIL** (module not found / `topic` undefined)
- [ ] **Step 3: Write `topics.ts`** with labels, descs and lines from the spec ("Covers" column → `desc`, "The lines" section → `lines`, with "Not yet" first). Add `topic` as a required argument of `c()` in `concepts.ts`, set per the spec's mapping, and add `conceptsOf`.
- [ ] **Step 4: Run the tests, expect PASS**; `npx tsc --noEmit` clean.
- [ ] **Step 5: Write `intake/README.md`**: what the feature is for (cold start only), its files, the import rule from Global Constraints.
- [ ] **Step 6: Commit** `feat(plan): 18 questionnaire topics, each concept in one`

### Task 2: New answers and the questionnaire screens

**Files:**
- Create: `src/features/plan/intake/answers.ts`, `src/features/plan/intake/answers.test.ts`, `src/features/plan/intake/ui/Questionnaire.tsx`, `src/features/plan/intake/ui/TopicStep.tsx`
- Move: `src/features/plan/ui/RangeFinder.tsx` → `src/features/plan/intake/ui/RangeFinder.tsx`
- Delete: `src/features/plan/model/answers.ts`, `answers.test.ts`, `focus.ts`, `focus.test.ts`, `src/features/plan/ui/Questionnaire.tsx`
- Modify: `src/features/plan/model/types.ts` (drop `PlanAnswers`, `Rating`; re-export `PlanAnswers` from intake), `model/questions.ts` (keep `LEVELS`, `labelOf`; `MINUTES` and `DEFAULT_ANSWERS` move to intake), `model/exampleSelection.ts` (+test), `model/prompt.ts` (+test; student part only), `ui/PlanFlow.tsx`, `PlanApp.tsx`, `store/localPlanStore.ts`, `src/features/devtools/model/compose.ts` (+test) and any other importer `tsc` reports.

**Interfaces:**
- Consumes: Task 1.
- Produces, in `intake/answers.ts`:
  ```ts
  export interface PlanAnswers {
    areas: Area[];                       // in AREAS order, at least one
    topics: Record<string, Rung>;        // topic id → chosen line
    voice?: { type?: Voice; range?: { low: number; high: number } };
    minutes: number; styles: string; notes: string;
  }
  export const MINUTES: number[];        // unchanged values
  export const DEFAULT_ANSWERS: PlanAnswers; // { areas: ["guitar"], topics: {}, minutes: 20, styles: "", notes: "" }
  export function migrateAnswers(raw: unknown): PlanAnswers;
  export function levelOf(a: PlanAnswers, area: Area): Level;
  export function areasMissingTopics(a: PlanAnswers): Area[]; // chosen areas with no answered topic
  ```
  and in `intake/ui/Questionnaire.tsx`:
  ```ts
  export type SetAnswer = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void;
  export function areasStep(a: PlanAnswers, set: SetAnswer): ModalStep;
  export function topicSteps(a: PlanAnswers, set: SetAnswer, areas?: Area[]): ModalStep[]; // default: a.areas
  export function restSteps(a: PlanAnswers, set: SetAnswer): ModalStep[]; // voice (if chosen), minutes, anything else
  export function questionSteps(a: PlanAnswers, set: SetAnswer): ModalStep[]; // areas, topics, rest
  ```

- [ ] **Step 1: Write the failing tests** in `intake/answers.test.ts`:
  - `migrateAnswers(null)` deep-equals `DEFAULT_ANSWERS`.
  - Old shape `{ levels: { guitar: "intermediate", voice: "new" }, ratings: { caged: 3 }, focus: ["caged"], minutes: 30, styles: "blues", notes: "x", voice: { type: <a valid voice id> } }` → `areas: ["guitar", "voice"]`, `topics: {}`, minutes 30, styles, notes and voice kept, no `ratings`/`focus`/`levels` keys.
  - Oldest shape (`instruments: ["voice"], level: "beginner"`) → `areas` contains `"voice"` and `"theory"`.
  - New shape round-trips unchanged; unknown topic ids and rungs outside 0..3 are dropped; unknown areas dropped; empty `areas` → `["guitar"]`.
  - `levelOf`: rungs 3,1,0 in guitar → `"beginner"` (mean 1.33); rungs 3,3,2 → `"advanced"`; no answers → `"beginner"`; rung 0 only → `"new"`.
  - `areasMissingTopics({ areas: ["guitar","voice"], topics: { "voice-pitch": 2 }, ... })` → `["guitar"]`.
  Update `exampleSelection.test.ts`, `prompt.test.ts`, `compose.test.ts` fixtures to the new shape; add to `prompt.test.ts`: the student part contains `Barre chords: I can hold an F or Bm, but it buzzes` for `topics: { "guitar-barre-chords": 1 }` and `Scales: (not answered)`; it contains no "Focus this week".

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement `intake/answers.ts`.** `levelOf`: mean of the area's answered rungs, `Math.round`, index into `["new","beginner","intermediate","advanced"]`; none answered → `"beginner"`. `migrateAnswers` reads `areas` when present, else the keys of old `levels`, else the oldest `instruments` shape (same rule as today's `oldLevels`).
- [ ] **Step 4: Switch the consumers.** `exampleSelection` uses `a.areas` and `levelOf`. `prompt.ts` `studentLines`: per chosen area one line `- <Area> (about <level label>):` followed by `<Topic label>: <chosen line>` or `(not answered)` for each topic; drop the focus line; in "How to plan" replace the two lines about stars/unsure/focus and "concepts below the levels" with: plan from the lines they chose, spend most time where they chose the first or second line, treat a not-answered topic as unknown and test it gently. Leave the history part as it is (Task 5).
- [ ] **Step 5: Build the screens.** `areasStep`: title "What do you play?", one chip per area, `canNext` needs one. `TopicStep.tsx`: the accordion from mockup A: one row open at a time (the first unanswered on mount); a tap on a line sets the rung, closes the row and opens the next unanswered one; a tap on the chosen line again clears it; a closed answered row shows the chosen line under the label; the hint shows "N of 6 answered". Title `"<Area>: where are you now?"`, hint "For each topic, pick the line that sounds most like you." `restSteps` are today's voice, minutes and anything-else screens moved over unchanged. `PlanFlow` uses `questionSteps` for both modes for now and migrates a resumed draft with `migrateAnswers`.
- [ ] **Step 6: Run all plan, intake and devtools tests, `tsc`, eslint: PASS/clean.**
- [ ] **Step 7: Check by hand** in dev (`/plan`, Start anew): areas → topic screens → prompt shows the chosen lines. Keep the user's `musickit.plan` (memory `browser-test-keep-user-data`).
- [ ] **Step 8: Commit** `feat(plan): topic questionnaire as the intake feature`

### Task 3: Exercise ids, topic tags and `progress` on a plan

**Files:**
- Create: `src/features/plan/model/exerciseIds.ts`
- Modify: `model/types.ts`, `model/config.ts`, `model/plan.test.ts`, `store/localPlanStore.ts`, `PlanApp.tsx` (`start`)

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  interface PlanExercise { id?: string; topic?: string; concepts?: string[]; /* …existing */ }
  interface PlanConfig { progress?: string; /* …existing */ }
  // exerciseIds.ts
  export function withExerciseIds(config: PlanConfig, newId: () => string, fresh?: boolean): PlanConfig;
  // fresh: replace every id; otherwise fill only missing ones and return the same object when none is missing
  ```

- [ ] **Step 1: Write the failing tests** in `plan.test.ts`:
  - `parsePlanConfig` keeps `topic: "guitar-caged"` on a guitar exercise; drops `topic: "nope"` with a warning containing `unknown topic`; drops a topic whose area differs from the exercise's `area` with a warning; keeps only known `concepts` (max 4); never keeps an `id` the AI sent.
  - An exercise with no topic adds `topic` to the existing "no … tag" warning.
  - `progress` is kept, trimmed, cut to 4000 characters; a reply without it adds the warning `No progress summary in the reply.`; still `ok: true`.
  - `withExerciseIds`: fills missing ids, keeps existing ones; with `fresh` every id changes; ids are unique across the week.
  - `sanitiseState` on a stored plan without exercise ids returns one where every exercise has an id (current and history).
  - Restart (Review Focus 3): `start(state, historyPlan.config)` gives exercises whose ids differ from the history plan's. Export `start` from a model file if needed to test it.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** `start()` calls `withExerciseIds(config, newId, true)`. `sanitiseState` calls it without `fresh`; `usePlan`'s load saves the state back when ids were added.
- [ ] **Step 4: Run, expect PASS; `tsc` clean.**
- [ ] **Step 5: Commit** `feat(plan): exercise ids, topic tags and the AI's progress field`

### Task 4: The progress log

**Files:**
- Create: `src/features/progress/log.ts`, `log.test.ts`, `ProgressStore.ts`, `localProgressStore.ts`, `useProgress.tsx`; `src/features/plan/model/progressLog.ts` (+ tests in `plan.test.ts`)
- Modify: `src/features/plan/PlanApp.tsx`

**Interfaces:**
- Consumes: Task 3 (`PlanExercise.id`, `topic`, `concepts`).
- Produces:
  ```ts
  // progress/log.ts — generic, knows nothing about plans
  export interface ProgressEntry {
    id: string; planId: string; exerciseId: string; day: number; exercise: number;
    title: string; focus?: string; area?: string; level?: string; topic?: string; concepts?: string[];
    stars: Stars; at: string;
  }
  export function cleanEntries(raw: unknown): ProgressEntry[];
  export function upsert(list: ProgressEntry[], e: ProgressEntry): ProgressEntry[]; // one row per exerciseId, keeps the old row's id
  export function without(list: ProgressEntry[], exerciseId: string): ProgressEntry[];
  // progress/ProgressStore.ts
  export interface ProgressStore { list(): Promise<ProgressEntry[]>; put(e: ProgressEntry): Promise<void>; remove(exerciseId: string): Promise<void> }
  // progress/localProgressStore.ts
  export const PROGRESS_KEY = "musickit.progress";
  export const localProgressStore: ProgressStore;
  // progress/useProgress.tsx
  export function ProgressStoreProvider(props: { store: ProgressStore; children: ReactNode }): JSX.Element;
  export function useProgress(): { entries: ProgressEntry[]; loaded: boolean; put(e: ProgressEntry): void; remove(exerciseId: string): void };
  // plan/model/progressLog.ts
  export function entryFor(plan: StoredPlan, day: number, exercise: number, rating: StarRating, newId: () => string): ProgressEntry | null; // null: no such exercise or it has no id
  export function backfill(plans: StoredPlan[], newId: () => string): ProgressEntry[]; // one per rated exercise
  ```

- [ ] **Step 1: Write the failing tests.**
  `log.test.ts`: `cleanEntries("x")`, `cleanEntries(null)`, `cleanEntries({})` → `[]`; a list with one row missing `exerciseId` and one with `stars: 9` keeps only the good rows; `upsert` twice for one `exerciseId` with 2 then 5 stars → one row, 5 stars, the first row's `id`; `without` removes it; rating three times then clearing leaves `[]` (Review Focus 4).
  `plan.test.ts`: `entryFor` copies title, focus, area, level, topic, concepts, plan id, day and index; returns null for an exercise with no id. `backfill` of two plans with 2 and 1 rated exercises → 3 entries with the stored `stars` and `at`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** the model, the store (JSON array under `PROGRESS_KEY`, read through `cleanEntries`, try/catch like `localPlanStore`) and the hook (same shape as `usePlan`: state shows at once, saved behind).
- [ ] **Step 4: Wire `PlanApp`.** `rate()` keeps calling `ratePlan`, then `put(entryFor(...))` or `remove(exerciseId)` when stars is null. Once both stores are loaded and the log is empty, `put` every entry of `backfill([current, ...history])`.
- [ ] **Step 5: Run tests, `tsc`, eslint: PASS/clean.** By hand: rate, re-rate and clear an exercise and watch `musickit.progress` in devtools.
- [ ] **Step 6: Commit** `feat(progress): log every exercise rating by id`

### Task 5: The next-week prompt and flow

**Files:**
- Modify: `src/features/plan/model/prompt.ts`, `prompt.test.ts`, `src/features/plan/ui/PlanFlow.tsx`, `src/features/devtools/model/compose.ts` (+test) if part kinds are listed there

**Interfaces:**
- Consumes: `PlanConfig.progress`, `PlanExercise.topic`, `areasMissingTopics`, `topicSteps`, `restSteps`.
- Produces: `export function weekByTopic(plan: StoredPlan): string`; `PromptPartKind` gains `"week"` and `"progress"`; `promptParts` and `buildPrompt` keep their signatures (`previous[0]` is the week just finished).

- [ ] **Step 1: Write the failing tests** in `prompt.test.ts`:
  - First week (`previous` empty): no part of kind `week`, `progress` or `history`.
  - Next week, last plan has `progress: "Barre: buzzing less."`: a `week` part whose text has a heading per topic label, each exercise as `[4★ Solid] <title> (<level> · <focus>)`, unrated ones as `[skipped]`, exercises without a topic under `Other`, and the feedback line; a `progress` part containing the summary word for word; **no** `history` part; the student part's heading says these are the answers from when they started.
  - Next week, last plan has no `progress`: no `progress` part; the `history` part with up to three `weekReport`s, as today.
  - The rules text contains `"progress"` and "one line per topic"; the answer-format interface lists `topic`, `concepts` and `progress`, and every topic id.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** `weekByTopic` reads stars from `plan.rated` (it holds the same ratings as the log for this plan, and keeps the prompt a pure function of the plan). Summary rules, as one block under "How to plan": return `progress` in the JSON; one line per topic the student plays: where they stand, what moved this week, what is stuck, what to try next; rewrite it whole from the old summary plus this week's ratings; trust ratings over the starting answers; under about 300 words; written for yourself, the student never sees it. Interface: `topic` (one id of the exercise's area, with the id list and each topic's concept ids from `conceptsOf`), `concepts?` (up to 4 ids of that topic), `progress` on `PlanConfig`.
- [ ] **Step 4: `PlanFlow`, mode `"next"`:** steps are "How did this week go" (with a "Change my answers" text button that inserts `areasStep` + `topicSteps` after it), then `topicSteps(draft, set, areasMissingTopics(answers))` (old answers, once), then `restSteps` without the voice step, then copy and paste. Mode `"start"` is `questionSteps` as in Task 2. Change the copy step's hint for "next" to say it carries this week's ratings and the AI's notes on their progress.
- [ ] **Step 5: Run tests, `tsc`, eslint. By hand:** `/dev/prompt` next-week with a past run; `/plan` → Plan next week.
- [ ] **Step 6: Commit** `feat(plan): next-week prompt carries the week by topic and the AI's summary`

### Task 6: Examples carry the new fields

**Files:**
- Modify: every JSON under `src/features/plan/examples/exercises/` and `plans/`, `examples/examples.test.ts`, `examples/README.md`; regenerate docs with `npm run docs:exercises` if the generated doc changes.

- [ ] **Step 1: Failing test** in `examples.test.ts`: every example exercise (and every exercise inside a plan example) has a `topic` that is a known topic of its `area`; its `concepts`, when present, belong to that topic; every plan example has a `progress` under 300 words with one line per topic its exercises use.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Tag the examples**, using the `exercise-example` skill's rules. A plan example's `progress` is written as the AI would write it after that week (plain notes, not teaching text).
- [ ] **Step 4: Run, expect PASS**, plus the whole plan and devtools test folders.
- [ ] **Step 5: Commit** `feat(plan): examples tagged with topics and a progress summary`

### Task 7: `/dev/data` and docs

**Files:**
- Create: `src/app/dev/data/page.tsx`, `src/features/devtools/data/DataPage.tsx`, `src/features/devtools/model/dataView.ts` (+ `dataView.test.ts`)
- Modify: `src/features/devtools/registry.ts` (tool entry `{ href: "/dev/data", label: "Data", desc: "Answers, plans, ratings and the AI's summaries in this browser", tone: "data" }` and a `data` tone in sky), `src/features/devtools/README.md`, `src/features/plan/README.md`, `src/features/progress/` gets a short `README.md`

**Interfaces:**
- Produces, in `dataView.ts`:
  ```ts
  export function planRows(state: PlanState): { id: string; title: string; startedOn: string; rated: number; total: number; current: boolean; progress?: string }[]; // current first, then history order
  export function logRows(entries: ProgressEntry[], topic?: string): ProgressEntry[]; // newest first, filtered by topic id; "" or undefined = all
  ```

- [ ] **Step 1: Failing tests** for `planRows` (counts, order, `progress` passed through) and `logRows` (sort, filter).
- [ ] **Step 2: Run, expect FAIL; implement; run, expect PASS.**
- [ ] **Step 3: Build the page**, read-only, four blocks: Answers (areas, each topic with its chosen line), Plans (`planRows` table), Progress log (`logRows` table with time, plan title, exercise, topic label, stars; a topic `<select>`), AI summaries (each plan's `progress` in a `<pre>`, newest first). Each block has a "Raw JSON" disclosure with a copy button. It reads through `localPlanStore` and `localProgressStore` and writes nothing. Empty stores show "Nothing stored yet."
- [ ] **Step 4: Docs.** Plan README: the new flow, `intake/`, the log, `progress`, the changed prompt parts. Devtools README: the `/dev/data` section.
- [ ] **Step 5: `tsc`, eslint, all tests. By hand:** open `/dev/data` after rating an exercise; confirm `/plan` shows no summary text anywhere.
- [ ] **Step 6: Commit** `feat(dev): /dev/data shows answers, plans, ratings and summaries`
