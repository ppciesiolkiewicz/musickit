# Star ratings for plan exercises and course sections

Date: 2026-11-10

## Why

The AI plan can't tell how an exercise went. It only knows "done" or "skipped", plus one free-text box for the whole week, so the next week can't set the tempo or level of each skill well. Course articles have the opposite problem: too many labels (a know scale, a like scale, two flags, 24 tags), and none of them reach the AI.

One 5-star rating, used on both, fixes this. The student rates each exercise when they finish it, and each course section when they want to. The next AI plan reads those ratings. A low score means slower bpm, a lower level or smaller steps. A high score means faster bpm or the next level.

## The scale

Use the same five steps everywhere, with the label shown under or beside the stars:

| Stars | Label |
|---|---|
| 1 | Can't do it yet |
| 2 | Struggling |
| 3 | Getting there |
| 4 | Solid |
| 5 | Easy now |

One shared module defines this scale (type, labels, guard) and the plan and course UIs both import it. Suggested home: `src/features/progress/stars.ts`, since it sits outside both plan and course.

## Goals

1. **Plan exercises:** a 1–5 star rating replaces "Mark done" on `ExerciseCard`. Rating an exercise marks it done. Changing the stars changes the rating. Tapping the current star again clears the rating, which also un-does the exercise.
2. **Course sections:** the 5 stars replace every label: `know`, `like`, `often`, `warmup` and the preset and custom tags. The free-text note stays.
3. **AI prompt:** both kinds of rating go into the next-plan prompt, with a plain rule for how to use them.
4. **Storage shaped for a later API and database:** each rating is a small record with a target, stars and a date. Both stores keep the "one document behind a store interface" pattern that `PlanStore` already uses.

## Non-goals

- The current week does not change by itself. Ratings only shape the next AI plan the student generates.
- No numbered levels are added to more tools now. That's a possible follow-up (see the end).
- The questionnaire's concept ratings (`PlanAnswers.ratings`, already 1–5) stay as they are. Reusing the new labels there is a possible follow-up.
- No API or database yet. localStorage only.

## Anti-goals (count as failure even if it works)

- Finishing an exercise takes more than one tap. The stars *are* the done button, not an extra step after it.
- The course section ends up with stars plus leftover labels. The point is fewer labels.
- The prompt gets long with ratings. Keep each rating to one short line.

## Data

### Plan

`StoredPlan.done: Record<string, true>` becomes:

```ts
/** keyed `${dayIndex}:${exerciseIndex}`; a rated exercise is done */
rated: Record<string, { stars: Stars; at: string /* ISO datetime */ }>;
```

- "Done" is derived: an exercise is done when it has a rating. Every current reader of `done` (week view, day timer, progress counts, `weekReport`) switches to a helper such as `isDone(plan, di, ei)`.
- Migration in `localPlanStore` / `model/migrate.ts`: old `done` entries stay readable. A `done` entry with no rating counts as done with no stars. Don't invent stars for it. The prompt shows these as `[done]`, as it does today.
- `feedback` (the week's free text) stays.

### Course

`SectionNotes` becomes `{ stars?: Stars; at?: string; note: string }`.

- One-time migration of the stored notes (`musickit.course.notes.v2` → a new versioned key, the same pattern as the v2 move): `know` maps new→1, getting→2, solid→4, own→5. `like`, `often`, `warmup` and `tags` are dropped. Custom tags (`musickit.course.tags`) are no longer read, and the key can be removed.
- `Marks.tsx`, `MyNotes.tsx` and `CourseIndex.tsx` show and filter by stars instead of the old labels. How the index groups or filters by stars is the builder's call. Keep it simple.

### Toward an API

Both stores already save one document each. Keep that. Each rating is `{ stars, at }` under a stable key (plan id + `day:index`, or the section's `noteKey`), so a later API can turn each one into a row: `(user, targetKind, targetId, stars, ratedAt)`. Nothing in the UI should read localStorage directly. It goes through the store or hook.

## Prompt

In `model/prompt.ts`:

- `weekReport` writes each exercise as `[3★ Getting there] Title`, `[done]` (old, unrated) or `[skipped]`. Add the exercise's `level` and `focus` when present, so the AI knows *what* was rated, e.g. `[2★ Struggling] A minor pentatonic (beginner · boxes 1 & 2 at 70 bpm)`.
- A new prompt part lists the course sections the student rated: section title, stars and label, and the note if any. Newest first, capped at about 30 lines. Its rule: these show what the student knows from the lessons, so pitch exercises on those topics to match.
- Add one rule line next to the history: "Ratings: 1–2 stars means make it easier (slower bpm, a lower level, fewer notes, or split it into parts); 3 means keep the level and change one thing; 4–5 means move on (faster bpm or the next level)."
- Update `prompt.test.ts` and the Prompt Studio part kinds if a new part kind is added.

## UI notes

- The star control is one shared component used by both screens: five tappable stars with the label of the current or hovered star. It needs touch targets of 44px or more and works by keyboard (arrow keys, plus a radio-group role).
- On the plan card, the stars sit where "Mark done" is now. A rated card keeps today's done styling (emerald edge). The title strike-through can stay or go; builder's call.
- Teaching voice applies to every label and hint (see the `teaching-voice` skill).

## Calls I made (check these)

- The free-text note on course sections stays.
- Old course labels convert: new→1, getting there→2, solid→4, own it→5. Likes, flags and tags are dropped.
- Clearing a rating (tapping the same star again) un-does the exercise.
- Old plans' unrated `done` entries stay `[done]`, with no made-up stars.
- The course ratings list in the prompt is capped at about 30, newest first.
- The scale lives in a new neutral module, not in plan or course.

## Possible follow-ups

- Numbered levels on more tools, as interval-ears has, so the AI can say "level 3" instead of only setting bpm.
- Reuse the star labels in the questionnaire's concept ratings.
- The API and database behind `PlanStore` and the course notes store.
