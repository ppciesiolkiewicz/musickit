# Star Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 1–5 star rating replaces "Mark done" on AI plan exercises and every label on course sections, and both kinds of rating feed the next AI plan prompt.

**Architecture:** A pure star-scale module (`src/features/progress/stars.ts`) and a presentational `StarRating` molecule in `src/components/ui` are shared by both screens. Plan ratings live on `StoredPlan.rated` next to the existing `done` map, which keeps every progress reader unchanged. Course notes shrink to `{ stars, at, note }`, and the parser migrates old labels as it reads. `promptParts` takes a new list of course ratings.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching app code), React, TypeScript, Tailwind, node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-11-10-exercise-ratings-design.md`

## Global Constraints

- Star labels, verbatim: 1 "Can't do it yet", 2 "Struggling", 3 "Getting there", 4 "Solid", 5 "Easy now".
- Old course `know` maps new→1, getting→2, solid→4, own→5. `like`, `often`, `warmup` and `tags` are dropped.
- The course free-text `note` stays.
- Clearing a rating (tapping the current star again) un-does the exercise.
- Legacy `done` entries with no rating stay `[done]` in the prompt. Never invent stars.
- The course ratings in the prompt are capped at 30, newest first.
- `src/components/ui` imports nothing from `@/features`. Import it only from `@/components/ui`. Colours are theme tokens (slate/sky/amber), never hex.
- Controls are not tabbable (`tabIndex={-1}`, a project-wide rule), so the stars are mouse/touch targets of at least 44px. Use `role="radiogroup"` / `role="radio"` + `aria-checked` + `aria-label` for screen readers. This replaces the spec's arrow-key note because the project rule wins.
- Learner-facing text follows the `teaching-voice` skill.
- Tests: `~/.npm/_npx/*/node_modules/.bin/tsx --test <files>` (`npx tsx` hangs here). Typecheck: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Lint: `npx eslint <files>`.
- Commit on main via a temp index, never `git add` in the shared checkout:
  `GIT_INDEX_FILE=$SCRATCH/idx git read-tree HEAD && GIT_INDEX_FILE=$SCRATCH/idx git add <files> && git update-ref HEAD $(git commit-tree $(GIT_INDEX_FILE=$SCRATCH/idx git write-tree) -p HEAD -m "<msg>") && git reset -q -- <files>`
  Other sessions have uncommitted edits in `src/features/devtools/stories/uiStories.tsx` and `PageShell.tsx`, so don't touch those files.

## Review Focus

1. **Stored plans from before this change** (only `done`, no `rated`) load, show as done, and show no stars. → Task 3 sanitise test.
2. **A `rated` map with junk** (stars 0, 6, "3", a missing `at`) is dropped entry by entry without losing the plan. → Task 3 sanitise test.
3. **Course notes holding only labels that are now dropped** (just tags, or just `like`) disappear instead of showing an empty mark. → Task 4 parse test.
4. **Changing a rating** (3 → 5) keeps the exercise done and updates `at`. Tapping 5 again un-does it. → Task 3 `ratePlan` test.
5. **Course notes keyed by sections that no longer exist** are skipped in the prompt and don't crash it. → Task 6 `courseRatings` test.

---

### Task 1: Star scale module

**Files:**
- Create: `src/features/progress/stars.ts`
- Test: `src/features/progress/stars.test.ts`
- Modify: `package.json` (add `src/features/progress/*.test.ts` to the `test` script glob list)

**Interfaces:**
- Produces:
  - `type Stars = 1 | 2 | 3 | 4 | 5`
  - `const STARS: readonly Stars[]` = `[1,2,3,4,5]`
  - `const STAR_LABELS: Record<Stars, string>` (the labels from Global Constraints)
  - `function isStars(v: unknown): v is Stars` (integers 1–5 only)
  - `interface StarRating { stars: Stars; at: string }` (`at` is an ISO datetime)
  - `function cleanRating(v: unknown): StarRating | null` (null unless `stars` passes `isStars` and `at` is a non-empty string)
  - `function starText(s: Stars): string` → `"3★ Getting there"`

- [ ] **Step 1: Write the failing tests**: `isStars` accepts 1..5 and rejects 0, 6, 2.5, "3" and null. `STAR_LABELS[1] === "Can't do it yet"` and `STAR_LABELS[5] === "Easy now"`. `starText(2) === "2★ Struggling"`. `cleanRating({stars:4,at:"2026-11-10T10:00:00.000Z"})` round-trips. `cleanRating({stars:4})` and `cleanRating({stars:9,at:"x"})` are null.
- [ ] **Step 2: Run it and check it fails** (module not found).
- [ ] **Step 3: Implement `stars.ts`** with a one-line header comment saying this is the shared 1–5 scale for plan exercises and course sections.
- [ ] **Step 4: Run it and check it passes.** Add the glob to `package.json`.
- [ ] **Step 5: Commit** `feat(progress): shared 1-5 star scale`

### Task 2: `StarRating` UI molecule

**Files:**
- Create: `src/components/ui/molecules/StarRating/StarRating.tsx`, `src/components/ui/molecules/StarRating/index.ts`
- Modify: `src/components/ui/index.ts` (add `export * from "./molecules/StarRating";` and add StarRating to the molecules line of the header comment)

**Interfaces:**
- Produces: `StarRating({ value, onChange, labels, label, size }: { value: number | null; onChange: (v: number | null) => void; labels: readonly string[] /* 5 labels, index 0 = 1 star */; label: string /* group aria-label, e.g. "Rate this exercise" */; size?: "sm" | "md" })`
  - Clicking star `n` when `value !== n` calls `onChange(n)`. Clicking star `n` when `value === n` calls `onChange(null)`.
  - It shows the label of the hovered star, or of `value`, or of nothing when unset, next to the stars. Stars up to the hovered or current value are filled (amber), the rest are outlined (slate).
  - Each star is a `<button type="button" role="radio" aria-checked tabIndex={-1} aria-label="{n} stars: {label}">` with a hit area of 44px or more. The wrapper has `role="radiogroup" aria-label={label}`.
  - It takes `labels` as a prop because `ui/` can't import `@/features`.

- [ ] **Step 1: Implement it.** There's no unit test (UI tests aren't set up for `components/ui`); Task 7 checks it in the browser.
- [ ] **Step 2: Lint and typecheck** with `npx eslint src/components/ui` and the tsc command. Expect no new errors.
- [ ] **Step 3: Commit** `feat(ui): StarRating molecule`

### Task 3: Plan model — ratings on the stored plan and in the week report

**Files:**
- Modify: `src/features/plan/model/types.ts` (`StoredPlan`)
- Modify: `src/features/plan/model/schedule.ts` (add `ratePlan`)
- Modify: `src/features/plan/store/localPlanStore.ts` (`sanitiseState`)
- Modify: `src/features/plan/model/prompt.ts` (`weekReport`)
- Test: `src/features/plan/model/plan.test.ts` (sanitise and ratePlan), `src/features/plan/model/prompt.test.ts` (weekReport)

**Interfaces:**
- Consumes: `Stars`, `StarRating`, `cleanRating`, `starText` (Task 1); the existing `doneKey(day, ex)`.
- Produces:
  - `StoredPlan.rated?: Record<string, StarRating>`, keyed like `done`. A rated key is also in `done`. The `done` field stays so that progress, the week-over check and the devtools keep working unchanged, and so that legacy plans keep their ticks.
  - `ratePlan(plan: StoredPlan, day: number, ex: number, stars: Stars | null, at: string): StoredPlan`. `stars` sets `rated[k] = {stars, at}` and `done[k] = true`. `null` deletes both. It's pure and doesn't mutate its input.
  - `sanitiseState` keeps `rated` entries that pass `cleanRating` and drops the rest. A plan without `rated` stays valid.
  - `weekReport` line per exercise: `[${starText(r.stars)}] Title (level · focus)` when rated, `[done] Title (...)` when only done, `[skipped] Title (...)` otherwise. The parenthesis holds whichever of `level` and `focus` exist, joined by ` · `, and is omitted when neither exists.

- [ ] **Step 1: Write the failing tests:**
  - `ratePlan(p, 0, 1, 3, T1)` → `rated["0:1"]` is `{stars:3, at:T1}` and `done["0:1"]` is true. Then `ratePlan(_, 0, 1, 5, T2)` → stars 5, at T2, still done. Then `ratePlan(_, 0, 1, null, T3)` → neither key is present. The input object is unchanged.
  - `sanitiseState({current:{...legacy plan with done:{"0:0":true}, no rated}})` keeps the plan, and `current.rated` is `undefined` or `{}`.
  - `sanitiseState` with `rated: {"0:0":{stars:4,at:"…"}, "0:1":{stars:0,at:"…"}, "0:2":{stars:"3",at:"…"}, "0:3":{stars:2}}` keeps only `"0:0"`.
  - `weekReport` of a plan where day 0 has ex0 rated 2 with `level:"beginner", focus:"boxes 1 & 2 at 70 bpm"`, ex1 legacy-done with no level/focus, and ex2 untouched contains `[2★ Struggling] Ex A (beginner · boxes 1 & 2 at 70 bpm)`, `[done] Ex B` and `[skipped] Ex C`.
- [ ] **Step 2: Run them and check they fail.**
- [ ] **Step 3: Implement** the type field, `ratePlan`, the sanitise step and the `weekReport` change. Also update the history rule line in `promptParts` (the `"Build on this: …"` line) to: `"Build on this: ratings are how the exercise went. 1-2 stars: make it easier (slower bpm, a lower level, fewer notes, or split it into parts). 3: keep the level and change one thing. 4-5: move on (faster bpm or the next level). Repeat what was skipped in a new form, and keep the thread of their goals."`
- [ ] **Step 4: Run the plan model tests** (`src/features/plan/model/*.test.ts`) and check they all pass, including the existing ones.
- [ ] **Step 5: Commit** `feat(plan): star ratings on stored plans and in the week report`

### Task 4: Course notes model — stars instead of labels

**Files:**
- Modify: `src/features/course/notes.ts`
- Test: `src/features/course/notes.test.ts` (rewrite the tag and preset tests, keep the parse tests)

**Interfaces:**
- Consumes: `Stars`, `isStars`, `starText` (Task 1).
- Produces:
  - `interface SectionNotes { stars?: Stars; at?: string; note: string }` and `EMPTY_NOTES = { note: "" }`.
  - `parseNotesStore(raw)` reads both shapes. When `stars` is invalid or missing and `know` is set, it maps `KNOW_TO_STARS = { new: 1, getting: 2, solid: 4, own: 5 }`. It keeps `at` only when it's a string. It ignores `like`, `often`, `warmup` and `tags`. An entry with no stars and a blank note is dropped.
  - `hasNotes(n)` → `!!n.stars || !!n.note.trim()`.
  - `marksText(n: SectionNotes): string` → `"★★★"` (one ★ per star), plus `" 📝"` when the note isn't blank, or `""` when nothing is set. This replaces `compactMarks`.
  - Removed: `KNOW`, `LIKE`, `Know`, `Like`, `Tag`, `PRESET_TAGS`, `parseCustomTags`, `makeCustomTag`, `compactMarks`.

- [ ] **Step 1: Write the failing tests:**
  - `parseNotesStore(JSON.stringify({"1/a":{know:"solid",like:4,tags:["x"],note:""}}))` → `{"1/a":{stars:4,note:""}}`.
  - The `know` values new, getting and own map to 1, 2 and 5.
  - `{stars:3, at:"2026-11-10T00:00:00.000Z", note:"hi"}` round-trips. `{stars:3, know:"own", note:""}` keeps 3 (stars win).
  - `{like:2, tags:["clicked"], often:true, note:"  "}` is dropped entirely.
  - `marksText({stars:2,note:"x"}) === "★★ 📝"`, `marksText({note:""}) === ""`.
- [ ] **Step 2: Run them and check they fail.**
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run `src/features/course/*.test.ts` and check it passes.** The UI files won't compile yet; Task 5 fixes them, so commit Tasks 4 and 5 together.

### Task 5: Course UI — one star row per section

**Files:**
- Modify: `src/components/course/useCourseNotes.tsx` (drop `TAGS_KEY`, `custom`, `allTags`, `useTags` and the tags import; keep `NOTES_KEY`, the v2 migration and layout)
- Modify: `src/components/course/MyNotes.tsx` (replace the know, like, flag and tag blocks with one `StarRating`; keep the note box and its debounce)
- Modify: `src/components/course/Marks.tsx` (use `marksText`)
- Modify: `src/components/course/CourseIndex.tsx` (replace the warm-up and come-back-often filters)

**Interfaces:**
- Consumes: `StarRating` from `@/components/ui` (Task 2); `STARS`, `STAR_LABELS`, `isStars` (Task 1); `SectionNotes` and `marksText` (Task 4).
- Produces: nothing new for later tasks. `useAllNotes()` keeps its signature (Task 6 uses it).

- [ ] **Step 1: MyNotes.** Use `Q` "How well can I do it?" and `<StarRating value={n.stars ?? null} labels={STARS.map(s => STAR_LABELS[s])} label="How well can I do it?" onChange={(v) => set(v === null ? { stars: undefined, at: undefined } : { stars: v as Stars, at: new Date().toISOString() })} />`. Then the existing note textarea. Remove `Pick` if nothing else uses it.
- [ ] **Step 2: CourseIndex.** `type Filter = "work" | "solid" | null`. The chips are `"To work on"` (stars 1–2) and `"Solid"` (stars 4–5). `keep` tests `notes[key]?.stars` against those ranges.
- [ ] **Step 3: Marks.** Render `marksText(all[noteKey] ?? EMPTY_NOTES)`. Return null on `""`. Set `aria-label` to `starText(stars)` (+ ", has a note").
- [ ] **Step 4: Check it.** Run the course tests, then `npx eslint src/components/course src/features/course` and the tsc command. Expect no new errors. Run `grep -rn "useTags\|PRESET_TAGS\|compactMarks\|KNOW\b" src`. Expect no hits.
- [ ] **Step 5: Commit Tasks 4 and 5 together** as `feat(course): rate sections with stars instead of labels`

### Task 6: Course ratings in the plan prompt

**Files:**
- Create: `src/features/course/ratings.ts`
- Test: `src/features/course/ratings.test.ts`
- Modify: `src/features/plan/model/prompt.ts` (new param and part), `src/features/plan/model/prompt.test.ts`
- Modify: `src/features/devtools/prompt/PartList.tsx` (`KIND` record gets `course`)
- Modify: `src/features/plan/ui/PlanFlow.tsx` (pass the ratings)
- Modify: `src/features/devtools/prompt/PromptStudio.tsx` (pass `[]`)

**Interfaces:**
- Consumes: `SectionNotes` (Task 4), `ALL_SECTIONS` and `noteKey` from `src/features/course`, `starText` (Task 1), `useAllNotes` (Task 5).
- Produces:
  - `interface CourseRating { title: string; stars: Stars; note?: string; at?: string }` and `courseRatings(notes: Record<string, SectionNotes>, max = 30): CourseRating[]` in `ratings.ts`. It keeps only entries with stars whose key matches a section in `ALL_SECTIONS`. `title` is `"<stage title> › <section title>"`. The order is: entries with `at`, newest first, then entries without `at` in course order. The list is cut at `max`. `note` is trimmed and omitted when blank.
  - `promptParts(answers, entries, previous = [], course: CourseRating[] = [])` and `buildPrompt` with the same extra param. When `course` isn't empty, a part `part("course", "Course ratings", "course", [...])` comes right after `history` (or after `student` when there's no history), with id `"course"`. The heading is `"## Course sections they rated"`, followed by one line per rating, `- ${title}: ${starText(stars)}${note ? ` — "${note}"` : ""}`, then the rule `"These show what they can do from the lessons: pitch exercises on those topics to match, easier where they rated 1-2, further where they rated 4-5."` and a blank line.
  - `PromptPartKind` adds `"course"`.

- [ ] **Step 1: Write the failing tests:**
  - `courseRatings`: a key for a real section with stars 2 and a note → one entry with that title and note. A key `"99/nope"` → skipped. An entry with no stars → skipped. Ordering: two dated entries newest first, then an undated one. `max` 1 → one entry.
  - prompt: `promptParts(DEFAULT_ANSWERS, [], [last], [{title:"S › A", stars:2}])` ids are `[...ORDER.slice(0,2), "history", "course", ...ORDER.slice(2)]`. Without history, `"course"` comes right after `"student"`. The course part's text contains `- S › A: 2★ Struggling`. Add the course case to the existing `buildPrompt is the join of its parts` cases.
- [ ] **Step 2: Run them and check they fail.**
- [ ] **Step 3: Implement it.** In `PlanFlow`, call `useAllNotes()` from `@/components/course/useCourseNotes`, take `useMemo(() => courseRatings(notes), [notes])`, and pass it as the 4th argument to `buildPrompt`. `PartList` `KIND.course` reuses the colour classes of `history`.
- [ ] **Step 4: Run the plan, course and devtools tests, eslint on the touched files, and tsc.** Expect all green and no new errors.
- [ ] **Step 5: Commit** `feat(plan): send course section ratings to the AI plan prompt`

### Task 7: Plan UI — stars replace "Mark done", then a browser check

**Files:**
- Modify: `src/features/plan/ui/ExerciseCard.tsx`
- Modify: `src/features/plan/ui/WeekView.tsx`
- Modify: `src/features/plan/PlanApp.tsx`

**Interfaces:**
- Consumes: `ratePlan` (Task 3), `StarRating` (Task 2), `STARS`/`STAR_LABELS` (Task 1).
- Produces: `ExerciseCard` props `onToggle?: () => void` are replaced by `rating?: Stars | null; onRate?: (stars: Stars | null) => void`. `done` stays (it covers legacy ticks). `WeekView` prop `onToggle` becomes `onRate: (day: number, ex: number, stars: Stars | null) => void`.

- [ ] **Step 1: ExerciseCard.** Where the Mark-done button was, when `onRate` is given, add a line "How did it go?" (slate-400, sm) and `<StarRating value={rating ?? null} labels=… label="How did it go?" onChange={(v) => onRate(v as Stars | null)} />`. Keep today's done styling (emerald edge, strike-through) driven by `done`.
- [ ] **Step 2: WeekView and PlanApp.** WeekView passes `rating={plan.rated?.[doneKey(day, i)]?.stars ?? null}` and `onRate={(s) => onRate(day, i, s)}`. PlanApp replaces `toggle` with `rate = (d, e, s) => setPlan((p) => ratePlan(p, d, e, s, new Date().toISOString()))`. `DemoPlan` needs no change, because it passes no `onRate` and so shows no stars.
- [ ] **Step 3: Static checks.** Run the full `npm test` file list via the cached tsx, `npx eslint src/features/plan src/components`, and tsc. Expect no new errors.
- [ ] **Step 4: Browser check** (dev server, `/` plan page and a course section; follow the memory notes on worktree dev, screenshots and keeping user data). **Back up the `musickit.plan` and `musickit.course.notes.v2` localStorage values first and restore them at the end.** Then check:
  - A card shows five stars and "How did it go?". Tapping 3 marks it done (emerald), the label reads "Getting there", and the day progress moves.
  - Tapping 3 again un-does it.
  - Reloading keeps the rating.
  - A course section shows one star row and the note. A section that had old "solid" shows 4 stars.
  - The course index shows ★ marks, and the "To work on" / "Solid" filters work.
  - The next-week prompt (Plan → next week → copy prompt) contains a `[N★ …]` line and the "Course sections they rated" part.
  - At 375px width the stars fit on one line without horizontal scroll.
- [ ] **Step 5: Commit** `feat(plan): rate exercises with stars instead of Mark done`
- [ ] **Step 6: Update `src/features/plan/README.md`** wherever it describes `done`, Mark done or `buildPrompt`'s params. Commit `docs(plan): star ratings`.
