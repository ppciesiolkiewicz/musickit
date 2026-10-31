# AI Autoplan: Questionnaire, Timing, Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A per-area concept questionnaire, timers that equal the exercise's minutes, block-structured varied exercises, melody picking by filter, and a standalone example library the prompt draws from.

**Architecture:** Pure logic and data in `src/features/plan/model/` (concepts, answers migration, blocks, checks, example selection, prompt), standalone JSON in `src/features/plan/examples/`, UI in `src/features/plan/ui/`. The prompt is generated from the catalogue, the answers and the selected examples.

**Tech Stack:** Next.js (repo version, see `node_modules/next/dist/docs/`), React, TypeScript, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-31-autoplan-questionnaire-examples-design.md`

## Global Constraints

- Follow `src/features/plan/CLAUDE.md` and `src/features/exercises/CLAUDE.md`: pure logic in `model/` with tests; data only via `PlanStore`/`usePlan()`; never hand-edit `docs.generated.json` (run `npm run docs:exercises`).
- Tests: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1); $TSX --test src/features/plan/model/*.test.ts` (never `npx tsx`, it hangs). Exercises tests: `$TSX --test src/features/exercises/**/*.test.ts`.
- Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing. Lint: `npx eslint src/features/plan src/features/exercises`.
- `next build` can't fetch fonts locally; verify UI with `npm run dev` instead.
- Commit straight to main, with a temporary index (other sessions share the real one):
  `export GIT_INDEX_FILE=$SCRATCH/idx; git read-tree HEAD; git add <files>; git commit -m "…"; unset GIT_INDEX_FILE; git reset -q -- <files>`. Never `git add` with the shared index. End messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Keep `src/features/plan/README.md` up to date in the task that changes the behaviour.
- Copy and code style: match the surrounding files (short JSDoc in plain English, no filler).

## Review Focus

1. **Old stored data:** a browser with pre-change `musickit.plan` answers (`instruments`, `level`, `goals`) and a saved flow in `sessionStorage` must open `/plan` and the next-week flow without a crash, levels filled from the old answers. Test in Task 2.
2. **Old pasted/stored plans with `repeats`:** they must keep their written `minutes`, not the computed ones. Test in Task 3.
3. **A pasted exercise whose blocks don't add up** (e.g. 10 min with blocks 3+3+3, or blocks totalling 0): rescaled to the total, never a block of 0 minutes, warning shown. Test in Task 3.
4. **Mic denied / silence in Find my range:** the voice screen still works with chips only. Test (pure part) in Task 7.
5. **A melody `pick` that matches nothing** (unknown stage, index 99): it still resolves to a real tune, with a warning, never drops the tool. Test in Task 5.

---

### Task 1: Concept catalogue and course stubs

**Files:**
- Create: `src/features/plan/model/concepts.ts`
- Create: `src/features/plan/model/concepts.test.ts`
- Modify: `src/features/course/stages/*.ts` (empty `section()` stubs only)

**Interfaces:**
- Produces:
  ```ts
  export type Area = "guitar" | "voice" | "theory";
  export interface Concept { id: string; area: Area; level: Level; label: string; hint?: string; buildsOn?: string[]; course?: string }
  export const CONCEPTS: Concept[];
  export const AREAS: { id: Area; label: string }[];          // Guitar, Voice, Theory & ear
  export function conceptsFor(area: Area, level: Level): Concept[]; // that level + the one below, catalogue order
  export const conceptById: (id: string) => Concept | undefined;
  ```
  `Level` comes from `./types` (unchanged: `"new" | "beginner" | "intermediate" | "advanced"`).

