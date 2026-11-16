# The learning path as a slope: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the learning path the prerequisites the user named, a double-stops track, a step order computed from the
links, and one rule that marks every step known / within reach / ahead, drawn on /dev/path and /dev/questionnaire.

**Architecture:** All logic is pure TypeScript in `src/features/plan/model/` (`path.ts` for links and the order, a new
`reach.ts` for the marks), tested with node:test. The dev pages read those functions; nothing in the player's app reads
them yet (NEW7 will).

**Tech Stack:** TypeScript, Next.js dev pages, node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-11-16-path-slope-design.md`

## Global Constraints

- The four levels stay: `"new" | "beginner" | "intermediate" | "advanced"`. No fifth `Level`.
- No gate anywhere: "ahead" ranks a step later; nothing blocks a player.
- A step ref is `"trackId:n"`, n counted from 1 (as `after` and `stepAt` already use it).
- `after` keeps pointing at a step in another track at a level no higher than its own (existing test).
- Adding the double-stops track raises `PROMPT_VERSION` to 3 in `src/features/plan/model/prompt.ts`, with a
  `src/features/plan/model/CHANGELOG.md` entry (version, 2026-11-16, what changed).
- Step names and `holds` are written with the `teaching-voice` skill loaded first; music facts via `npm run -s theory -- …`.
- Cap on within-reach steps per topic, by that topic's questionnaire line: new 1, beginner 2, intermediate and advanced
  no cap. An unanswered topic counts as new.
- Commits: never `git add` in the main checkout (shared index). Commit with a temp index:
  `GIT_INDEX_FILE=<scratchpad>/idx git read-tree HEAD && GIT_INDEX_FILE=… git add <files> && GIT_INDEX_FILE=… git commit`,
  then `git reset -q -- <files>` so the shared index matches HEAD for those paths only. Commit on main.
- Tests: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (plain `npx tsx` hangs here).
  Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Lint the changed files with `npx eslint <files>`.
- Keep `src/features/plan/README.md`, `src/features/plan/CLAUDE.md`, `src/features/plan/intake/README.md` and
  `src/features/devtools/README.md` true in the same commit as each change.
- Browser checks: Chrome on localhost is the user's real profile. Back up and restore any localStorage key you touch.

## Review Focus

1. A starting step whose cross-track prerequisite sits in a topic the player didn't answer: it must still be within
   reach, and the prerequisite known (Task 5, test "a start carries known back across topics").
2. Two or more starting steps in one topic, more than its cap: all of them stay within reach (Task 5, test "starts are
   never capped").
3. A track placed "done": every step known, and the steps that come after it in other tracks can open (Task 5, test
   "a done track opens what follows it").
4. The new track id must not break the library seed check or the example tag checks (Task 1, step "run seed check").
5. The 67 old concept ids still map to a track, and none maps to `double-stops` (Task 1, existing test
   "every old concept is merged into exactly one track" stays green with `OLD = 67`).

---

### Task 1: The named links and the double-stops track

**Files:**
- Modify: `src/features/plan/model/path.ts` (PATH: new track before `triads`; `after` on the steps below; export `predecessorsOf`)
- Modify: `src/features/plan/model/path.test.ts`
- Modify: `src/features/plan/model/prompt.ts` (`PROMPT_VERSION = 3`), `src/features/plan/model/CHANGELOG.md`
- Modify: `src/features/plan/README.md` (track count 45, the new track), `tasks.txt` (NEW13 note)

**Interfaces:**
- Produces: `predecessorsOf(ref: string, tracks?: Track[]): string[]`: the step before it in its own track (if any)
  plus its `after` refs. Used by Tasks 2 and 5.
- Produces: track id `double-stops`, area guitar, topic `guitar-caged`, `merges: []`.

- [ ] **Step 1: Write the failing tests** in `path.test.ts`:

```ts
test("the prerequisites the user named are in the path", () => {
  const after = (ref: string) => stepAt(ref)!.step.after ?? [];
  assert.ok(after("modes:1").includes("scales:1"));
  assert.ok(after("modes:1").includes("scales:3"));
  assert.ok(after("singing-modes:1").includes("scales:1"));
  for (const ref of ["major-on-neck:1", "arpeggios:1", "caged:1"]) assert.ok(after(ref).includes("pentatonic-positions:1"), ref);
  assert.ok(after("triads:1").includes("double-stops:2"));
  assert.ok(after("barre:1").includes("triads:1"));
});

