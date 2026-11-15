# Blocks as a library, and a progress tracker (design)

Status: draft, for approval.

## Why

Today a rating points at an exercise id that is made fresh every time a plan starts (`withExerciseIds(…, fresh)`), and
the exercise's tags (area, topic, concepts, level) live on the plan's copy of it (`ExerciseMeta`). So the app cannot
say "this student has done this exercise before", and the progress log is a pile of rows with copied tags. Time spent
(`plan_day_times`) is keyed the same way.

The user wants:

- **A block is its own thing.** Blocks are kept in one library; plans are made of blocks; what is rated is the block.
  A block carries its difficulty (level) and its tags, so progress can be added up across plans.
- **One shared library**, "more neat, and uses our idea of reusing" (`practice_plans` already hands one plan to many
  students; reused plans should reuse blocks).
- **Plans keep their days**, and at the end of a plan the student says whether they liked it. A low rating asks "Can
  you tell us why?". This is for the team, to look at plans and decide which to keep handing out.
- **A progress tracker**: by default a day streak; opening it shows progress across the categories (the questionnaire's
  topics and the finer concepts under them), with more on hover, and time spent. "Tags + progressing into different
  areas + self-assessment produces the outcome": progress of tags over time, from easier to harder, perhaps a radar
  plot. For now it may just list all the underlying categories.
- **`/dev/questionnaire`**: go through the questionnaire and see, live, how each answer moves the categories.
- **/dev pages show bare data**, no charts.

## What exists (read before planning)

- Categories: 3 areas (`model/concepts.ts` `AREAS`) → 18 questionnaire topics, 6 per area (`intake/topics.ts`) →
  concepts, each with an area, a level and one topic (`model/concepts.ts` `CONCEPTS`).
- Levels: `new | beginner | intermediate | advanced` (`model/types.ts`), 0–3. A questionnaire answer is a rung 0–3 per
  topic (`PlanAnswers.topics`); `levelOf(answers, area)` is the rounded mean; `conceptsFor(area, level)` is what the
  prompt offers.
- `Block` (title, choice, cells) and `ExerciseMeta` (minutes, why, level, area, tags, topic, concepts, links) in
  `model/types.ts`; `PlanExercise = Block & ExerciseMeta & { id }`.
- The plan is one JSON document per player (`user_documents`, kind `plan`; `PlanStore` with server, memory and local
  stores). Ratings: `StoredPlan.rated` keyed `day:exercise`, plus the progress log (`features/progress`,
  `progress_entries`, one row per exercise id). Time: `plan_day_times.spent`, seconds by exercise id.
- `practice_plans` (the reuse library, seeded from compare-models). Handing a library plan to a student is not built
  yet; only its cost model is.
- Rules that bind every part: `AGENTS.md` (words on the screen through the skills; the app has no points and no score),
  `src/features/plan/CLAUDE.md`, `src/features/progress/README.md`, `src/features/userData`.

## Goals

1. `/dev/questionnaire` (local only): the questionnaire on one side, bare data on the other, updated on every answer.
2. A shared block library: every block a plan uses is a row, found by its content; plans point at blocks; ratings and
   time resolve to blocks.
3. A plan review at the end of a plan: stars, and "Can you tell us why?" when low; stored where the team can read all
   of them.
4. A progress outcome per concept, topic and area, worked out from block tags, ratings over time and the student's own
   questionnaire answers; and time per category.
5. The progress tracker for the player (streak, then the categories), and `/dev/progress` with the same numbers bare.

## Non-goals

- The AI does not see block ids or pick blocks from the library. The prompt, `PROMPT_VERSION`, the examples and the
  teaching documents do not change.
- Handing library plans to students (the autoplan reuse) is not built here. The review only records which library plan
  a stored plan came from, once that exists.
- Teacher notes are blocks too, but they are not rated and do not go into the library in this work.
- Course section ratings (`features/course/ratings.ts`) do not feed the outcome yet.
- No team-facing analytics UI beyond a bare `/dev` list of plan reviews.

## Anti-goals (would be a failure even if it works)

- **No points, no score, no celebrating.** The player sees levels by name ("Beginner", "Intermediate") and plain
  facts ("rated 4 times, last on 12 Nov"), never a number out of 100, a percentage of mastery or a "great job". The
  streak is a count of days, said plainly.
- A student's edited block showing up in someone else's plan. Blocks are private to their owner until switched on for
  reuse.
- An old rating changing meaning because a block was edited. Blocks never change once stored.
- Losing the existing progress log, ratings or time while moving over.

## The design

### Part A: /dev/questionnaire