- [ ] **Step 1: Write failing tests** in `concepts.test.ts`:
  - `ids are unique and kebab-case`
  - `every buildsOn id exists and comes earlier in CONCEPTS`
  - `conceptsFor("theory","beginner")` returns New theory concepts then Beginner ones; first Beginner label is `"Pentatonic (minor & major)"`, followed by `"Major scale"`, `"Natural minor scale"`.
  - `conceptsFor(area,"new")` contains only New concepts.
  - `every course link is in catalogue()` (`checkLink(c.course, catalogue())` equals `c.course`).
  - `each area at each level has at least 3 concepts`.
- [ ] **Step 2: Run tests, expect FAIL** (module missing).
- [ ] **Step 3: Write `concepts.ts`** with exactly the spec's starting list (section 1, "Starting list"), easiest first, in the spec's order. Melody concepts: `guitar-melodies-new|beginner|intermediate|advanced`, `voice-melodies-easy`. Set `buildsOn` where the spec implies order (e.g. `major-scale` builds on `pentatonic`, `natural-minor` on `major-scale`, `modes` on `major-scale`, `augmented` on `diminished`). Set `course` to the existing section where one fits (find slugs in `src/features/course/stages/*.ts`; stage slug from `slug:`).
- [ ] **Step 4: Add course stubs** for concepts with no section: `section("<slug>", "<Title>", <topic>, "<one-line about>")` with no blocks, in the most fitting stage. At least: matching a pitch, breath & holding a note, augmented chords, chords in pop/rock, chords in folk, chords in jazz (if `jazz-standards`/`comping` don't fit), plus any other gap. Point each concept's `course` at its stub. Record the stub list for the final PR summary in `src/features/plan/README.md` under "Course sections to write".
- [ ] **Step 5: Run plan + course tests, expect PASS** (`$TSX --test src/features/plan/model/*.test.ts src/features/course/*.test.ts`).
- [ ] **Step 6: Commit** `feat(plan): concept catalogue for the questionnaire`.

---

### Task 2: Answers model v2 and migration

**Files:**
- Modify: `src/features/plan/model/types.ts`, `src/features/plan/model/questions.ts`
- Create: `src/features/plan/model/answers.ts`, `src/features/plan/model/answers.test.ts`
- Modify: `src/features/plan/store/localPlanStore.ts` (use `migrateAnswers`), `src/features/plan/ui/PlanFlow.tsx` (`savedFlow` runs `migrateAnswers` on `draft`)

**Interfaces:**
- Consumes: `Area`, `conceptById` (Task 1); `Voice` from `@/features/theory/singing`.
- Produces:
  ```ts
  export type Rating = 1 | 2 | 3 | 4 | 5;
  export interface PlanAnswers {
    levels: Partial<Record<Area, Level>>;
    ratings: Record<string, Rating>;
    voice?: { type?: Voice; range?: { low: number; high: number } };
    focus: string[];   // ≤ 3 concept ids
    minutes: number;
    styles: string;
    notes: string;
  }
  export const DEFAULT_ANSWERS: PlanAnswers; // { levels: { guitar: "beginner" }, ratings: {}, focus: [], minutes: 20, styles: "", notes: "" }
  export function migrateAnswers(raw: unknown): PlanAnswers; // in answers.ts
  ```
  `Instrument`, `GOALS`, `STRUGGLES`, `INSTRUMENTS` are removed (fix all imports; `buildPrompt` is rewritten in Task 10, until then make it compile by printing levels only).

- [ ] **Step 1: Failing tests** in `answers.test.ts`:
  - `old guitar+voice intermediate` → `{ levels: { guitar: "intermediate", voice: "intermediate", theory: "intermediate" } }`, styles/notes/minutes kept.
  - `old piano only` → `levels: { guitar: <old level>, theory: <old level> }`.
  - `old single "instrument": "voice"` → voice + theory.
  - `new shape round-trips` unchanged.
  - `drops unknown concept ids, ratings outside 1–5, focus beyond 3, unknown voice types, ranges with low ≥ high`.
  - `all areas skipped` → falls back to `DEFAULT_ANSWERS.levels`.
  - `garbage (null, "x", [])` → `DEFAULT_ANSWERS`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** types, defaults and `migrateAnswers`; `localPlanStore.sanitiseAnswers` becomes `migrateAnswers`; `savedFlow()` returns `{ ...s, draft: migrateAnswers(s.draft) }`.
- [ ] **Step 4: Run tests, tsc; expect PASS / clean.**
- [ ] **Step 5: Commit** `feat(plan): per-area levels and concept ratings in answers`.

---

### Task 3: Honest minutes and blocks (model)

**Files:**
- Modify: `src/features/plan/model/tools.ts` (heading `minutes`; `derivedMinutes` kept but unused for minutes), `src/features/plan/model/config.ts`
- Create: `src/features/plan/model/blocks.ts`, `src/features/plan/model/blocks.test.ts`
- Modify: `src/features/plan/model/plan.test.ts` (update tests that expect derived minutes)

**Interfaces:**
- Produces:
  ```ts
  // tools.ts
  Section heading variant: { type: "heading"; text: string; minutes?: number }  // integer 1..60
  // blocks.ts
  export interface Block { title: string; minutes: number; from: number; to: number } // section index range [from, to)
  export function blocksOf(sections: Section[]): Block[];          // [] when no heading has minutes
  export function fitBlocks(sections: Section[], minutes: number): { sections: Section[]; changed: boolean };
  ```
  Rules (spec §2): sections before the first block heading belong to block 1; headings without minutes don't start blocks. `fitBlocks` scales block minutes to `minutes` with largest-remainder rounding, every block ≥ 1, total exactly `minutes`. When `minutes` < block count, the last blocks lose their `minutes` (they become plain sub-headings) until each remaining block can get ≥ 1. The exercise's `minutes` never changes. `parsePlanConfig` no longer applies `derivedMinutes`; it calls `fitBlocks` and warns `"<where>: block minutes didn't add up to N; scaled them."`, and warns `"<where>: over 5 minutes in one block; split it."` when minutes > 5 and `blocksOf(...).length < 2`.

- [ ] **Step 1: Failing tests** in `blocks.test.ts`:
  - `blocksOf` with text, heading(3), list, tool, heading(no minutes), heading(4) → two blocks `{from:0,to:4,minutes:3}`, `{from:4,to:N,minutes:4}`.
  - `fitBlocks(…, 10)` on 3+3+3 → minutes `[4,3,3]` (sum 10), `changed: true`.
  - `fitBlocks(…, 2)` on 1+1+1 → headings 1–2 have minutes 1, heading 3 has no `minutes`, `changed: true`.
  - `fitBlocks` on blocks 0-sum (all clamped to 1 then 1+1 for 8 min) → `[4,4]`, no block 0.
  - `fitBlocks` with exact sum → `changed: false`, same object values.
  In `plan.test.ts`: `an exercise with a play-along repeats keeps its written minutes` (minutes 10 with repeats that would derive 4 → 10); `paste warns on a 12-minute exercise with one block`; `heading minutes parse, clamp to 1..60, drop non-numbers`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `blocks.ts`, heading `minutes` in `parseSection` and the `SECTIONS` heading schema (`minutes: { type: "integer", minimum: 1, maximum: 60, description: "starts a timed block of this many minutes" }`), and the config changes.
- [ ] **Step 4: Run tests, tsc; PASS / clean.**
- [ ] **Step 5: README:** replace the "A play-along with `repeats` sets the exercise's minutes" text with the blocks rule. **Commit** `fix(plan): timer follows the exercise's minutes; timed blocks`.

---

### Task 4: Block-aware timer and current-block marker (UI)

**Files:**
- Modify: `src/features/plan/ui/ExerciseTimer.tsx`, `src/features/plan/ui/WeekView.tsx`, `src/features/plan/ui/Sections.tsx`
- Modify: `src/features/plan/model/blocks.ts` (+ test)

**Interfaces:**
- Consumes: `blocksOf`, `Block` (Task 3).
- Produces:
  ```ts
  export function blockAt(blocks: Block[], elapsedSeconds: number): { index: number; leftInBlock: number } | null; // blocks.ts
  ExerciseTimer props: { minutes: number; blocks?: Block[]; onFinish: () => void; onBlock?: (index: number | null) => void }
  Sections props: { sections: Section[]; currentBlock?: number | null }
  ```
  Timer shows `block 2 of 4 · 2:41` beside the countdown when blocks exist; plays a short single tick (reuse the oscillator approach in `chime()`, one 990 Hz note, 0.15 s) on each block change; `onBlock` reports the running block (null when stopped/reset). WeekView holds the current block per exercise and passes it to `Sections`, which puts a small "now" marker (sky dot + `aria-current="step"`) on that block's heading.

- [ ] **Step 1: Failing tests** for `blockAt`: blocks 3,4 min; at 0 s → `{index:0,leftInBlock:180}`; at 200 s → `{index:1,leftInBlock:400}`; at 420 s → `null`.
- [ ] **Step 2: Run, FAIL.** **Step 3: Implement** `blockAt` and the UI.
- [ ] **Step 4:** tests, tsc, eslint clean; `npm run dev` (use `--webpack` if in a worktree), open `/plan` with a plan containing blocks, start a timer, confirm label and marker advance (shorten by pasting a plan with 1-minute blocks).
- [ ] **Step 5: Commit** `feat(plan): timer marks timed blocks`.

---

### Task 5: Melody pick filter

**Files:**
- Modify: `src/features/exercises/basics/melody-singer/melody-singer.props.ts`, `src/features/exercises/basics/run-singer/run-singer.props.ts` (document `pick`), then `npm run docs:exercises`
- Create: `src/features/theory/melodyPick.ts`, `src/features/theory/melodyPick.test.ts`
- Modify: `src/features/plan/model/tools.ts` (`singer` accepts `pick`), `src/features/plan/model/config.ts` (warning), `src/features/plan/model/plan.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MelodyPick { difficulty?: string; stage?: string; index?: number }
  export function pickTune(book: BookTune[], pick: MelodyPick): { n: number; exact: boolean } | null; // null only for an empty book
  export function pickChoices(stages: Stage[]): string; // "difficulties: easy, medium, hard, expert; stages: do-re (Do and Re), …"
  ```
  Matching: `difficulty` = `DIFFICULTIES[i].title` case-insensitive; `stage` = stage id; `index` default 0, wraps modulo matches. No match → drop `stage`; still none → nearest difficulty index; `exact: false` in either fallback. `singer()` resolves `pick` to `tune`/`run` (stored tool holds the number, never `pick`), and marks the parsed tool so config can warn `"<where>: no tune matched the pick exactly; used tune N."` (return the warning via a side list the same way other parse warnings work, or a `picked?: { exact: boolean }` transient field stripped before storage; builder's choice, but stored plans must not contain it). The prompt's tool description shows `pickChoices` instead of the full `melodyChoices()` list.

- [ ] **Step 1: Failing tests:** `pickTune` easy+`skips`+index 0 → the first Easy tune in stage `skips`, `exact: true`; index wraps; unknown stage → same difficulty any stage, `exact:false`; `difficulty:"impossible"` → falls back, returns a real `n`; parse of `{ type:"melody-singer", pick:{difficulty:"easy"}, key:"a" }` → `{ type:"melody-singer", tune:<n>, key:9 }` with no `pick` key.
- [ ] **Step 2: Run, FAIL.** **Step 3: Implement**, regenerate docs.
- [ ] **Step 4:** plan, theory and exercises tests (docs freshness included), tsc: PASS.
- [ ] **Step 5: Commit** `feat(exercises): pick melodies by difficulty and stage`.

---

### Task 6: Sing-or-play check

**Files:**
- Create: `src/features/plan/model/checks.ts`, `src/features/plan/model/checks.test.ts`
- Modify: `src/features/plan/model/config.ts`

**Interfaces:**
- Produces: `export function mixesSingAndPlay(sections: Section[]): boolean;`
  Singing = a mic tool (`staff` with live pitch, `melody-singer`, `run-singer`) OR text/list matching `/\bsing(s|ing)?\b/i`. Playing = an instrument tool used to play (`chord-shapes`, `scale-neck`, `arpeggio-neck`, `finger-pattern`, `picking-drill`, `legato-trill`) OR text/list matching `/\b(play|strum|pick|fret)\b/i` where the object is the student's instrument. Neutral: `click-drone`, `backing-band`, `play-along`, `staff` without mic, `interval-ears`, `note-finder`. Returns true only when both sides are present. Text matching is a heuristic: ignore "play-along", "the app plays", "press Play". `parsePlanConfig` warns `"<where>: asks to both sing and play; keep it to one."`.

- [ ] **Step 1: Failing tests:** the screenshot case (click-drone, "Play Do on the guitar, then sing it back", arpeggio-neck) → true; singing over a play-along with "Sing the 3rd while the chords play" → false; scale-neck "play box 1" → false; melody-singer + "press Play to hear it, then sing" → false; listening-only interval-ears → false.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(plan): warn when an exercise mixes singing and playing`.

---

### Task 7: Find my range

**Files:**
- Create: `src/features/theory/voiceRange.ts`, `src/features/theory/voiceRange.test.ts`
- Create: `src/features/plan/ui/RangeFinder.tsx`

**Interfaces:**
- Consumes: `usePitch` (`src/features/tuner/usePitch.ts`; see `Tuner.tsx` for mic/analyser setup), `VOICES`, `hzToMidi`.
- Produces:
  ```ts
  export function steadyNote(midis: (number | null)[], minFrames: number): number | null; // voiceRange.ts: rounded midi held within ±0.5 for the last minFrames samples
  export function nearestVoice(range: { low: number; high: number }): Voice;             // smallest |low-low'|+|high-high'|
  RangeFinder props: { onRange: (r: { low: number; high: number }, voice: Voice) => void }
  ```
  Steps: idle ("Find my range") → "Sing your lowest comfortable note" → steady ≈1 s → "Now your highest" → result `C3 – A4 → Tenor` + Retry. Mic denied / no pitch for 10 s → message "Couldn't hear you; pick a type above." and back to idle. Mic released on unmount.

- [ ] **Step 1: Failing tests:** `steadyNote` with 30 frames around 48.2 → 48; with a jump inside the window → null; with nulls → null. `nearestVoice({low:48,high:69})` → `"tenor"`; `({low:41,high:62})` → `"bass"`. `low ≥ high` input is never produced (component swaps them); test `nearestVoice` with swapped values via a `normaliseRange` helper → same result.
- [ ] **Step 2: FAIL. Step 3: Implement** pure functions, then the component (rendered by Task 8).
- [ ] **Step 4:** tests, tsc, eslint clean.
- [ ] **Step 5: Commit** `feat(plan): find your vocal range with the mic`.

---

### Task 8: Questionnaire screens (start + next week)

**Files:**
- Modify: `src/features/plan/ui/Questionnaire.tsx`, `src/features/plan/ui/PlanFlow.tsx`
- Modify: `src/components/ui/organisms/StepModal/StepModal.tsx` (optional `bodyHeight` prop) or fix height inside the plan's screens; builder's choice

**Interfaces:**
- Consumes: `AREAS`, `conceptsFor`, `conceptById` (Task 1); `PlanAnswers`, `Rating` (Task 2); `RangeFinder` (Task 7); `VOICES`.
- Produces: `questionSteps(draft, set): ModalStep[]`, which returns the screens in the spec's order, dynamically: levels → one concept screen per non-skipped area → voice (if voice) → this week → minutes → anything else (+ styles line). `QuestionId` and the `ids` filter are removed; the next-week flow uses `[feedbackStep, ...questionSteps(draft, set)]`.

Screen specifics (spec §1): level rows with Skip·New·Beginner·Intermediate·Advanced, `canNext` when ≥ 1 area set; concept rows with 1–5 star buttons (tap the same star again to clear back to unsure), `aria-label="<label>: N of 5"`, "builds on X" hint; voice chips + Not sure + `RangeFinder` (found range sets `voice.range` and `voice.type`); focus chips from ratings 1–2 plus the first 2 concepts of the next level, max 3 selectable; styles input placeholder `"Optional: only flavours the drills (blues, folk…)"`.

Fixed height: every screen body occupies the same height (use a fixed `h-[22rem]`-class body with `overflow-y-auto`, chosen so the longest concept list scrolls); header and Back/Next never move. Applies to the copy and paste screens too.

- [ ] **Step 1:** Implement the screens and the next-week flow.
- [ ] **Step 2:** tests, tsc, eslint clean.
- [ ] **Step 3: Manual check** with `npm run dev`, `/plan` → Start: walk every screen with Guitar intermediate + Voice new; confirm the Back/Next bar stays in the same pixel position (compare screenshots of screens 1, 2 and the paste screen at the same window size), concept screens match the level, voice screen appears only with Voice, next-week flow is prefilled and editable. Back up and restore the `musickit.plan` localStorage key around the check.
- [ ] **Step 4: README** "The player's path" updated. **Commit** `feat(plan): concept questionnaire with fixed-height screens`.

---

### Task 9: Example library

**Files:**
- Create: `src/features/plan/examples/README.md`, `examples/exercises/*.json` (15), `examples/plans/*.json` (4), `examples/index.ts`, `examples/examples.test.ts`

**Interfaces:**
- Consumes: section/tool formats incl. heading `minutes` (Task 3) and `pick` (Task 5); `CONCEPTS` (Task 1).
- Produces:
  ```ts
  export interface ExampleMeta { id: string; area: Area | "mixed"; areas: Area[]; level: Level; concepts: string[]; note: string }
  export interface ExerciseExample extends ExampleMeta { kind: "exercise"; showcase?: "blocks" | "pick" | "progression"; exercise: unknown }
  export interface PlanExample extends ExampleMeta { kind: "plan"; minutes: number; plan: unknown }
  export const EXERCISE_EXAMPLES: ExerciseExample[];
  export const PLAN_EXAMPLES: PlanExample[];
  ```
  JSON files import nothing; `index.ts` imports them statically (`import x from "./exercises/x.json"`; check `resolveJsonModule` in tsconfig). The exercise/plan bodies are exactly what the model returns.

Content (spec §6): exercises = guitar ×4 levels, voice ×4, theory & ear ×4, plus 3 showcases (`blocks`: chart per step with Do lit at each step; `pick`: voice melody via `pick`; `progression`: one progression worked several ways). Plans: `guitar-beginner`, `guitar-intermediate`, `voice-beginner`, `guitar-theory-intermediate`, each 7 days, daily totals = its `minutes` (20, 30, 15, 30). Every example: sing or play never both; every named note lit; root never muted; blocks of 2–5 min for anything over 5 min; tools only from `COMPONENT_DOCS`; stubs allowed; styles only as one-sentence colour. Read `prompt.ts` rules and the components' `*.props.ts` before writing.

- [ ] **Step 1: Failing tests** in `examples.test.ts`:
  - `every exercise example parses with zero warnings` (wrap in a 7-day plan of copies, run `parsePlanConfig`, assert `warnings` empty).
  - `every plan example parses with zero warnings and has 7 days`.
  - `ids unique; concepts exist (conceptById)`.
  - `block minutes sum to exercise minutes; exercises over 5 min have ≥ 2 blocks` (via `blocksOf`).
  - `plan days total their stated minutes ±2`.
  - `no exercise mixes singing and playing` (`mixesSingAndPlay`).
  - `each area × level has an exercise; three showcases exist`.
  - `JSON files import nothing` (read each file, `JSON.parse` succeeds, no `$ref`).
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Write README, index.ts and all JSON.**
- [ ] **Step 4: Run, PASS.** Paste one plan into `/plan` on the dev server and look at every day: notes lit as text says, Do visible, timers equal text minutes.
- [ ] **Step 5: Commit** `feat(plan): example library of exercises and 7-day plans`.

---

### Task 10: Prompt rewrite

**Files:**
- Modify: `src/features/plan/model/prompt.ts`, `src/features/plan/model/plan.test.ts`
- Create: `src/features/plan/model/exampleSelection.ts`, `src/features/plan/model/exampleSelection.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 5, 9.
- Produces:
  ```ts
  export function selectExamples(a: PlanAnswers): { exercises: ExerciseExample[]; plan: PlanExample }; // exampleSelection.ts
  export function buildPrompt(answers: PlanAnswers | null, entries: CatalogueEntry[], previous?: StoredPlan[]): string; // signature unchanged
  ```
  `EXAMPLE` is deleted. Selection (spec §6): area×level exercises for each non-skipped area at its level, plus one level up when ≥ 70 % of that level's shown concepts are rated 4–5; plus showcases always (`pick` only with voice); plan = most shared areas, then closest level (voice-only advanced → `voice-beginner`).
  Prompt content: student section per area with level and `label ★★★☆☆` (unsure listed as unsure), voice type + range in note names, focus labels, minutes, notes, styles (marked "flavour only"). Rules: spec §3 bullets verbatim in meaning, replacing "Always pair singing with playing" and its suggestions; the 3-minute rule becomes "a bare singing drill is at most one block of ≤ 3 minutes"; build on high ratings, drill low/unsure, follow buildsOn order; keys inside the voice range; no genre-driven plans. Remove the `repeats` arithmetic paragraph; teach heading `minutes` blocks. New wrong → right pairs: muted Do; one chart for five steps; 12 min one tool; sing-and-play; timer ≠ text. Examples printed as `### Example: <id>` + `Why it's good: <note>` + json block; the plan example under "Answer format".

- [ ] **Step 1: Failing tests:**
  - `selectExamples` guitar intermediate only → guitar-intermediate exercise, showcases `blocks` and `progression`, not `pick`, plan `guitar-intermediate`.
  - voice advanced only → voice-advanced exercise + `pick`, plan `voice-beginner`.
  - guitar intermediate with ≥ 70 % 4–5 stars → also guitar-advanced.
  - `buildPrompt` contains `Major scale ★★☆☆☆` for rating 2, `unsure` for unrated shown concepts, `Tenor` and `C3` for a tenor range, no `repeats x`, no `Always pair singing with playing`, contains `Why it's good:`.
  - Remove/replace old tests referencing `EXAMPLE`.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS**, tsc, eslint.
- [ ] **Step 5: README** "The prompt" updated. **Commit** `feat(plan): prompt from concepts, ratings and the example library`.

---

### Task 11: Final verification

- [ ] **Step 1:** full plan, theory, course and exercises tests; tsc; eslint. All clean.
- [ ] **Step 2:** dev server end-to-end: Start → all screens → copy prompt (check length is reasonable, < ~60 KB) → paste `examples/plans/guitar-intermediate.json`'s plan → week view, timers, block marker. Next week flow: change styles and a rating, copy prompt, confirm the change is in it. Restore localStorage.
- [ ] **Step 3:** README code map lists `concepts.ts`, `answers.ts`, `blocks.ts`, `checks.ts`, `exampleSelection.ts`, `examples/`, `RangeFinder.tsx`; "Course sections to write" lists the stubs. Commit `docs(plan): readme for questionnaire, blocks and examples`.
