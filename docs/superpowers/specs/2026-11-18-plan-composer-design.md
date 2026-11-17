# The plan composer (NEW7)

Date: 2026-11-18. Status: waiting for approval.

## Why

A player has had no way to get a plan since NEW15 took away both outside-AI routes: the questionnaire saves the answers
and says "New plans aren't ready yet". The library now holds 411 blocks and every one names the path steps it
practises (NEW17). The composer is the piece that turns a player's answers and ratings into a plan from those blocks,
with our own code and no AI, so a plan costs nothing and daily plans are unlimited.

## What it is

A player opens `/plan` and today's plan is there: one day, filled to their minutes a day, made the first time they
open the page that day. Tomorrow it is a new one, a bit different. Their star ratings move them along the path.

## Decided by the user

- Every plan is composed from library blocks by our own code. No AI anywhere, and no whole library plan used as it is.
- Self-serve players get one day at a time, made only when they open the plan page that day. A day never opened gets
  no plan, and missed days are not made up.
- Each day mixes things up a bit from the day before.
- Past days stay visible. No auto-cleanup.
- No allowance: daily plans are unlimited on any subscription (the texts are PricingFaq1).
- The composer picks by step, which is why NEW17 part 2 came first.
- A request with the player's own words is composed the same way for now. `new_plan_percent` stays unused.
- Teachers' students get seven days from the same composer (design: `2026-11-17-teacher-students-design.md`, built
  after this).
- **Not rating is different from a low rating.** An exercise the player opened and never rated says nothing: it does
  not come back the way a 1 to 3 star one does. Today starts fresh.
- **A player can ask for a different plan the same day.**
- **The timer is a motivational device, not a budget.** Minutes a day set how much a day's plan holds, nothing more.
  A player who wants to practise more can, and the next day is not shortened for it.