test("double stops: a new guitar track in the CAGED topic, before triads", () => {
  const i = PATH.findIndex((t) => t.id === "double-stops");
  assert.ok(i >= 0 && i < PATH.findIndex((t) => t.id === "triads"));
  const t = PATH[i];
  assert.deepEqual([t.area, t.topic, t.merges, t.steps.map((s) => s.level)], ["guitar", "guitar-caged", [], ["new", "beginner", "beginner", "intermediate"]]);
});

test("predecessorsOf: the step before plus `after`", () => {
  assert.deepEqual(predecessorsOf("triads:1"), ["double-stops:2"]);
  assert.deepEqual(predecessorsOf("triads:2"), ["triads:1"]);
  assert.deepEqual(predecessorsOf("double-stops:1"), []);
});

test("no step is its own prerequisite, however far back", () => {
  const seen = new Map<string, "open" | "done">();
  const visit = (ref: string, trail: string[]) => {
    if (seen.get(ref) === "done") return;
    assert.notEqual(seen.get(ref), "open", `cycle: ${[...trail, ref].join(" → ")}`);
    seen.set(ref, "open");
    for (const p of predecessorsOf(ref)) visit(p, [...trail, ref]);
    seen.set(ref, "done");
  };
  for (const t of PATH) t.steps.forEach((_, i) => visit(`${t.id}:${i + 1}`, []));
});
```

Also change the `spanOf(triads)` assertion in "span and counts" only if Task 1 moves a triads level (it shouldn't).

- [ ] **Step 2: Run, expect FAIL** (`predecessorsOf` not exported; links missing).
- [ ] **Step 3: Load `teaching-voice`, check the facts, then edit `path.ts`.** Before writing names, read
  `/theory/double-stops` (`src/app/theory/double-stops/page.tsx`) and s1 "5ths & double stops"
  (`src/features/course/stages/s1.ts`), and check intervals with `npm run -s theory -- help`. Draft steps (adjust
  the wording, not the levels):
  1. `s(N, "5ths on two strings", "root and 5th, the smallest power chord")`
  2. `s(B, "3rds on strings 3 and 2", "in one key")`
  3. `s(B, "6ths on strings 3 and 1", "in one key, skipping string 2")`
  4. `s(I, "Up the neck in one key", "3rds and 6ths")`

  Insert `g("caged", "double-stops", "Double stops", [], […])` right before the `triads` track. Add `after` refs:
  `triads:1` ← `double-stops:2`; `barre:1` ← `triads:1`; `major-on-neck:1`, `arpeggios:1` (keep `caged:1`),
  `caged:1` (keep `barre:3`) ← `pentatonic-positions:1`; `modes:1` ← `scales:1` (keep `scales:3`);
  `singing-modes:1` ← `scales:1` (keep `modes:1`). Add `predecessorsOf` beside `stepAt`, and update the header
  comment to say a step's predecessors are the step before it plus `after`.
- [ ] **Step 4: Raise `PROMPT_VERSION` to 3** with a CHANGELOG entry: "2026-11-16: a new track, double-stops
  (guitar, CAGED topic); the prompt's track list grows to 45."
- [ ] **Step 5: Run tests, expect PASS:** `tsx --test src/features/plan/model/*.test.ts src/features/plan/intake/*.test.ts src/features/plan/examples/*.test.ts src/features/devtools/*/*.test.ts`.
  Fix any count the new track moves (e.g. a placement test listing guitar-caged tracks) by updating the expectation,
  not the path.
- [ ] **Step 6: Run seed check:** `npm run seed -- check` over the files in `src/features/library/seed/`. Expected:
  every file passes, as before.
- [ ] **Step 7: Types and lint**, then docs (plan README track count and the new track; tasks.txt NEW13: "[date] named
  prerequisites and the double-stops track added").
- [ ] **Step 8: Commit** `feat(path): the prerequisites the player needs first, and a double-stops track before triads`.

### Task 2: The computed order

**Files:**
- Modify: `src/features/plan/model/path.ts`, `src/features/plan/model/path.test.ts`

**Interfaces:**
- Consumes: `predecessorsOf` (Task 1).
- Produces:
  - `depthOf(ref: string, tracks?: Track[]): number`: 0 with no predecessors, else 1 + the largest predecessor depth.
  - `interface SlopeStep { ref: string; track: Track; index: number; level: Level; depth: number }`
  - `slope(tracks?: Track[]): SlopeStep[]`: every step, sorted by `levelIndex(level)`, then `depth`, then the
    track's index in `tracks`, then `index`.
  - `slopeIndex(tracks?: Track[]): Map<string, number>`: ref → position in `slope()`. Tasks 3 and 5 use it.

Memoise depth per call of `slope` (a plain Map); the path is small.

- [ ] **Step 1: Write the failing tests:**

```ts
test("depth: steps with nothing before them are 0; each step is deeper than what it needs", () => {
  assert.equal(depthOf("double-stops:1"), 0);
  for (const t of PATH) t.steps.forEach((_, i) => {
    const ref = `${t.id}:${i + 1}`;
    for (const p of predecessorsOf(ref)) assert.ok(depthOf(p) < depthOf(ref), `${p} → ${ref}`);
  });
});