A page in `src/app/dev/(local)/questionnaire` (production answers 404). Left: the real questionnaire screens from
`intake/ui` (areas, one screen per area's topics, minutes), driven by local state, saving nothing. Right, updated on
every change, as plain tables:

- per topic: the rung picked (or "unanswered") and the level it stands for;
- per area: `levelOf`, and every concept of the area with its level and topic, marked in or out of
  `conceptsFor(area, level)`;
- the example plan and exercises `selectExamples` would put in the prompt;
- the starting outcome (Part C) these answers give: per topic and per area, the numbers the tracker would start from.

A button resets the answers. It is a dev tool: no copy skills needed beyond plain labels.

### Part B: blocks, plans, reviews

**The `blocks` table** (new, Drizzle migration):

- `id`: a hash of the block's canonical JSON (content and tags, below). Same content and tags → same id. Computed by
  one pure function used in the browser and on the server; at least 128 bits; the exact hash is the builder's call.
- `content` (jsonb): the `Block` (title, choice, cells).
- tags, as columns so they can be queried: `area`, `topic`, `concepts` (text[]), `level`, `tags` (text[], the kind
  tags from `EXERCISE_TAGS`). The level is the block's difficulty.
- `parent_id`: the block this one was edited from, if any.
- `created_at`.
- Rows are only ever inserted (`on conflict do nothing`), never updated, never deleted. A block's content says nothing
  about who wrote it, so two people with the same content share one row and nothing private leaks.

**Who has a block: the `block_owners` table** (*my call*, so a shared row never belongs to one person): `user_id`
(null for blocks the app seeded), `block_id`, `source` (`ai`, `edit`, `seed`, `example`), `enabled_for_reuse` (default
false), `created_at`; one row per owner and block. Deleting an account deletes that person's `block_owners` rows only;
the block stays, so nobody else's plan, ratings or `parent_id` link breaks. A block is offered for reuse when any owner
row has it switched on.

**How many rows.** A block is about 2–4 KB. A student who gets a newly written plan every week adds about 25 blocks a
week, about 4 MB a year, and the same number of owner rows. A reused library plan adds no blocks, only owner rows, and
most students are meant to get reused plans (`plans.new_plan_percent`). So the library grows with the AI-written plans
that are paid for. Saving the plan document again adds nothing (`on conflict do nothing`). If it ever needs trimming,
the rows that can go are blocks no one rated, owns or reuses; that clean-up is not part of this work.

**Plans point at blocks.** `PlanExercise` gets `blockId`. The exercise's `id` stays as it is: the slot's id, fresh per
plan run, which `done`, `rated` and the day timer keep using. A slot is a block id plus what only this week knows:
minutes, why, links. *My call:* the plan document keeps a copy of the block's content and tags next to `blockId`
instead of only the id. Blocks never change, so the copy is always the block; and this keeps the memory and local
stores, the demo plans, shares and `sanitiseState` working without a library lookup. The library is the shared record;
the document stays self-contained.

- `blockId` is filled the way `withExerciseIds` fills ids: when a plan starts, when a stored plan is loaded without
  them, and for each exercise the day editor changes (`editDay` already makes a changed exercise a new one; it now
  also gets the new block's id, with `parent_id` the old one).
- The server inserts a plan's blocks when it saves the plan document (the server store's save of kind `plan`), with an
  owner row for the player, source `ai` (from a paste) or `edit` (from the day editor). It recomputes the ids itself
  and does not trust the client's.
- The id covers the block's content and tags only. Changing just minutes, why or links in the day editor keeps the
  block id (the slot still gets a new id and loses its stars, as `editDay` does today).
- The document grows only by one `blockId` per exercise: the content and tags are already in it today.
- A seed script puts the example exercises and the `practice_plans` plans' blocks in the library (owner rows with no
  user, `enabled_for_reuse` true for the library plans' blocks).

**Ratings and time resolve to blocks.** `progress_entries` gets a nullable, indexed `block_id`; `ProgressEntry` gets
`blockId`. A row stays one per slot (`exercise_id`), as today: rating again in the same slot corrects it; rating the
same block in a later plan is a new row, and that is the history. Time stays keyed by slot id in `plan_day_times`,
and each day's record also carries `blocks: { [slotId]: blockId }` for the slots it has seconds for (*my call*), written
with every timer save. The plan history drops old plans to stay under its size cap, so time must not need the plan to
find its block; ratings already don't, through `progress_entries.block_id`. The record also carries `on: { [localDate]: seconds }`, the seconds the timer counted on each calendar date (*my call*): the timer runs on whichever day tab is open, so a plan day is not the date it was practised. Both fields are in the one Part B migration.

**Moving over.** Stored plans get `blockId`s lazily on load (as above). A one-off script fills `progress_entries.block_id`
and the day records' `blocks` from each player's plan document (slot id → block id) and inserts those blocks with owner
rows; rows whose plan is gone keep `null` and are counted from their copied tags (a time record without a block is left
out of time per category). Nothing is deleted. Existing players get a first `answersHistory` entry of their stored
answers, dated their earliest plan's `startedOn`.

**Plan review.** When a plan's week is over, the first screen of **Plan next week** asks how the plan was: the same five
stars component, and under 1 or 2 stars a text box, "Can you tell us why?". Optional; skipping it is fine. It is
separate from the block stars (which say how hard each exercise was) and from the existing "how did it go" words for
the AI. Stored on the plan (`StoredPlan.review: { stars, why?, at }`) and in a new `plan_reviews` table (user, stored
plan id, library plan id if the plan came from `practice_plans`, stars, why, at; one row per user and plan, replaced on
change). A student who never opens Plan next week isn't asked; the plan is simply not reviewed. A bare `/dev/plan-reviews` (local) lists them, newest first, with the plan's title. The wording around the stars
is written with `design:ux-copy` and `teaching-voice` when built; "Can you tell us why?" is the user's.

### Part C: the outcome and the tracker

**Self-assessment over time.** `PlanState` gets `answersHistory: { at, topics }[]`, one entry appended each time the
questionnaire is finished (Start and Change my answers). The first entry is the student's starting point; the latest
is their current view of themselves. Today's `answers` stays as is.

**The outcome**, one pure function (`features/progress/outcome.ts` or similar) from the player's plans (current and
history), progress entries, day times and answers history, so it works with every store and in tests. *My calls, all
in that one function so they can be tuned:*