- **An assigned plan is at a different URL from the player's own plan.** `/plan` is the player's own daily plan. A
  plan someone gave them (claimed through Share plan, later a teacher's weekly plan) opens at its own address and
  runs beside the daily plan: neither replaces the other.
- A rating counts for the highest step its block names on each track and every step before it (already built,
  `reachIndex` in `outcome.ts`).

## Claude's calls (the user said "you decide")

Each of these can be changed without changing the rest.

### What the composer picks from

`reach()` (`plan/model/reach.ts`) with the player's questionnaire topics and `solidSteps(outcome)`. It marks every
step known, within reach or ahead. Nothing calls it today; the composer is its first caller.

`reach()` marks steps in every area, also ones the player didn't pick, so the composer filters: only tracks of the
player's areas. A topic of a chosen area that the player left unanswered counts as new, one step at a time, as the
path-slope design says.

### New and review

- Most of the day goes to within-reach steps that are not solid yet.
- One block is review, from a step the player has made solid; two when the day is 30 minutes or more. The review step
  is the solid one rated longest ago. A player with nothing solid yet gets no review block.
- Counted in blocks, not as a share of minutes: blocks are 3 to 10 minutes, so a share would round badly on a short day.

### Spread

One step per topic before any topic gets a second, so a guitar and voice player gets both every day. The topic that
opens the day rotates from day to day. Inside a topic, steps go lowest on the path first (`slope`), starting steps
before the rest, as `reach()` orders them.

### Which block for a step

1. A block on that step the player last rated 1 to 3 stars comes back first, but never two days running.
2. Otherwise a block the player has not rated, least practised across all players first, picked at random among the
   least used few so two players on one step don't always get the same block.
3. Otherwise (every block on the step rated 4 or 5, the step still not solid) the block rated longest ago.

"Had" means rated. An opened, unrated block stays among the new ones.

### Mixing from the day before

- The same block never appears two days running.
- A step stays in rotation until it is solid, so a player sees a step again with another block.
- The opening topic rotates.

That is the whole measure of "a bit of mixing": no number to tune.

### Minutes

Blocks are added until the player's minutes a day are filled. The day may run over by less than its last block's
minutes, never under by more than 5.

A new player has few steps within reach (`REACH_CAP`: one a topic at new, two at beginner) and may have 45 or 60
minutes, so the steps often run out first. Then, in this order:

1. The `open` steps: ahead only because their topic's cap is full, everything they need already known.
2. A second block on a step already in today's plan.
3. More review blocks than the one or two above.
4. A shorter day, with a line on the page that says the library has no more for their steps yet.

### A step with no block

The composer takes the nearest earlier step on that track that has one. A within-reach step with no block at all on
its track is skipped. Steps with no block stay listed in `library_coverage`; six are known today (`KNOWN_GAPS` in
`devtools/model/stepBlocks.test.ts`).

### Asking for another plan

- Exercises already rated today stay. The rest are replaced.
- Blocks from the plan the player turned down are not picked again that day.
- No limit on how often.
- The steps stay the same where another block exists: the player is asking for other exercises, not another level.
- This is also how a player practises more: with every exercise rated, asking again keeps them all and adds a fresh
  set under them. Tomorrow's plan is still filled to their minutes a day, whatever today ran to.

### The same answer twice

The composer is a pure function. Its random choices come from a seed made of the player, the date and how many times
they asked that day, so the same call gives the same plan and a test can pin one.

### Seven days

The composer makes one day from: reach, the player's rated blocks, the day before, the minutes. Seven days is the same
function seven times, each day given the days before it as its history, with no ratings arriving in between. That
call is part of this build (tested); the teacher screens are not.

### Past days

Every past day is kept. The page shows the last 14, newest first.

## What has to exist first

- **A block has no minutes, why or lessons in the library.** Those belong to the slot a block sits in
  (`practice_plan_blocks.minutes`; `why`, `learnBefore` and `exploreMore` are in no table). A composed plan needs them
  for a block on its own. The seed knows them for every block (plan files and block files). Store a block's default
  slot with it when the seed writes it. The same block can sit in several plans with other minutes: its own block
  file wins, else the first plan by id. The database is disposable before launch, so reseed; no move-over script.
- **A plan of one day.** `PlanConfig` is "always seven days" and `PLAN_DAYS` is 7. A daily plan is one day; the stored
  plan, the plan page, the day strip, the week report and the reminder all assume a week today.

- **Own plan and assigned plans apart.** `PlanState.current` is one plan today, and a claimed invite lands on
  `/plan?added=<planId>` as the current plan. A claimed or assigned plan needs its own place in the stored state and
  its own page, so the composer never overwrites it and it never stands in for today's plan. Claude's call: a player's
  own seven-day plan from before this build (there should be none, players had no route to one) goes to past plans.

## Goals

- A new player finishes the questionnaire and has a plan on the next screen.
- A returning player opens `/plan` and today's plan is there without pressing anything.
- Ratings change what tomorrow holds: a solid step leaves the new part and joins review; a low rating brings the
  block back.
- A plan is never empty without a reason on the screen (AGENTS: always surface errors).

## Not in this build

- Any AI: writing a block, steering by the player's words, `new_plan_percent`.
- Teacher screens, sliders and the claim link (their own design).
- The follow-up ("Review this week"): daily plans get none (NEW18).
- New blocks for the six steps that have none (NEW10).
- Choice apart from the block (ChoiceSplit).
- Pricing, FAQ and terms texts (PricingFaq1).

## What would make it a failure

- A day that repeats yesterday's.
- A singer handed guitar blocks, or a block above the steps within the player's reach.
- An unrated exercise treated as a failed one.
- A player with a thin part of the library getting an empty or two-minute day with no word why.
- Two answers on one screen: a level shown from one rule while the composer picks by another.

## Left to the builder

- Where the composer runs. It needs the library (all players' use totals) and the player's ratings, so the server;
  the pure picking function lives in `plan/model` with tests, a route gathers its input. NEW8's notes apply: narrow
  the use totals to the candidate blocks, name only blocks the app owns, count nothing from another player's private
  blocks.
- How a day is stored: one stored plan per day, or days added to one running plan. Ratings key on the slot
  (`${dayIndex}:${exerciseIndex}`) and on the slot `id`; keep both working for old plans or reset them (ask before a
  reset).
- What the day's title and theme say, the "another plan" control and its wording, the empty and error states: written
  with `design:ux-copy` and "Words about the app".
- The address of an assigned plan (`/plan/<planId>` is one way), how a player gets from `/plan` to the plans they
  were given, and where the invite page sends them after a claim.
- What the flow's last screen becomes now that plans are ready, and the `SavedNotice`.
- The reminder: it points at `/plan`; a plan is made when the page opens.