test("slope: every step comes after everything it needs", () => {
  const at = slopeIndex();
  assert.equal(at.size, PATH.reduce((n, t) => n + t.steps.length, 0));
  for (const [ref, i] of at) for (const p of predecessorsOf(ref)) assert.ok(at.get(p)! < i, `${p} → ${ref}`);
});

test("slope: the cases the user named", () => {
  const at = slopeIndex();
  assert.ok(at.get("triads:1")! < at.get("barre:1")!);
  assert.ok(at.get("double-stops:2")! < at.get("triads:1")!);
  assert.ok(depthOf("modes:4") > depthOf("scales:3") && depthOf("modes:4") > depthOf("pentatonic-positions:1"));
  assert.ok(at.get("pentatonic-positions:1")! < at.get("major-on-neck:1")!);
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the three functions and the type in `path.ts`.
- [ ] **Step 4: Run, expect PASS** (same test command as Task 1), types, lint.
- [ ] **Step 5: Commit** `feat(path): a step's place on the path, computed from what it needs`.

### Task 3: /dev/path draws the slope (checkpoint with the user)

**Files:**
- Modify: `src/features/devtools/path/JourneyView.tsx` (the "Path" view)
- Modify: `src/features/devtools/model/path.ts` only if `PathNode` needs the refs or depths passed through
- Modify: `src/features/devtools/README.md`

**Interfaces:**
- Consumes: `slopeIndex()`, `depthOf()` (Task 2).

- [ ] **Step 1: Order and show.** Inside each area, rows are sorted by the `slopeIndex` of their first step (stable
  for ties). Each step in a block shows its depth as a small muted number before its name; the block's aria-label
  says "depth n" per step. Hover marks (before / after) stay as they are and now include the new links.
- [ ] **Step 2: Check on screen.** Start the dev server if it isn't running (memory: first `next dev` may exit on an
  upgrade notice; retry), open `/dev/path`, Guitar and Theory. Screenshot. Check: double stops sit above triads,
  triads above barre, pentatonic above major scale and modes, the hover on Lydian lights pentatonic.
- [ ] **Step 3: Types, lint, devtools tests** (`tsx --test src/features/devtools/*/*.test.ts`).
- [ ] **Step 4: Commit** `feat(devtools): /dev/path lays steps out in path order`.
- [ ] **Step 5: Stop and show the user** the screenshot and the list of named links. Go on to Task 4 only after they
  judge the links.

### Task 4: More links, drafted by Fable agents

**Files:**
- Modify: `src/features/plan/model/path.ts` (the kept links only), `path.test.ts` if a kept link needs pinning
- Scratch: `<scratchpad>/refs/` (scrapes), `<scratchpad>/links/<area>.json` (proposals)

- [ ] **Step 1: Scrape the reference orders** with the local firecrawl (`POST http://localhost:4001/v1/scrape`,
  body `{"url": …, "formats": ["markdown"], "onlyMainContent": true}`) into `<scratchpad>/refs/`:
  `https://www.musictheory.net/lessons` and Open Music Theory's contents
  (`https://viva.pressbooks.pub/openmusictheory/table-of-contents/`; if that page doesn't list the chapters, use the
  "Read Book" first page's navigation). Check each file lists lessons/chapters in order.
- [ ] **Step 2: Dispatch three agents in one message** (`model: "fable"`, general-purpose), one per area: guitar,
  voice, theory & ear. Each prompt: read `src/features/plan/model/path.ts`, the spec, and the two reference files;
  propose links for its area only (cross-area targets allowed) as JSON `[{ "from": "trackId:n", "to": "trackId:n",
  "reason": "one sentence a teacher would agree with" }]`, where `from` is learned first; obey the level rule (from's
  level ≤ to's level) and the ref format; don't repeat a link `predecessorsOf` already gives; write the file to
  `<scratchpad>/links/<area>.json`; don't edit the repo.
- [ ] **Step 3: Review every proposal.** Keep a link only when the reason holds for a guitar or voice teacher and it
  doesn't duplicate an existing chain. Add the kept ones as `after` refs.
- [ ] **Step 4: Run the Task 1 and 2 tests** (cycles, level rule, order) and types. Expected: PASS.
- [ ] **Step 5: Check /dev/path again**, screenshot.
- [ ] **Step 6: Commit** `feat(path): more prerequisites, drafted by agents and checked`, with the body listing each
  link kept and each dropped, one line each with its reason.

### Task 5: Known / within reach / ahead

**Files:**
- Create: `src/features/plan/model/reach.ts`, `src/features/plan/model/reach.test.ts`
- Modify: `src/features/plan/README.md`

**Interfaces:**
- Consumes: `predecessorsOf`, `slopeIndex` (Tasks 1–2); `placement`, `TrackPlacement` from
  `src/features/plan/intake/placement.ts`; `Rung` from `intake/topics.ts`.
- Produces:

```ts
export type ReachMark = "known" | "reach" | "ahead";
export interface StepReach { ref: string; mark: ReachMark; /** ahead only because the topic's cap is full */ open: boolean; /** a starting step from placement */ start: boolean }
export const REACH_CAP: Record<Level, number>; // { new: 1, beginner: 2, intermediate: Infinity, advanced: Infinity }
export function reach(input: { topics: Record<string, Rung>; solid?: Iterable<string> }, tracks?: Track[]): Map<string, StepReach>;
```

Rules, in order:
1. Starts and known from placement (`placement(input.topics)`): state "on" with step s → steps 1..s (refs `id:1`…`id:s`,
   i.e. indexes below s) known, `id:(s+1)` a start; "done" → every step known; "ahead" → nothing known, no start.
2. `solid` refs are known.
3. Known carries back: every predecessor (transitively) of a known step or a start is known.
4. A step not known whose predecessors are all known is a candidate.
5. Per topic, the cap is `REACH_CAP[LEVELS[rung ?? 0]]`. Starts are always "reach" and count toward the cap. Other
   candidates fill what's left in `slopeIndex` order; the rest are "ahead" with `open: true`.
6. Everything else is "ahead", `open: false`.

- [ ] **Step 1: Write the failing tests** in `reach.test.ts`:

```ts
const m = (r: Map<string, StepReach>, ref: string) => r.get(ref)!;

test("a new player: one step per topic, the lowest on the path", () => {
  const r = reach({ topics: {} });
  assert.equal(m(r, "open-chords:1").mark, "reach");
  assert.deepEqual([m(r, "strumming:1").mark, m(r, "strumming:1").open], ["ahead", true]);
  assert.deepEqual([m(r, "power-chords:1").mark, m(r, "power-chords:1").open], ["ahead", true]);
  assert.equal(m(r, "double-stops:1").mark, "reach");
  assert.deepEqual([m(r, "triads:1").mark, m(r, "triads:1").open], ["ahead", false]);
});

test("starts are never capped", () => {
  const r = reach({ topics: { "guitar-basic-chords": 1 } });
  for (const ref of ["open-chords:4", "strumming:3", "power-chords:1"]) assert.deepEqual([m(r, ref).mark, m(r, ref).start], ["reach", true], ref);
  assert.equal(m(r, "open-chords:3").mark, "known");
});

test("a start carries known back across topics", () => {
  const r = reach({ topics: { "theory-modes": 2 } });
  assert.equal(m(r, "modes:1").mark, "reach");
  for (const ref of ["scales:1", "scales:2", "scales:3"]) assert.equal(m(r, ref).mark, "known", ref);
});

test("solid carries known back inside a track", () => {
  const r = reach({ topics: {}, solid: ["triads:5"] });
  assert.equal(m(r, "triads:3").mark, "known");
  assert.equal(m(r, "double-stops:2").mark, "known");
});

test("a done track opens what follows it", () => {
  const r = reach({ topics: { "guitar-caged": 3 } });
  // the double-stops track sits wholly under advanced, so it's done; triads' first step needs only that
  assert.ok(PATH.find((t) => t.id === "double-stops")!.steps.every((_, i) => m(r, `double-stops:${i + 1}`).mark === "known"));
});

test("intermediate and up: no cap", () => {
  const r = reach({ topics: { "guitar-techniques": 2 } });
  const open = [...r.values()].filter((x) => x.open);
  assert.ok(open.every((x) => stepAt(x.ref)!.track.topic !== "guitar-techniques"));
});
```

  Check each expectation against `placement()` before trusting it (e.g. which index "on" picks for rung 1 in
  basic-chords); fix the test's refs if placement says otherwise, never the rule.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `reach.ts`.**
- [ ] **Step 4: Run plan model and intake tests, expect PASS;** types; lint.
- [ ] **Step 5: Docs:** plan README lists `reach.ts`; tasks.txt NEW16 and NEW9 (what the rule changes for "I play one
  pentatonic position": nothing in placement; the next pentatonic step opens once Position 1 is rated solid).
- [ ] **Step 6: Commit** `feat(plan): what a player knows, can reach next, and what is ahead (NEW16)`.

### Task 6: The marks on /dev/questionnaire and /dev/path

**Files:**
- Modify: `src/features/devtools/questionnaire/QuestionnaireLab.tsx` (the "Concepts" section)
- Modify: `src/features/devtools/model/stepProgress.ts` (`ExampleStudent.answers`), `src/features/devtools/path/JourneyView.tsx`
- Modify: `src/features/devtools/README.md`, `src/features/plan/intake/README.md`

**Interfaces:**
- Consumes: `reach()`, `StepReach` (Task 5); `StepProgress.state === "solid"` for solid refs.
- Produces: `ExampleStudent.answers: Record<string, Rung>`; `solidRefs(progress: Record<string, ConceptProgress>): string[]`
  in `stepProgress.ts` (refs `id:(i+1)` of steps whose state is "solid").

- [ ] **Step 1: Test `solidRefs`** in the devtools model tests: a progress with step 0 solid and step 1 working gives
  `["<id>:1"]`. Run, expect FAIL; implement; PASS.
- [ ] **Step 2: /dev/questionnaire "Concepts".** For each track of the area, list its steps with their mark from
  `reach({ topics: draft.topics })`: known, within reach, ahead (and "open" for capped ones). Keep the section title.
  "Starting steps" may fold into it (builder's call); if it folds, starts show as within reach with a "start" tag.
- [ ] **Step 3: Example students get `answers`** that fit their ratings (guitar-slow: beginner on basic chords and
  scales, new elsewhere; guitar-fast: intermediate on chords, scales, CAGED, techniques; voice: beginner on pitch,
  intervals, breath; theory ear: beginner). With a student picked, JourneyView marks each step from
  `reach({ topics: student.answers, solid: solidRefs(progress) })`: a ring or dot style per mark, explained in the
  legend.
- [ ] **Step 4: Screen check** of /dev/questionnaire (pick a few lines in guitar and theory) and /dev/path with each
  example student. Screenshots. Copy on these dev pages follows "Words about the app" (load `teaching-voice`).
- [ ] **Step 5: Full checks:** `npm test` (or the plan, intake, examples and devtools globs), types, lint.
- [ ] **Step 6: Commit** `feat(devtools): known, within reach and ahead on /dev/questionnaire and /dev/path (NEW16)`,
  and update tasks.txt NEW16 to done with what's left (the plan writer reads `reach` in NEW7).
