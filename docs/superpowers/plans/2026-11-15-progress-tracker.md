# Progress tracker (Part C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Work out a player's progress per concept, topic and area from their ratings, timer and questionnaire answers over time, and show it: bare tables on `/dev/progress`, and a day streak on `/plan` that opens to the categories by level name.

**Architecture:** The plan document gains `answersHistory` (appended when the questionnaire is finished; moved over lazily in `sanitiseState`). One pure function, `outcome(input, asOf)` in `src/features/plan/model/outcome.ts` (beside Part A's `startOutcome`), takes plans, progress entries, day-timer records and the answers history, so it runs the same over the server, memory and local stores and in tests. The pages gather its inputs with `usePlan`, `useProgress` and a new `useAllPlanTimes` (a new `PlanStore.loadAllTimes`), and render it: tables on a live dev page, and a small streak button plus a tracker modal on `/plan`.

**Tech Stack:** Next.js app router (read `node_modules/next/dist/docs/` before touching a route or page), React, Tailwind, Drizzle (no migration in this part), node:test via `npx tsx --test` (memory note tsx-not-installed: use the cached `~/.npm/_npx` tsx if `npx tsx` hangs).

**Spec:** `docs/superpowers/specs/2026-11-15-blocks-and-progress-design.md` (Part C; Parts A and B landed first).

## Global Constraints

- Parts A and B are on main before Task 1 starts. Names used from them, exactly: `TopicScore`, `startOutcome` (`model/outcome.ts`); `PlanExercise.blockId?: string`; `ProgressEntry.blockId?: string`; `DayTime.blocks?: Record<string, string>` (slot id → block id) beside `spent`.
- The outcome is one pure function with no clock and no store: every date comes in as `asOf` (local `yyyy-mm-dd`).
- **Difficulty comes from concepts, not the block's `level` tag.** A concept's level is its `CONCEPTS` level; an entry's or exercise's `level` is never read by the outcome.
- **Solid block:** latest rating 4 or 5 stars (`SOLID_STARS = 4`).
- **Concept:** `solid` when the latest-rated block tagged with it is solid; `working` (shown "Working on") when it has ratings but isn't solid; `not-yet` when it has none. Per concept: state, own level, ratings count, last date, seconds.
- **Topic score** on 0–3: the floor is the latest questionnaire rung up to `asOf`; reached = the higher of that rung and the highest level with a solid concept in the topic; plus (solid concepts one level up) / (concepts one level up). An entry with no concepts counts toward ratings and time, not the score.
- **Area:** its six topic scores (the radar's axes).
- **Time:** day-timer seconds mapped slot → block tags; a block's seconds count in full toward each of its concepts and once toward its topic (and once toward its area).
- **Streak:** consecutive local days ending on `asOf` or the day before, on which the player rated a block or the day timer counted at least 300 s (`STREAK_SECONDS = 300`).
- **No points, no score, no celebrating** on any player-facing screen: levels by name ("Beginner", "Intermediate"), plain facts ("rated 4 times, last on 12 Nov"), never a number out of 3 or 100, a percentage, or "great job". The streak is a count of days, said plainly. `/dev/progress` may show the raw numbers.
- Every word a player reads is written after loading the skills in AGENTS.md "Words on the screen": interface copy → `design:ux-copy` with "Words about the app" in `teaching-voice` (if `design:ux-copy` isn't installed, write from "Words about the app" alone and say so). Report every string changed, old → new. "Solid", "Working on", "Not yet" are the spec's words.
- `/dev/progress` is in the live group (`src/app/dev/(live)/progress`), shows only the signed-in player's own data through the normal stores, bare tables, no charts.
- `src/features/progress` stays plan-free (its README rule): the outcome lives in `src/features/plan/model/`.
- Not in this part: block tables, block ids, the plan review, the move-over script, course section ratings feeding the outcome, any prompt change (`PROMPT_VERSION` stays).
- Before calling a task done: its tests, `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on the changed files. Keep `src/features/plan/README.md` (and the other READMEs named per task) true in the same commit.
- Commits go straight to main, one per task: commit only this task's paths via a temp GIT_INDEX_FILE (see memory shared-index-staging); never `git add` in the shared checkout. Every message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **A player from before this part** (stored `answers`, plans, no `answersHistory`): loading gives one entry with their topics dated their earliest plan's `startedOn`, so their floor is their old answers, not "not answered". No plan at all: no entry is made (nothing to date it by). Tests in Task 1.
- **A concept rated solid, then rated lower in a later plan:** it goes back to "Working on" and the topic falls back toward the rung, never below the rung. Tests in Task 3.
- **Entries whose tags no longer match the catalogue** (a concept or topic id removed or renamed, an entry with no tags at all): counted where they can be (totals, the topic named), ignored in the concept table, and nothing throws. Tests in Task 3.
- **Timer records whose plan has left the plan history** (20 kept, `fitPlanState` drops more): they have no date, so they count toward time in every as-of run and never toward the streak; nothing throws. Tests in Task 4.
- **The streak while today's timer runs:** today's saves reach the streak without a reload (the current plan's live records are laid over the all-plans read). Test in Task 6.

---

### Task 1: `answersHistory` on the plan document

**Files:**
- Create: `src/features/plan/model/answersHistory.ts`
- Create: `src/features/plan/model/answersHistory.test.ts`
- Modify: `src/features/plan/model/types.ts` (`AnswersEntry`, `PlanState.answersHistory`, `EMPTY_STATE`)
- Modify: `src/features/plan/model/state.ts` (`sanitiseState`)
- Modify: `src/features/plan/model/schedule.ts` (`dayOf`, `addDays`), tests in `src/features/plan/model/plan.test.ts`
- Modify: `src/features/plan/ui/PlanFlow.tsx` (`onPlan` gets `asked`)
- Modify: `src/features/plan/PlanApp.tsx` (`onPlan` records the answers)
- Modify: any test that deep-equals a sanitised state (run `src/features/plan/model/*.test.ts`, `src/features/plan/store/*.test.ts`, `src/features/userData/*.test.ts`, `src/features/userData/server/*.test.ts`; add `answersHistory: []` where they now differ)
- Modify: `src/features/plan/README.md` (code map: `answersHistory.ts`; types line; "The player's path" step 1 and 4: finishing the questions is remembered with its date)

**Interfaces:**
- Produces (types.ts): `export interface AnswersEntry { at: string; topics: PlanAnswers["topics"] }` — `at` is an ISO datetime, or a bare local `yyyy-mm-dd` for a moved-over entry. `PlanState.answersHistory: AnswersEntry[]`, oldest first. `EMPTY_STATE.answersHistory = []`.
- Produces (schedule.ts): `dayOf(at: string): string` — a bare `yyyy-mm-dd` as is, else `localDate(new Date(at))`. `addDays(date: string, n: number): string` — a local `yyyy-mm-dd` plus `n` days.
- Produces (answersHistory.ts):
  - `export const MAX_ANSWERS_HISTORY = 100`
  - `cleanAnswersHistory(raw: unknown): AnswersEntry[]` — not an array → `[]`; an entry needs `at` as a non-empty string of at most 40 characters; `topics` through `migrateAnswers({ topics }).topics` (unknown topics and bad rungs dropped); past the cap keep the first entry (the starting point) and the newest 99.
  - `movedOver(answers: PlanAnswers | null, plans: StoredPlan[]): AnswersEntry[]` — `[]` without answers or without plans; else `[{ at: <earliest startedOn>, topics: answers.topics }]`.
  - `recordAnswers(s: PlanState, answers: PlanAnswers, at: string): PlanState` — appends `{ at, topics: answers.topics }`, applying the same cap.
- PlanFlow: `onPlan(config, answers, feedback?, asked?: boolean)`; `asked = mode === "start" || editing || unanswered.length > 0` (the topic screens were shown).

- [ ] **Step 1: Write the failing tests** in `answersHistory.test.ts` and `plan.test.ts`:

```ts
test("dayOf: a bare date is kept, an ISO datetime becomes its local date", () => {
  assert.equal(dayOf("2026-11-01"), "2026-11-01");
  assert.equal(dayOf("2026-11-12T12:00:00.000Z"), "2026-11-12"); // noon UTC: the same date in every zone from -11 to +11
});
test("addDays crosses a month", () => assert.equal(addDays("2026-10-30", 3), "2026-11-02"));

test("cleanAnswersHistory keeps good entries and drops broken ones and bad rungs", () => {
  assert.deepEqual(cleanAnswersHistory("junk"), []);
  assert.deepEqual(cleanAnswersHistory([{ at: "2026-11-01", topics: { "guitar-caged": 2, nope: 1, "voice-pitch": 7 } }, { at: "", topics: {} }, { topics: {} }]),
    [{ at: "2026-11-01", topics: { "guitar-caged": 2 } }]);
});
test("cleanAnswersHistory keeps the first entry and the newest 99", () => {
  const many = Array.from({ length: 150 }, (_, i) => ({ at: `2026-01-01T00:00:00.${String(i).padStart(3, "0")}Z`, topics: {} }));
  const out = cleanAnswersHistory(many);
  assert.equal(out.length, 100);
  assert.equal(out[0].at, many[0].at);
  assert.equal(out[1].at, many[51].at);
  assert.equal(out[99].at, many[149].at);
});
test("sanitiseState moves stored answers over: one entry dated the earliest plan's startedOn", () => {
  const s = sanitiseState({ answers: { areas: ["guitar"], topics: { "guitar-caged": 1 }, minutes: 20, styles: "", notes: "" }, current: plan("2026-11-08"), history: [plan("2026-10-25"), plan("2026-11-01")] });
  assert.deepEqual(s.answersHistory, [{ at: "2026-10-25", topics: { "guitar-caged": 1 } }]);
});
test("sanitiseState makes no entry without answers or without a plan, and keeps a stored history as it is", () => {
  assert.deepEqual(sanitiseState({ answers: null, current: plan("2026-11-08") }).answersHistory, []);
  assert.deepEqual(sanitiseState({ answers: { areas: ["guitar"], topics: { "guitar-caged": 1 } } }).answersHistory, []);
  const kept = [{ at: "2026-11-02T10:00:00.000Z", topics: { "guitar-caged": 3 } }];
  assert.deepEqual(sanitiseState({ answers: { areas: ["guitar"], topics: { "guitar-caged": 1 } }, current: plan("2026-11-08"), answersHistory: kept }).answersHistory, kept);
});
test("recordAnswers appends the finished answers with their time", () => {
  const s = recordAnswers({ ...EMPTY_STATE, answersHistory: [{ at: "2026-11-01", topics: {} }] }, { ...DEFAULT_ANSWERS, topics: { "voice-pitch": 2 } }, "2026-11-15T18:00:00.000Z");
  assert.deepEqual(s.answersHistory.at(-1), { at: "2026-11-15T18:00:00.000Z", topics: { "voice-pitch": 2 } });
  assert.equal(s.answersHistory.length, 2);
});
```

(`plan(startedOn)` is a local helper making a minimal valid `StoredPlan` with one day and one exercise with `cells`.)

- [ ] **Step 2: Run, expect FAIL** — `npx tsx --test src/features/plan/model/answersHistory.test.ts src/features/plan/model/plan.test.ts` fails on missing exports.

- [ ] **Step 3: Implement** the types, `dayOf`/`addDays`, `answersHistory.ts`, and in `sanitiseState`: `answersHistory: Array.isArray(s.answersHistory) && s.answersHistory.length ? cleanAnswersHistory(s.answersHistory) : movedOver(answers, [current, ...history].filter(Boolean))` (answers, current and history being the already-cleaned values).

- [ ] **Step 4: Wire the finish.** PlanFlow passes `asked` to `onPlan` in `onFinish`. PlanApp's `onPlan` applies `recordAnswers(…, answers, new Date().toISOString())` before `start` when `asked` is true; a "next" week without the topic screens appends nothing. Update the PlanFlow doc comment.

- [ ] **Step 5: Run, expect PASS** — the two test files, then `npx tsx --test src/features/plan/model/*.test.ts src/features/plan/store/*.test.ts src/features/userData/*.test.ts src/features/userData/server/*.test.ts`; fix deep-equals that now miss `answersHistory: []`. Then tsc and eslint on the changed files.

- [ ] **Step 6: Commit** this task's paths via a temp GIT_INDEX_FILE (see memory shared-index-staging):
  `feat(plan): remember each finished questionnaire with its date (answersHistory)` + the Co-Authored-By line.

### Task 2: read every day-timer record (`PlanStore.loadAllTimes`)

**Files:**
- Modify: `src/features/plan/store/PlanStore.ts` (`loadAllTimes`)
- Modify: `src/features/plan/store/memoryPlanStore.ts`, `localPlanStore.ts`, `serverPlanStore.ts`
- Modify: `src/features/plan/store/usePlan.tsx` (`useAllPlanTimes`)
- Modify: `src/features/userData/client/UserDataProvider.tsx` (the waiting store gets `loadAllTimes: never`)
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts` (`listAllPlanTimes`)
- Modify: `src/features/userData/server/data.ts` (`readAllPlanTimes`)
- Modify: `src/app/api/me/plan/time/route.ts` (GET without `?plan`)
- Test: `src/features/userData/server/data.test.ts`, `src/features/plan/store/serverPlanStore.test.ts`, new `src/features/plan/store/memoryPlanStore.test.ts`
- Modify: `src/features/plan/README.md` (code map: PlanStore, usePlan), `src/features/userData/README.md` (the time route's GET)

**Interfaces:**
- Produces: `PlanStore.loadAllTimes(): Promise<DayTime[]>` — every plan's records (each passed through `parseDayTime`, so Part B's `blocks` come along).
- Produces: `UserDataRepo.listAllPlanTimes(userId: string): Promise<unknown[]>` — the user's `plan_day_times` rows, newest `updated_at` first, at most 1000; selects the same columns as `listPlanTimes` (including Part B's `blocks`).
- Produces: `readAllPlanTimes(repo: UserDataRepo, userId: string): Promise<DayTime[]>`.
- Produces: `GET /api/me/plan/time` with no `plan` → `{ days }` of every plan; `?plan=<id>` unchanged; a `plan` over 200 characters still 400.
- Produces: `ServerPlanOpts.getAllTimes?: () => Promise<unknown>` (default `getJson("/api/me/plan/time")`).
- Produces: `useAllPlanTimes(): { times: DayTime[]; loaded: boolean }` — loads once per store; a refused read stays not loaded.

- [ ] **Step 1: Write the failing tests**

```ts
// data.test.ts
test("readAllPlanTimes lists every plan's days for this player only", async () => {
  const repo = memoryUserDataRepo(); const now = new Date("2026-11-15T12:00:00Z");
  const t = { planId: "p", day: 0, elapsed: 120, spent: { e1: 120 } };
  await writePlanTime(repo, "u1", t, now);
  await writePlanTime(repo, "u1", { ...t, planId: "q", day: 3 }, now);
  await writePlanTime(repo, "u2", { ...t, planId: "r" }, now);
  const all = await readAllPlanTimes(repo, "u1");
  assert.deepEqual(all.map((d) => `${d.planId}:${d.day}`).sort(), ["p:0", "q:3"]);
});

// serverPlanStore.test.ts
test("loadAllTimes reads every plan's records and lays this session's saves over them", async () => {
  const day0 = { planId: "p", day: 0, elapsed: 60, spent: {} };
  const store = createServerPlanStore({ getAllTimes: async () => ({ days: [day0, { planId: "q", day: 1, elapsed: 5, spent: {} }, "junk"] }), timeClient: fakeClient, getTimes: async () => ({ days: [day0] }) });
  await store.saveTime({ ...day0, elapsed: 400 });
  assert.deepEqual((await store.loadAllTimes()).map((d) => [d.planId, d.day, d.elapsed]), [["p", 0, 400], ["q", 1, 5]]);
});

// memoryPlanStore.test.ts
test("memory loadAllTimes returns every plan's saved records", async () => {
  const s = memoryPlanStore();
  await s.saveTime({ planId: "a", day: 0, elapsed: 1, spent: {} });
  await s.saveTime({ planId: "b", day: 2, elapsed: 2, spent: {} });
  assert.deepEqual((await s.loadAllTimes()).map((d) => d.planId).sort(), ["a", "b"]);
});
```

(`fakeClient` is whatever fake sender `serverPlanStore.test.ts` already uses for `timeClient`.)

- [ ] **Step 2: Run, expect FAIL** — `npx tsx --test src/features/userData/server/data.test.ts src/features/plan/store/*.test.ts`.

- [ ] **Step 3: Implement.** Repo method in both repos; `readAllPlanTimes` parses each row like `readPlanTimes`; the route's GET calls it when `plan` is absent. Server store: `loadAllTimes` sends one read each call (not cached: it is read once per page by the hook) and lays every record saved this session over it with `withDayTime`; local store: `readLocalTimes()`; memory store: all held records; the waiting store: `never`. `useAllPlanTimes` follows `useProgress`'s load pattern.

- [ ] **Step 4: Run, expect PASS**; tsc; eslint on the changed files.

- [ ] **Step 5: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging):
  `feat(plan): PlanStore.loadAllTimes reads every plan's day-timer records` + the Co-Authored-By line.

### Task 3: the outcome — concepts, topics, areas, as of a date

**Files:**
- Modify: `src/features/plan/model/outcome.ts` (Part A's file; `startOutcome` and `TopicScore` stay as they are)
- Modify: `src/features/plan/model/outcome.test.ts`
- Modify: `src/features/plan/README.md` (code map line for `outcome.ts`; a short "Progress" paragraph: what the outcome counts, pointing at the spec)

**Interfaces:**
- Consumes: `AnswersEntry`, `dayOf`, `addDays` (Task 1); `CONCEPTS`, `conceptById`, `conceptsOf`, `AREAS` (`model/concepts.ts`); `topicById`, `topicsFor`, `Rung` (`intake/topics.ts`); `ProgressEntry` (`features/progress/log.ts`); `DayTime` (`model/planTime.ts`); `StoredPlan`, `Level` (`model/types.ts`).
- Produces (outcome.ts):

```ts
export const SOLID_STARS = 4;
export const STREAK_SECONDS = 300;
export const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"]; // index = 0..3
export interface OutcomeInput { plans: StoredPlan[]; entries: ProgressEntry[]; times: DayTime[]; answersHistory: AnswersEntry[] }
export type ConceptState = "solid" | "working" | "not-yet";
export interface ConceptOutcome { id: string; label: string; level: Level; state: ConceptState; ratings: number; lastOn: string | null; seconds: number }
export interface TopicOutcome extends TopicScore { area: Area; rung: Rung | null; reached: number | null; ratings: number; seconds: number; concepts: ConceptOutcome[] }
export interface AreaOutcome { area: Area; label: string; topics: TopicOutcome[]; ratings: number; seconds: number }
export interface Streak { days: number; through: string | null; practised: string[] }
export interface Outcome { asOf: string; areas: AreaOutcome[]; streak: Streak; seconds: { total: number; sorted: number } }
export function outcome(input: OutcomeInput, asOf: string): Outcome;
```

  All three areas in `AREAS` order, six topics each in `topicsFor` order, each topic's concepts in `conceptsOf` order. This task fills everything but `seconds` (all 0) and `streak` (`{ days: 0, through: null, practised: [] }`); Task 4 fills those.

Rules this task pins (the implementer writes the rest):
- An entry counts when `dayOf(entry.at) <= asOf`. Its concepts are those of `entry.concepts` that `conceptById` knows; its topic is `entry.topic` when `topicById` knows it, else the topic of its first known concept; its area is the topic's area, else `entry.area` when it is an `Area`. Topic and area `ratings` count the entry once; each known concept counts it once.
- A concept's state: the newest counted entry tagged with it (greatest `at`; a tie goes to the later one in the list) decides — `stars >= SOLID_STARS` → `solid`, else `working`; no entry → `not-yet`. `lastOn` = `dayOf` of that entry's `at`. (Rows are one per slot and a block's tags never change, so "the latest-rated block's latest rating" is this newest entry; an entry without `blockId` is its own block.)
- The rung: the last entry of `answersHistory` (array order) with `dayOf(at) <= asOf`; its `topics[topic]`, or `null`.
- The score, as code because the empty-level case is decided here:

```ts
const solidTop = max(LEVEL_ORDER.indexOf(c.level) for c of topic's concepts with state "solid"), or null when none;
const reached = rung === null && solidTop === null ? null : Math.max(rung ?? 0, solidTop ?? 0);
if (reached === null) score = null;
else if (reached >= 3) score = 3;
else {
  const up = topic's concepts with LEVEL_ORDER.indexOf(level) === reached + 1;
  score = reached + (up.length ? up.filter(solid).length / up.length : 0); // no concepts one level up: stays at reached
}
```

- [ ] **Step 1: Write the failing tests** (fixtures: `entry(over)` makes a valid `ProgressEntry` with `planId "p"`, a fresh `exerciseId`, `title "x"`, `stars 3`, `at "2026-11-10T12:00:00.000Z"`; `asked(at, topics)` makes an `AnswersEntry`; `topic(o, id)` finds a `TopicOutcome`; `concept(o, id)` a `ConceptOutcome`. `guitar-caged` has `top-string-triads` (beginner), `caged` and `arpeggios-position` (intermediate), `triads-every-set` (advanced)):

```ts
const caged = (o: Outcome) => topic(o, "guitar-caged");
const IN = { plans: [], times: [] };

test("outcome: every area, six topics each, each topic's concepts; nothing rated → not yet, score is the rung", () => {
  const o = outcome({ ...IN, entries: [], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.deepEqual(o.areas.map((a) => a.area), ["guitar", "voice", "theory"]);
  assert.ok(o.areas.every((a) => a.topics.length === 6));
  assert.deepEqual(caged(o).concepts.map((c) => c.id), ["top-string-triads", "caged", "arpeggios-position", "triads-every-set"]);
  assert.ok(caged(o).concepts.every((c) => c.state === "not-yet" && c.ratings === 0 && c.lastOn === null));
  assert.equal(caged(o).score, 1); assert.equal(caged(o).reached, 1);
  assert.equal(topic(o, "voice-pitch").score, null);
});
test("outcome: one of two concepts a level up solid adds half a level", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], topic: "guitar-caged", stars: 4 })], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "solid");
  assert.equal(caged(o).score, 1.5);
});
test("outcome: a solid concept above the rung lifts the level reached", () => {
  const e = [entry({ concepts: ["caged", "arpeggios-position"], stars: 5 })];
  assert.equal(caged(outcome({ ...IN, entries: e, answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15")).score, 2);
  const all = [...e, entry({ concepts: ["triads-every-set"], stars: 4 })];
  assert.equal(caged(outcome({ ...IN, entries: all, answersHistory: [] }, "2026-11-15")).score, 3);
});
test("outcome: no rung but a solid concept starts from that concept's level", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["top-string-triads"], stars: 4 })], answersHistory: [] }, "2026-11-15");
  assert.equal(caged(o).score, 1);
});
test("outcome: rated but not solid is working on, and without a rung the score stays null", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], stars: 3 })], answersHistory: [] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "working");
  assert.equal(caged(o).score, null);
});
test("outcome: solid then rated lower is working on again, and the score falls back to the rung, never below", () => {
  const o = outcome({ ...IN, entries: [
    entry({ concepts: ["caged"], stars: 5, at: "2026-11-05T12:00:00.000Z" }),
    entry({ concepts: ["caged"], stars: 2, at: "2026-11-12T12:00:00.000Z" }),
  ], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "working");
  assert.equal(concept(o, "caged").ratings, 2);
  assert.equal(concept(o, "caged").lastOn, "2026-11-12");
  assert.equal(caged(o).score, 1);
});
test("outcome: the block's level tag is not read; the concept's own level is", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], level: "advanced", stars: 5 })], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.equal(caged(o).score, 1.5);
});
test("outcome as of a date: later ratings and later answers are left out", () => {
  const input = { ...IN,
    entries: [entry({ concepts: ["caged"], stars: 5, at: "2026-11-12T12:00:00.000Z" })],
    answersHistory: [asked("2026-11-01", { "guitar-caged": 0 }), asked("2026-11-10T12:00:00.000Z", { "guitar-caged": 2 })] };
  assert.equal(caged(outcome(input, "2026-11-05")).score, 0);
  assert.equal(concept(outcome(input, "2026-11-11"), "caged").state, "not-yet");
  assert.equal(caged(outcome(input, "2026-11-11")).score, 2);
  assert.equal(concept(outcome(input, "2026-11-15"), "caged").state, "solid");
  assert.equal(caged(outcome(input, "2026-11-15")).score, 2); // rung 2 already covers caged; the one advanced concept isn't solid
});
test("outcome: an entry with no concepts counts toward ratings, not the score; unknown ids are ignored", () => {
  const o = outcome({ ...IN, entries: [
    entry({ topic: "guitar-caged", stars: 5 }),
    entry({ concepts: ["no-such-concept"], topic: "no-such-topic", area: "guitar", stars: 5 }),
    entry({ stars: 5 }),
  ], answersHistory: [] }, "2026-11-15");
  assert.equal(caged(o).ratings, 1);
  assert.equal(caged(o).score, null);
  assert.equal(o.areas[0].ratings, 2); // the caged entry and the one naming only its area
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx tsx --test src/features/plan/model/outcome.test.ts` (Part A's `startOutcome` tests still pass).

- [ ] **Step 3: Implement `outcome`** with the rules above; `seconds` 0 and the empty streak for now.

- [ ] **Step 4: Run, expect PASS**; tsc; eslint.

- [ ] **Step 5: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging):
  `feat(plan): the outcome per concept, topic and area from ratings and answers over time` + the Co-Authored-By line.

### Task 4: the outcome — time per category and the streak

**Files:**
- Modify: `src/features/plan/model/outcome.ts`, `src/features/plan/model/outcome.test.ts`
- Modify: `src/features/plan/README.md` (the Progress paragraph: time and streak rules)

**Interfaces:**
- Consumes: `DayTime` with Part B's `blocks`; `PlanExercise.blockId`, `ProgressEntry.blockId` (Part B); `addDays`, `dayOf` (Task 1).
- Produces: `Outcome.seconds`, every `seconds` field, `Outcome.streak` (types from Task 3).

Rules this task pins:
- A record's date is `addDays(plan.startedOn, record.day)` for the plan in `input.plans` with `id === record.planId`; no such plan → undated. A dated record counts when its date `<= asOf`; an undated one counts toward seconds in every run and never toward the streak.
- A slot's tags (each slot of `record.spent`): (1) the exercise with `id === slot` in that record's plan; else (2) the block id `record.blocks?.[slot]`, tagged by any plan exercise with that `blockId`, else any entry with that `blockId`; else (3) none. Topic and area from those tags by the same rules as an entry's (Task 3). The slot's seconds go to each known concept in full, to its topic once, to its area once.
- `seconds.total`: every counted slot's seconds; `seconds.sorted`: those that reached a topic or an area.
- Streak: the practised days are the dates of counted entries plus the dates of dated records with `elapsed >= STREAK_SECONDS`, all `<= asOf`. Start at `asOf` if practised, else at `addDays(asOf, -1)` if practised, else `days: 0, through: null`; count back while each day is practised. `practised` lists every practised day `<= asOf`, newest first, no repeats.

- [ ] **Step 1: Write the failing tests** (fixture `storedPlan(id, startedOn, exercises)` with one day holding the given exercises; `time(planId, day, elapsed, spent, blocks?)`):

```ts
test("time: a slot's seconds go to each of its concepts in full and once to its topic and area", () => {
  const p = storedPlan("p", "2026-11-10", [{ id: "s1", topic: "guitar-caged", concepts: ["caged", "arpeggios-position"] }]);
  const o = outcome({ plans: [p], entries: [], answersHistory: [], times: [time("p", 0, 600, { s1: 600 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").seconds, 600);
  assert.equal(concept(o, "arpeggios-position").seconds, 600);
  assert.equal(topic(o, "guitar-caged").seconds, 600);
  assert.equal(o.areas[0].seconds, 600);
  assert.deepEqual(o.seconds, { total: 600, sorted: 600 });
});
test("time: a slot whose plan is gone is found through its block id; with neither it counts only in the total", () => {
  const e = entry({ blockId: "b1", topic: "voice-pitch", concepts: ["matching-a-pitch"] });
  const o = outcome({ plans: [], entries: [e], answersHistory: [], times: [time("gone", 0, 900, { s9: 300, s10: 200 }, { s9: "b1" })] }, "2026-11-15");
  assert.equal(topic(o, "voice-pitch").seconds, 300);
  assert.deepEqual(o.seconds, { total: 500, sorted: 300 });
});
test("time as of a date: a day after asOf is left out", () => {
  const p = storedPlan("p", "2026-11-10", [{ id: "s1", topic: "guitar-caged" }]);
  const o = outcome({ plans: [p], entries: [], answersHistory: [], times: [time("p", 5, 600, { s1: 600 })] }, "2026-11-14");
  assert.equal(o.seconds.total, 0);
});
test("streak: consecutive days ending today", () => {
  const e = ["2026-11-13", "2026-11-14", "2026-11-15"].map((d) => entry({ at: `${d}T12:00:00.000Z` }));
  const o = outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-15");
  assert.deepEqual(o.streak, { days: 3, through: "2026-11-15", practised: ["2026-11-15", "2026-11-14", "2026-11-13"] });
  assert.equal(outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-16").streak.days, 3);
  assert.deepEqual(outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-17").streak.days, 0);
});
test("streak: a gap breaks it; a later rating than asOf doesn't count", () => {
  const e = ["2026-11-12", "2026-11-14", "2026-11-15", "2026-11-16"].map((d) => entry({ at: `${d}T12:00:00.000Z` }));
  assert.equal(outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-15").streak.days, 2);
});
test("streak: a timer day counts from 300 seconds; a record whose plan is gone never does", () => {
  const p = storedPlan("p", "2026-11-10", []);
  const run = (elapsed: number, planId = "p") => outcome({ plans: [p], entries: [], answersHistory: [], times: [time(planId, 2, elapsed, {})] }, "2026-11-12").streak.days;
  assert.equal(run(300), 1);
  assert.equal(run(299), 0);
  assert.equal(run(3000, "gone"), 0);
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx tsx --test src/features/plan/model/outcome.test.ts`.
- [ ] **Step 3: Implement** time and streak in `outcome` with the rules above.
- [ ] **Step 4: Run, expect PASS**; tsc; eslint.
- [ ] **Step 5: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging):
  `feat(plan): time per concept and topic, and the day streak, in the outcome` + the Co-Authored-By line.

### Task 5: `/dev/progress`

**Files:**
- Create: `src/features/devtools/progress/ProgressPage.tsx` (client component)
- Create: `src/app/dev/(live)/progress/page.tsx` (`<DevShell><ProgressPage /></DevShell>`, like `(live)/data/page.tsx`)
- Modify: `src/features/devtools/registry.ts` (one `DEV_TOOLS` entry, `live: true`)
- Modify: `src/features/devtools/gate.test.ts` (the live list)
- Modify: `src/features/devtools/README.md` ("apart from four" → five, naming Progress; a short section on the page)

**Interfaces:**
- Consumes: `outcome`, `OutcomeInput`, `Outcome` (Tasks 3–4); `usePlan` and `useAllPlanTimes` (`plan/store/usePlan.tsx`, Task 2); `useProgress` (`features/progress/useProgress.tsx`); `localDate` (`model/schedule.ts`).
- Registry entry: `{ href: "/dev/progress", label: "Progress", tone: "data", live: true, desc: "The signed-in player's progress outcome: its inputs, then per concept, topic and area, the streak days and time, as of any date." }`

- [ ] **Step 1: Update the failing test** — in `gate.test.ts` the live list becomes `["/dev/compare-models", "/dev/examples", "/dev/stories", "/dev/data", "/dev/progress"]`; run `npx tsx --test src/features/devtools/gate.test.ts`, expect FAIL.
- [ ] **Step 2: Build the page.** Inputs: plans = `[state.current, ...state.history]` without nulls, `entries` from `useProgress`, `times` from `useAllPlanTimes`, `state.answersHistory`; "Loading…" until all three are loaded. A date field for `asOf`, today by default. Bare tables (the `TH`/`TD` look of `DataPage.tsx`), no charts:
  - Inputs: answers history (`at`, each answered topic and rung); plans (id, title, startedOn); entries (`at`, title, blockId or "—", topic, concepts, stars); day records (planId, day, date or "no date", elapsed, spent by slot, block by slot).
  - Per area: label, ratings, seconds, the six topic scores.
  - Per topic: area, label, rung, reached, score (two decimals), ratings, seconds.
  - Per concept: topic, label, level, state, ratings, last date, seconds.
  - Streak: days, through, the practised days; seconds total and sorted.
- [ ] **Step 3: Run, expect PASS** — the gate test; tsc; eslint on the new and changed files.
- [ ] **Step 4: Check on the dev server** — open `/dev/progress` signed in (memory notes local-login-db and worktree-dev-and-screenshots; keep the real browser profile's data, memory note browser-test-keep-user-data): rate an exercise on `/plan`, reload, the entry and its concept appear; set the date before it and it drops out.
- [ ] **Step 5: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging):
  `feat(devtools): /dev/progress, the progress outcome's inputs and outputs as tables` + the Co-Authored-By line.

### Task 6: tracker view model

**Files:**
- Create: `src/features/plan/model/trackerView.ts`
- Create: `src/features/plan/model/trackerView.test.ts`

**Interfaces:**
- Consumes: `Outcome`, `AreaOutcome`, `TopicOutcome`, `LEVEL_ORDER` (Task 3); `DayTime`, `withDayTime` (`model/planTime.ts`); `LEVELS` (`model/questions.ts`); `PlanAnswers`.
- Produces:
  - `mergeTimes(all: DayTime[], current: DayTime[]): DayTime[]` — `all` with each of the running plan's live records laid over it (`withDayTime`).
  - `shownAreas(o: Outcome, answers: PlanAnswers | null): AreaOutcome[]` — the areas in `answers.areas` plus any area with ratings or seconds, in `AREAS` order.
  - `topicLevel(t: TopicOutcome): { level: Level; next: Level | null } | null` — `null` when `reached` is null; `level = LEVEL_ORDER[reached]`; `next = LEVEL_ORDER[reached + 1]` when `score > reached`, else `null`. The view names levels with `LEVELS` labels; it never prints `score`.
  - `minutesOf(seconds: number): number` — whole minutes, rounded down.

- [ ] **Step 1: Write the failing tests**

```ts
test("mergeTimes: today's live record replaces the one read", () => {
  const read = [{ planId: "p", day: 0, elapsed: 100, spent: {} }, { planId: "q", day: 1, elapsed: 50, spent: {} }];
  const live = [{ planId: "p", day: 0, elapsed: 400, spent: {} }];
  assert.deepEqual(mergeTimes(read, live).map((d) => [d.planId, d.elapsed]).sort(), [["p", 400], ["q", 50]]);
});
test("shownAreas: the chosen areas plus any practised one, in screen order", () => {
  const o = outcome({ plans: [], times: [], answersHistory: [], entries: [entry({ concepts: ["matching-a-pitch"], stars: 3 })] }, "2026-11-15");
  assert.deepEqual(shownAreas(o, { ...DEFAULT_ANSWERS, areas: ["theory"] }).map((a) => a.area), ["voice", "theory"]);
  assert.deepEqual(shownAreas(o, null).map((a) => a.area), ["voice"]);
});
test("topicLevel: the level reached by id, and the next one only once something there is solid", () => {
  assert.deepEqual(topicLevel({ reached: 1, score: 1.5 } as TopicOutcome), { level: "beginner", next: "intermediate" });
  assert.deepEqual(topicLevel({ reached: 1, score: 1 } as TopicOutcome), { level: "beginner", next: null });
  assert.deepEqual(topicLevel({ reached: 3, score: 3 } as TopicOutcome), { level: "advanced", next: null });
  assert.equal(topicLevel({ reached: null, score: null } as TopicOutcome), null);
});
test("minutesOf rounds down", () => assert.equal(minutesOf(359), 5));
```

- [ ] **Step 2: Run, expect FAIL** — `npx tsx --test src/features/plan/model/trackerView.test.ts`.
- [ ] **Step 3: Implement** the four functions.
- [ ] **Step 4: Run, expect PASS**; tsc; eslint.
- [ ] **Step 5: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging):
  `feat(plan): tracker view helpers (areas shown, level by name, live timer days)` + the Co-Authored-By line.

### Task 7: the player's tracker on /plan

**Files:**
- Create: `src/features/plan/ui/tracker/StreakButton.tsx`
- Create: `src/features/plan/ui/tracker/ProgressTracker.tsx` (the modal body)
- Modify: `src/features/plan/PlanApp.tsx` (gather the inputs, compute the outcome, place the button)
- Modify: `src/features/plan/README.md` ("The player's path": the streak and tracker; code map: `ui/tracker/`, `trackerView.ts`)

**Interfaces:**
- Consumes: `outcome` (Tasks 3–4); `useAllPlanTimes` (Task 2); `mergeTimes`, `shownAreas`, `topicLevel`, `minutesOf` (Task 6); `LEVELS`, `labelOf` (`model/questions.ts`); `Modal`, `InfoTip`, `Button` from `@/components/ui` only.
- Produces: `StreakButton({ streak, onOpen }: { streak: Streak; onOpen: () => void })`; `ProgressTracker({ outcome, answers }: { outcome: Outcome; answers: PlanAnswers | null })`.

- [ ] **Step 1: Load the skills before writing a word:** `teaching-voice` (its "Words about the app") and `design:ux-copy` (if missing, say so in the report and write from "Words about the app" alone). Words needed: the streak's line (0 days, 1 day, n days; said plainly, no exclamation, no flame-and-cheer), the button's name and title, the modal's title and one-line intro, a topic with no answer and nothing rated, "Solid" / "Working on" / "Not yet", the level line (a level by its `LEVELS` label; when `topicLevel(...).next` is set, a plain words-only way to say the student has started on the next level), the concept details ("rated 4 times, last on 12 Nov", minutes practised; nothing for "Not yet"), and the empty tracker (no areas shown). Dates as "12 Nov".
- [ ] **Step 2: Wire PlanApp.** `const all = useAllPlanTimes()`; `times = mergeTimes(all.times, times)` with the current plan's `usePlanTimes` records; `const o = useMemo(() => outcome({ plans, entries: progress.entries, times, answersHistory: state.answersHistory }, today), …)`. The streak button sits in the plan header's top line beside "Day N of 7 · started …" (and on the no-plan screen when the history has plans); it renders only once `all.loaded` and `progress.loaded`, so a streak never flashes 0 first. A refused all-times read leaves the button out; it never blocks the page.
- [ ] **Step 3: Build the tracker.** A `Modal`: each shown area (`shownAreas`) as a heading; under it its six topics, each with its level line (`topicLevel` + `LEVELS` label) and its concepts, each with its state word and an `InfoTip` (`hover`) holding the details. No number from `score`, no percentage, no bar that reads as a score. Keyboard and touch: the `InfoTip` opens on tap; the modal closes with its Close button and Escape.
- [ ] **Step 4: Run** `npx tsx --test src/features/plan/model/*.test.ts`, tsc, eslint on the new and changed files; `grep -nE "score|%" src/features/plan/ui/tracker/*.tsx` shows no rendered score or percent.
- [ ] **Step 5: Check on the dev server** (memory notes local-login-db, browser-test-keep-user-data; DemoPlan renders `PlanApp` too, so also open `/demo/guitar-beginner` and see the streak at 0 days with nothing broken): on `/plan`, rate an exercise → the streak counts today; open the tracker → the rated concept shows "Working on" or "Solid" with its details on hover and on tap; a phone-width window (memory note worktree-dev-and-screenshots for true mobile width) shows no horizontal scroll. Read every line on the screen against the skills.
- [ ] **Step 6: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging):
  `feat(plan): a day streak on /plan that opens to progress by area, topic and concept` + the Co-Authored-By line. The report lists every new string (old → new is "— → new" for new ones) and what was and wasn't checked in the browser.

### Task 8 (optional, after Task 7 reads well): start-vs-now radar per area

Only if the list in Task 7 is on main and the user wants it; skip otherwise (the spec accepts the list alone).

**Files:**
- Create: `src/features/plan/ui/tracker/AreaRadar.tsx` (inline SVG, theme tokens)
- Modify: `src/features/plan/ui/tracker/ProgressTracker.tsx`, `src/features/plan/model/trackerView.ts` (+ test)

**Interfaces:**
- Produces: `startDay(input: OutcomeInput): string | null` in `trackerView.ts` — `dayOf` of the first `answersHistory` entry, else the earliest plan's `startedOn`, else null. The radar draws `outcome(input, startDay)` against `outcome(input, today)`: six axes (the area's topics by label), four rings labelled by `LEVELS` label, `null` scores at the centre; no numbers on it.

- [ ] **Step 1:** Load the `dataviz` skill and the copy skills (legend words: start and now).
- [ ] **Step 2: Test** `startDay`: `{ answersHistory: [asked("2026-11-01", {})], plans: [storedPlan("p", "2026-10-20", [])] }` → `"2026-11-01"`; no history → `"2026-10-20"`; nothing → `null`. Run, FAIL; implement; run, PASS.
- [ ] **Step 3:** Draw it; check on the dev server in light and dark styles and at phone width; drop it if it doesn't read well.
- [ ] **Step 4: Commit** via a temp GIT_INDEX_FILE (memory shared-index-staging): `feat(plan): start-vs-now radar per area in the tracker` + the Co-Authored-By line.

---

## Self-review

- **Spec coverage:** answersHistory appended on Start and Change my answers (Task 1, `asked`); lazy move-over (Task 1); difficulty from concepts (Task 3, test "block's level tag is not read"); solid = latest 4–5 (Task 3); concept states with level, count, last date, time (Tasks 3–4); topic score with rung floor and fraction (Task 3); area = six topic scores (Task 3); as of any date (Tasks 3–4); time per category (Task 4); streak (Task 4); `/dev/progress` live, own data, bare tables (Task 5); tracker with streak on `/plan`, areas → topics by level name → concepts with hover/tap details (Tasks 6–7); radar optional (Task 8). "In the header if it fits" is left out: `/plan` only.
- **Decisions this plan makes that the spec doesn't:** a topic with no concepts one level up stays at the level reached; no rung and nothing solid is `null` (shown in words, not as 0); timer records are dated `startedOn + day` and an undated one counts toward time but never the streak; a slot's tags come first from its plan's exercise, then from its block id; `answersHistory` keeps the first entry and the newest 99.
- **Type consistency:** `AnswersEntry`, `OutcomeInput`, `Outcome`, `TopicOutcome extends TopicScore`, `Streak`, `loadAllTimes`, `useAllPlanTimes`, `listAllPlanTimes`, `readAllPlanTimes`, `mergeTimes`, `shownAreas`, `topicLevel`, `minutesOf`, `startDay` are each defined once and used with the same names after.
