# The running plan edited in place Implementation Plan (plan 5 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player edits a day of their running plan on the block editor: each exercise a block in a frame that carries its title, minutes, why and links; a day gains or loses an exercise within 2–5; an edited exercise is a new exercise (new id, its stars and tick cleared, the progress log keeps the old row).

**Architecture:** Pure first: `model/editPlan.ts` applies a finished day edit to a `StoredPlan` (which exercises changed, which were added or removed, the `day:exercise` keys of `done`, `rated` and `spent` moved with them, `elapsed` kept). Then the UI: `ui/DayEditor.tsx` holds a draft of one day (the exercises as blocks plus a small meta form each, warnings from the parser, Copy fix request) and hands the draft to `editDay` on **Done**. The week view gets **Edit** on a day.

**Tech Stack:** TypeScript, React, Next.js 16, Tailwind; node:test through the cached tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md` ("What the player sees: the plan", the "running plan is edited in place" and "edited block is a new exercise" bullets, "Interfaces"). Earlier: plan 4 (`2026-11-13-blocks-editor.md`: `BlockEditor`, `editBlock`, `withIds`).

## Global Constraints

- "The week view gets **Edit** on a day: the day's blocks as the notebook, each block the editor above, with the exercise's title (hashtags included), minutes, why and links in the outer frame's header; **Done** returns to the week."
- "A day can gain or lose a block within the 2–5 rule."
- "An edited block is a new exercise: it gets a new id, so its stars and done tick are cleared and the progress log keeps the old row under the old id as history. A block left untouched keeps its id and rating; a block removed loses its rating the same way. The day's elapsed time stays."
- "Warnings from the parser show on the block as the paste step shows them, with **Copy fix request**."
- "Next week's prompt reports the week as it stands (`weekReport`)": no change needed beyond the ratings moving with their exercise.
- The editor receives a `Block`; the plan's metadata is edited by a separate small form (design "Interfaces": "the editor shows it in the outer frame's header through a small separate meta form").
- Every word on screen: `design:ux-copy` with "Words about the app" (`teaching-voice`); the flow names: **Edit**, **Done**, **Add an exercise**, **Remove exercise**, **Copy fix request**.

## Decisions (my call)

- **An exercise is "edited"** when its block or its meta differs from what the day held when Edit was pressed (deep compare, cell ids ignored). Edits are kept in a draft until **Done**; **Cancel** drops them. So typing never mints a new id per keystroke.
- **Keys move with exercises:** `done`, `rated` and `spent` are keyed `day:index`; an insert or a removal re-keys the exercises after it on that day.
- **Meta form:** Title (hashtags typed in it, read by `readTitle` on Done), Minutes (1–120), Why (one line), Learn before and Explore more as chips of catalogue pages with ✕ and an **Add a page** select. Area, level, kind tags come from the title's hashtags, as on paste.
- **A new exercise** starts as `{ title: "New exercise #<area>", minutes: 10, cells: [text "What to do."] }` in the day's first exercise's area, and needs a Learn before link like any exercise (the parser's warning says so).
- **Warnings** come from `parseExercise` on each draft exercise (the same checks as a paste), shown under its frame; **Copy fix request** copies `fixRequest(warnings)` for the player's AI.
- No AI here: the WebMCP tools are plan 6.

## Review Focus

1. Removing exercise 2 of 4 when exercise 3 is rated: the rating moves to the new index 2, exercise 2's rating is gone (Task 1).
2. Editing only exercise 3's minutes: exercise 3 gets a new id and loses its stars; 1, 2 and 4 keep theirs (Task 1).
3. A day of 5 can't add, a day of 2 can't remove (buttons disabled, and `editDay` refuses) (Tasks 1, 2).
4. Cancel after edits: the plan is exactly as it was (Task 2).
5. The day timer running while Edit opens: elapsed for the day is kept and the timer pauses while editing (Task 3).

---

### Task 1: Applying a day edit

**Files:**
- Create: `src/features/plan/model/editPlan.ts`, `editPlan.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** what the editor hands back: the day's exercises in their new order; `from` is each one's index in the day before the edit, or null for a new one */
  export interface DayDraft { exercises: { from: number | null; exercise: PlanExercise }[] }
  export const MIN_EXERCISES = 2, MAX_EXERCISES = 5;
  export function draftOf(plan: StoredPlan, day: number): DayDraft;
  export function sameExercise(a: PlanExercise, b: PlanExercise): boolean;   // ignores cell ids
  export function editDay(plan: StoredPlan, day: number, draft: DayDraft, newId: () => string): StoredPlan | { refused: string };
  ```
- [ ] **Step 1: Failing tests:** untouched draft → same plan object; minutes changed on exercise 3 of 4 → new id on 3, `rated["d:2"]`, `done`, `spent` cleared for it, others unchanged; remove index 1 of 4 with `rated["d:2"]` → it moves to `"d:1"`, `"d:1"`'s old rating gone; insert at 1 → later keys shift up, new exercise has a fresh id and no state; reorder 0↔1 untouched → ratings follow their exercises; 6 exercises → `{ refused }`; 1 exercise → `{ refused }`; `elapsed[d]` kept; other days untouched; cell ids differing alone → `sameExercise` true.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS; tsc; eslint.
- [ ] **Step 5: Commit** `feat(plan): editDay, a day of the running plan edited`.

### Task 2: The day editor

**Files:**
- Create: `src/features/plan/ui/DayEditor.tsx`, `src/features/plan/ui/ExerciseMetaForm.tsx`
- Modify: `src/features/plan/README.md`

**Interfaces:**
- Consumes: `BlockEditor`, `withIds` (plan 4); Task 1's `draftOf`, `editDay`, limits; `parseExercise`, `fixRequest`, `catalogue`, `readTitle`, `hashtagLine`.
- Produces: `export default function DayEditor({ plan, day, onDone, onCancel }: { plan: StoredPlan; day: number; onDone: (next: StoredPlan) => void; onCancel: () => void })`.
- [ ] **Step 1: Load `design:ux-copy` and `teaching-voice`.** Strings: Done, Cancel, Add an exercise, Remove exercise, Move exercise up / down (named with the title), Title, Minutes, Why, Learn before, Explore more, Add a page, Copy fix request / Copied, the limits ("A day has 2 to 5 exercises.").
- [ ] **Step 2: Build:** one frame per exercise: `ExerciseMetaForm` (title with hashtags, minutes, why, link chips) over a `BlockEditor` of `{ title, choice, cells }` (the block's title field hidden: the meta form owns it), the exercise's warnings and Copy fix request under it; Add an exercise (after the last, disabled at 5), Remove exercise (disabled at 2), Move up/down for whole exercises; Done (applies `editDay`, shows `refused` if any) and Cancel. A palette for Add a widget: the studio's in notes mode, as the notes creator does.
- [ ] **Step 3: Look** at it on `/plan` with a demo plan (`demos.ts`; back up and restore `musickit.plan`) at 1280 and 390 px. tsc, eslint.
- [ ] **Step 4: Commit** `feat(plan): the day editor`.

### Task 3: Edit in the week

**Files:**
- Modify: `src/features/plan/ui/WeekView.tsx`, `src/features/plan/PlanApp.tsx`, `src/features/plan/README.md`, `spec/` for the plan page if there is one
- [ ] **Step 1:** **Edit** beside the day's title (not on a past week's preview without `onElapsed`); while editing, the day timer is paused and hidden, the cards replaced by `DayEditor`; Done saves through `usePlan().update` and returns to the week with the timer as it was.
- [ ] **Step 2: Look** at it: edit a rated exercise (its stars clear), edit nothing and Done (stars kept), remove and add exercises, Cancel; the next week's prompt (Plan next week) reports the week as it stands. All tests, tsc, eslint.
- [ ] **Step 3: Commit** `feat(plan): Edit a day of the running plan`.