- **Difficulty comes from concepts, not the block's `level` tag.** The prompt tells the AI that `level` is the student's
  level in the whole area, so it says who the block was written for, not how hard it is for this topic. Each concept in
  `CONCEPTS` has its own level, and that is what moves the outcome. The block's `level` is kept and shown, but the
  outcome doesn't use it.
- A block is **solid** for the student when its latest rating is 4 or 5 stars ("Easy now" end of the scale).
- A concept is **solid** when the latest-rated block tagged with it is solid; **working on** when it has ratings but
  isn't solid; **not yet** when it has none. Per concept: that state, its own level, how many ratings, the last date,
  the time spent.
- **Topic score** on the 0–3 level scale: start from the latest questionnaire rung for the topic (with no answer,
  "new" (0) once the topic has any rating; null with neither); a level counts as reached from practice only when every
  concept of the topic at that level is solid (a level with no concepts in the topic doesn't block the climb); the level
  reached is the higher of the two; then add the share of the topic's concepts one level up that are solid, as a
  fraction toward the next level. So moving from easier to harder
  concepts moves the number, and the student's own answer is the floor. A block with no concepts counts toward time
  and ratings but not the score.
- **Area**: the six topic scores (the radar's axes).
- **Over time**: the same function run as of any date (ratings and answers up to that date), so the tracker can show
  start vs now, or week by week.
- **Time**: seconds from the day timer, mapped slot → block; a block's time counts in full toward each of its concepts
  and once toward its topic.
- **Streak**: consecutive local days, ending today or yesterday, on which the student rated a block or the day timer
  counted at least 5 minutes that date (`DayTime.on`; a record without it is dated its plan's `startedOn` + day).

**The player's tracker.** The streak, small, where the player sees it on `/plan` (and, if it fits, in the header).
Opening it shows the areas the student practises; for each, the six topics with their level by name and the concepts
under them, solid / working on / not yet, with ratings count, last date and time on hover or tap. A radar per area
(start vs now) is welcome if it reads well; the list of all categories alone is acceptable for the first version. All
words through the skills in `AGENTS.md`; levels by name, never a score.

**`/dev/progress`** (live group, the signed-in player's own data): the outcome's inputs and outputs as tables, per
concept, per topic, per area, the streak days and time. No charts.

## Order of work

Three plans, each landed on main on its own:

1. Part A, `/dev/questionnaire` (it needs the topic-score function from Part C's start-from-answers half; build that
   piece of `outcome.ts` here, answers only).
2. Part B, blocks, block ids, the move-over script, the plan review.
3. Part C, the rest of the outcome, `/dev/progress`, the player's tracker.

## Left to the builder

- The hash function and the canonical JSON rules (key order, dropping undefined), as long as browser and server agree
  and tests hold them together.
- Table and column names, indexes, the API routes for reviews.
- Where exactly the streak sits and the tracker's layout, within the anti-goals; show it on the dev server before
  calling it done.
- Whether `/dev/plan-reviews` is its own page or a section of an existing dev page.
