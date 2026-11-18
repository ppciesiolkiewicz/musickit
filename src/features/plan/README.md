# Practice plan

`/plan`: the player's own daily practice plan. A plan someone shared with the player opens at its own address,
`/plan/given/<planId>` (`GivenPlan.tsx`), beside it: neither replaces the other. Each day the page is opened, the server composes that day's plan from
library blocks (NEW7, no AI: `model/compose.ts`, `server/composeToday.ts`, the route `api/me/plan/compose`) and the page
stores it. Players have no outside-AI route to a plan (NEW15: no prompt to copy into an AI chat, no AI extension writing
it). The six demo plans are at `/demo`. The prompt (`model/prompt.ts`) is used by agents and the devtools only.

## The player's path

1. **Start** opens one step modal (`ui/PlanFlow.tsx`): the first questionnaire (`intake/`, see its
   README): what you play (Guitar, Voice, Theory & ear), one screen per chosen area with its six topics, each answered by
   picking the one line of four that sounds like you (or left unanswered), your voice (with *Find my range*) if Voice is
   chosen, minutes a day, notes and styles. The last screen, *Your first plan*, says that
   Save my answers saves them and attunr puts today's plan together, and that a new plan comes each day the Practice plan page is
   opened. Every screen has the same fixed height (the body scrolls inside), so Back and Next never move. **Save my
   answers** finishes: `onAnswers` stores the answers and remembers them with the date (`answersHistory`,
   `recordAnswers`); the page then shows the plan being made (the next step), with no notice in between. A saved flow
   whose step is past the last screen (one saved with the two prompt steps it had before) opens on the last screen. A flow saved by the
   week review that is gone (mode `"next"`) is not reopened. The flow's
   dialog is StepModal `large`. The prompt's debug lists and the paste box (`DebugList`, `PasteBox` in
   `ui/PromptAndPaste.tsx`) live on /dev/prompt only. The register and feature check for the browser's AI (WebMCP) live
   in `@/lib/webmcp`.
   **Exercise tools on every page** (`ui/AgentExerciseTools.tsx`, mounted in `PageShell`): with WebMCP the browser's AI
   also gets `list_exercise_tools` (the prompt's own `toolInterface()`), `show_exercise_tool({ tool })` (checked with
   `parseToolDiag`, opened in a dialog, `ui/AgentToolModal.tsx`; the AI reads back what was changed or why not) and
   `close_exercise_tool`. Without WebMCP nothing is loaded; the parser and views load on first call.
2. **Today's plan** (`ui/DayPlan.tsx`, the request in `ui/useTodayPlan.ts` and `store/composeClient.ts`). With answers
   and no own plan for today (`ownDay`), the page flushes the store (`PlanStore.flush`), asks the route once
   (`requestDay({ date, another: false })`, 15 s timeout, never throws) and stores the answer (`startDay`, with the title
   and theme from `model/today.ts` `dayWords`: the date, "Wednesday 18 November", and the topics the exercises practise).
   It runs once per page view and date. The date follows the clock (`useClockDate`: `localDate()` read every minute and
   when the page is shown again, the one date `PlanApp` uses for the streak too): past midnight the page moves to the new
   day like a fresh visit (yesterday's plan goes to Past days and today's is asked for), but not while the day editor is
   open or a request is out; then it moves when that ends (`pageDate`). What the page shows is `todayView` (`model/today.ts`, tested): while
   the request is out it says "attunr is putting today's plan together…", never an empty plan and never yesterday's in
   its place; asked with nothing out and no answer it shows the failed state with Try again, so it never hangs. What an
   answer does is `applyFirst` / `applyAnother` (same file); the hook only holds the requests, and a thrown flush or
   update is a failed request. When it can't be made, `TodayStatus` says so where
   the plan would be, by the route's `code` (never its `error` text): `no-blocks` "No plan today" (not retried; the line
   points at Change my answers, beside it); `offline` and `failed` with **Try again**; `bad-date` with **Reload page**;
   `logged-out` (a 401) with **Log in**, a link to the login page that comes back to `/plan`; `account-changed` (another
   account logged in since the page loaded: `requestDay` sends `X-Account-Id`, `accountHeaders`) with **Reload page**;
   `later` (a plan of a later date already running, from another tab or device: this device's date is behind the plan's)
   with its own line, saying to check the device's date and time, and no control, since a reload asks for the same date again: the plan shows once the device's date
   reaches that day (the page follows the clock); `no-answers` (impossible after the flush) as `failed`. Get another plan
   says each of these in its own line under the header, the plan staying as it is (`logged-out` with the same **Log in**). **Change my answers** (in the header, and on "No plan today") opens the first questionnaire again with
   the stored answers; its last screen, with today's plan there, says the plan stays and Get another plan makes one from
   the new answers, and so does a notice once saved (`AnswersSaved`). Saved with no plan for today (it failed), the page
   asks again. The plan: "Today's plan" with the streak, the date as the title, the topics under it, the
   reminder, Labels on a phone, **Share plan** and **Get another plan**, then the day (`DayPanel` from `WeekView.tsx`, no
   day strip, no "Day N of M": the exercise cards with stars and the day timer, named "Today"; Edit as on a week's day).
   **Get another plan** flushes, asks with `another: true` and stores the answer with `anotherDay` (rated exercises stay,
   with their ratings and timer seconds, also one rated while the request was out, which the server didn't know of; the
   rest are replaced and turned down for the day). While it is out the button keeps focus (`aria-disabled`, presses
   ignored) and Edit can't be pressed; while the day editor is open the button is `aria-disabled` the same way (a line
   under the controls, which the button names with `aria-describedby`, says to press Done or Cancel first), as a new set would drop the editor's draft. The "Your answers are saved" notice
   goes once Get another plan answers (a new set, or no other exercises); the new set starts with the timer stopped (the day is keyed by the try). The line
   under the header is a live region, there before its text. When the answer has no new
   pick (`hasNewPicks`: only today's rated exercises came back, or a 409 `no-blocks`) the plan stays and a line says there
   are no other exercises for today's steps; a failed request says the plan stays and what to do. A short day
   (`composed.short`) has a line under the exercises: shorter than the time set for a day, the library has no more for
   today's steps yet. **Past days** (`ui/PastDays.tsx`, `pastDays`): the composed days of `history`, and a composed `current`
   from before today (today's plan didn't come), newest first, the last 14, each with its date, topics and how many
   exercises were rated; **Show exercises** opens it read-only (`DayPanel readOnly`: no stars, no timer, no tour hooks, its
   own card addresses). There is no week review, Start anew or list of earlier plans to start again.
   **Plans shared with you** (`ui/GivenPlans.tsx`): the given plans (`PlanState.given`, newest first, without the weeks a teacher made), each its title (`givenTitle`: a shared composed day is "Shared plan", not the sharer's date),
   how many days and when it started ("7 days · started 16 November": `daysLabel`, `dateLabel`), a link to `/plan/given/<id>`; under today's plan (above Past days), under the line
   while it is made, and above the intro for a player with no answers yet (a plan can be claimed before the questions).
   A plan the player removed (`hidden`) is left out. Nothing when there are none. Who shared it ends the line ("shared by Ann", `sharedBy`: the sharer's account name when it was claimed; `claimInvite`'s `nameOf`).
   On a shared plan's page, **Remove from list** (`hideGiven`) takes it off this list and goes back to `/plan`; the plan stays in `given`, so its ratings still count and its page still opens, where a line says it was removed and **Put back on the list** returns it.
   **A seven-day plan** (`ui/WeekView.tsx`; the dev prompt studio's preview, a given plan's page): seven day buttons; any day can be opened, days ahead are dashed and marked "coming up". The day's
   exercises are colour-coded cards (a hue per position): title in the display face, its hashtags (area, level, kind) small
   under it, its cells (a section shows its heading, its minutes and the chips of its choice), why, and five stars, "How did it go?" (1 Can't do it yet, 3 Same again next time, 5 Easy now: the
   scale in `src/features/progress/stars.ts`) and a line under them saying what each rating does to the next plan, in an amber box until the exercise is rated. Rating an exercise marks it done; tapping the same star again clears both
   (`ratePlan`; ratings in `StoredPlan.rated`, done ticks still in `StoredPlan.done`, which older plans only have).
   There is no review of a whole plan: the exercise stars are the only rating. A `review` key on a plan in an older document is dropped by `sanitiseState` (`state.ts`).
   Every rating also goes to the **progress log** (`src/features/progress`, one row per rated exercise, by exercise id),
   which outlives the plan history.
   **One floating day timer** (`ui/DayTimer.tsx`, bottom right) counts down the whole day's minutes: it starts by itself
   for the day shown on page load, can be paused, resumed and reset, and chimes at zero; it then goes on counting (Play starts it again once the day's time is done), so the exercise in view keeps getting time. It names the exercise whose card is
   in view (the one across the middle of the screen, or the last one at the end of the page; `useInView` in `WeekView`),
   lifts that card a little (no tag: the timer is a guide), and while it runs adds each second to that exercise's spent time
   (by exercise id, `model/planTime.ts`). Each card shows that time
   of its planned time ("2 min / 5 min", whole minutes) over a thin bar: sky while it fills, green at the planned time, a brighter
   glowing green past 1.5×, and a star at 2×; hovering or tapping it explains the numbers. The card repeats its bar, smaller and muted, in its bottom-right corner (`SpentBar`); while the timer counts an exercise, a glow behind its time and timer icon fades in, slowly breathes, and dims to half after 10 s. The card the timer is counting glows blue, fading in over 1.5 s and growing with the time spent; a card whose planned time is reached turns green with a soft glow, and flashes brighter when the timer reaches it. /dev/data lists the spent times. On a phone it is one short row: ring,
   time left, the exercise's own time and number, the buttons side by side. Its used seconds and the spent seconds are kept
   apart from the plan, one `DayTime` record per plan and day (`PlanStore.loadTimes` / `saveTime`, `usePlanTimes`; on the
   server the `plan_day_times` table, so a save is a few bytes), saved once a minute while it runs, on pause, when the tab hides, when the day
   is left and at zero, so a reload or a later visit picks up where it stopped. It counts only while the tab is shown and its window has focus: a hidden tab or another window in front pauses it, and it starts again when the player is back. An exercise changed in the day editor gets a new id, so its
   old seconds stop counting. /plan waits for the records before it draws the timer, so it never starts from 0 over saved
   seconds. There is no per-exercise countdown, and resetting the day's timer keeps the spent times.
   No settings column: the exercises set their own keys and always count from the scale's root (`FixedLabelRoot`), so the
   only setting is the Labels dropdown, floating over the day timer in the bottom-right corner; on a phone it sits in the
   header row with the reminder instead.
3. **Tools in the section**: each exercise carries 1–2 `tools`, set up by the AI, with nothing to configure: a scale's
   boxes on the neck, chord shapes, a staff with live pitch for singing, a folded play-along band (one Play for only the
   chosen click / drone / drums / bass), or the notes / ear games with their settings hidden. Links sit in two slots:
   "Learn before" at the top (prerequisite lessons) and "Explore more" at the bottom (going deeper), each shown as
   "Learn <the page's name>" and opening in a new tab. On a phone a link shows only the page's short name (`linkLabel(…,
   true)`: a course section's `short` title).
4. **No week review on the page.** The week flow (*Review this week*, the plan review screen, *Start anew*, earlier
   plans started again) is gone: a daily plan has no week, and nothing on `/plan` or a given plan's page opens it. A stored
   plan can still carry notes on its week (`StoredPlan.feedback`). The "next" prompt (built by agents and /dev/prompt) carries a week's exercises grouped by topic with
   their stars or "skipped", the notes, the
   **AI's own progress summary** from the last plan, and the course sections the student rated
   (`features/course/ratings.ts`). The summary is the AI's memory of the student: it returns one with every plan
   (`PlanConfig.progress`), the app stores it with the plan and never shows it (only `/dev/data` does), and the next
   prompt sends it back in place of the earlier weeks. The prompt uses the newest summary any stored plan has (a reply
   may come without one), with the weeks practised since it in full; with no summary at all, the two weeks before this
   one go in full.
5. **Share plan** (`SharePlan` in `ui/planPieces.tsx`), in today's plan's header and in a given plan's, opens the share popover (`SharePopover`, `teachers/studio`, `kind="plan"`, `itemId` the plan's id). A teacher or owner (`can("sharePlan")`) gets **Share**: it first flushes the plan store (`PlanStore.flush`) and refuses when the latest change hasn't landed, then `POST /api/shares { kind: "plan", planId }` makes an invite of that stored plan (`{ config }` only): today's own plan on `/plan`, the given plan on its page; any other id is 404 `not-found` ("This plan isn't in your plans any more, so the plan wasn't shared. Reload the page, then press Share."). The live invites are listed by date with **Stop** (not as links: opening one would add a copy to the sharer's own plans). Anyone else sees **Upgrade to Teacher account**, a link to `/kickstarter`, under one line on what a teacher account does.
6. **An invite** (`/plan/invite/<id>`, `src/app/plan/invite/[id]/page.tsx` + `ui/InviteClaim.tsx`): not public; a signed-out visitor goes to `/login?next=/plan/invite/<id>`, which then reads "Create your account or log in to view" (`loginWords`, `account/loginGuard.ts`). Signed in, the page `POST`s `/api/shares/<id>/claim` (`claimInvite`: a copy, `from` the invite, first in the given plans, `PlanState.given`, whatever the current plan is; a second claim adds nothing) and does a full page load of the copy's own page, `/plan/given/<planId>` (`givenHref`), so the per-session plan store reads the new document. The claim request has a 15 s timeout; one that doesn't answer shows "The plan was not added" with Try again. A stopped invite (410) or an unknown one (404) shows a notice; a lost session (401) goes to log in and comes back.
   **A given plan's page** (`/plan/given/<planId>`, `src/app/plan/given/[id]/page.tsx` + `GivenPlan.tsx`): not public, headed "Shared plan" ("Practice plan" for a week a teacher made, `givenPageTitle`, drawn in the browser by `GivenPlanTitle`; the tab says "Practice plan" for both). Its header says "Day N of 7 · started 16 November" (past its last day, "7 days · started 16 November"), the plan's title and summary, Labels on a phone and Share plan (not on a teacher's week); then the week (`WeekView`: day strip, ratings, the day timer, Edit). A plan of one day (a day shared from `/plan`, a composed day) is drawn as one day, with the `DayPanel` `/plan` uses: no day strip and no "Day 1 of 1"; its header says "1 day · started 18 November" (the date the player claimed it), its title is "Shared plan" when it is a composed day's date title (`givenTitle`, `isDayTitle`: the sharer's date would be a second, wrong date) and its topics stand under it; its stars and timer work as on a longer plan (the timer starts by itself only on its date). Ratings, ticks, timer seconds and edits are stored on that plan in `given` (`updateGiven`), never on `current`, and a rating also goes to the progress log (`rateHandler`, shared with `/plan`), so it counts for the player's steps. The plan is never composed over and can't be made the player's own; there is no week report or Start anew on it. A shared plan is over once its last day's date has passed (`givenToday`; a fully rated last day stays the open day until then). Over, every day stays open, no day is marked "Today" and no timer starts by itself (`WeekView ended`). An id not in `given` shows "This shared plan isn't in your plans" with **Open Practice plan**, a link to `/plan`. Removing a given plan isn't built.
7. **The day streak and the progress tracker** (`ui/tracker/`): beside "Today's plan" in the plan's header (and above the intro when there are earlier plans, and above the line while
   today's plan is made or why it isn't there) a small button says the streak plainly, "3 days in a row"
   (`StreakButton`; its title says what counts: a rating, or 5 minutes on the day timer). PlanApp feeds `outcome()`
   (`model/outcome.ts`) every plan (`storedPlans`: current, history and given, as the server's `playerProgress`), the progress log, `answersHistory` and every plan's timer records
   (`useAllPlanTimes`) with the running plan's live records laid over them (`mergeTimes`), so a rating or a timer save
   today counts without a reload; the button shows only once the log and the records have loaded (a refused read leaves
   it out and the page works). Pressing it opens **Your progress** (`ProgressTracker` in a `Modal`): each area the
   student chose or practised (`shownAreas`), its six topics with the level by name (`LEVELS` labels, "Beginner,
   starting on Intermediate" once something at the next level is solid, `topicLevel`), and each concept as "Solid",
   "Working on" or "Not yet", with an (i) (`InfoTip`, hover or tap) for how often it was rated, when last and the minutes
   practised. No score, number out of 3 or percentage is shown; `/dev/progress` has the raw numbers.
8. **Reminders**: a daily browser notification at a chosen time while any attunr tab is open; clicking it opens `/plan`.
   It is due (`reminderDue`) once the questions are answered, past the time, not shown yet today, and while today's own
   plan is not made yet or not finished; a plan shared with the player plays no part (a teacher's student, `Account.taught` read with `useAccount()` and passed in, never guessed from the document: today's day of the teacher's week, "Today is day 3 of 7 of your plan."; nothing is due with no week covering today). It reads "Today's plan: <topics>", or before the
   plan is made "Open the Practice plan page, and attunr puts today's plan together." (`reminderBody`). Switching it on shows one notification straight away, so the player sees one get through; a permission taken back in the browser shows as blocked.
9. **A teacher's student** (`Account.taught`) has no questionnaire and no composed day: `/plan` draws their teacher's week covering today, live as on its own page (stars, ticks, the day timer; Labels and Remind me at in its header), else "Your plan starts on Monday 23 November." for a week still to come, else the newest ended week under "Your teacher hasn't made a new plan yet…", else one line that there is no plan yet; their earlier weeks are listed under it (**Earlier plans**, in `newestWeekFirst` order), each a link to `/plan/given/<id>`, or, for a week the teacher replaced (in the history), a plain row ending "Replaced by a new plan"; then the plans someone shared with them (**Plans shared with you**, `GivenPlans`, teacher weeks left out). The page's intro is drawn in the browser (`ui/PlanIntro.tsx`): the player's words, or for a teacher's student "The practice plans your teacher makes for you…", hidden until the account is known. The page tour walks only the steps on the page, which for them are the week, the day and an exercise. `useTodayPlan` is `off` (no request), and `POST /api/me/plan/compose` (`server/composeRoute.ts`, tested) answers 409 `taught`, which a stale page words with Reload page.

## Demos

`/demo` lists every demo in `DEMO_PLANS` as cards (`demoCards()`: level, minutes, the week's title and summary, day themes), grouped by area and easiest first, then a Beta card that links to the Practice plan at `/plan`, then the teacher notes. `/demo/guitar-beginner`, `/demo/voice-beginner`, `/demo/guitar-intermediate`, `/demo/voice-intermediate`, `/demo/guitar-advanced` and `/demo/voice-advanced` each open a hand-tuned seed plan from `src/features/library/seed/plans` (`demos.ts`, `DemoPlan.tsx`; the level each card shows is in `DEMO_PLANS`, its area and minutes in the plan's `answers`) from day 1, kept in memory only (a swapped-in `PlanStore`), so a pitch can link to a finished plan. Not indexed; canonical is `/plan`.

## Code map

```
model/            pure, no React; tested in model/plan.test.ts
  types.ts        PlanAnswers, PlanConfig (what the AI returns), StoredPlan (`from`: the invite a claimed copy came from; `hidden`: a shared plan the player took off the list; `sharedBy`: the sharer's name at claim time; `composed`: on a composed one-day plan, its try of the day, the block ids turned down today and whether it is short), AnswersEntry, PlanState (the stored document: `current`, the player's own plan, never a given one; `history`, earlier plans, newest first, at most 60; `given`, plans claimed from an invite, newest first), PLAN_DAYS (7, the days of a parsed plan), planDays(plan) (how long a stored plan is: 1 for a composed day)
  questions.ts    LEVELS (what an exercise is pitched at), labelOf()
  catalogue.ts    the attunr pages a plan may link to; checkLink() keeps only those; linkLabel() names a link's page
  tools.ts        THE one file for what an exercise is made of, like an MCP server: TOOLS (one parse per learning component; description and props come from the components' COMPONENT_DOCS), the cell kinds, the choice, tags, link resources; the prompt's interface is generated from it; legacySections reads older plans
  hashtags.ts     readTitle(): the hashtags at the end of a title as area, level and kind tags; hashtagLine(): them written back
  concepts.ts     the fine concepts exercises are tagged with, per area and level; each belongs to one questionnaire topic
  exerciseIds.ts  randomId(), withExerciseIds(): an id on every exercise of a plan; withBlockIds(): every exercise's `blockId` (the hash of its content and tags), always recomputed, a stray `parentBlockId` dropped
  blockId.ts      blockKeyOf(): what a block is for its id (content and tags, `steps` in place of `level` when it names steps; never minutes, why, links or slot ids); blockIdOf(): 128 bits of the SHA-256 of its canonical JSON (`lib/sha256.ts`, the same in browser and server); withoutCellIds(), canonicalJson(), isBlockId()
  libraryBlocks.ts libraryBlocksOf(): a plan document's blocks for the library (one per block id, current plan first; `edit` with its parent when edited, else `ai`), ids worked out here; slotBlocks(): slot id -> block id (no prototype, so a slot id like `constructor` is an ordinary key; test with `Object.hasOwn`)
  progressLog.ts  entryFor(), backfill(): a plan's ratings as progress-log rows
  answersHistory.ts cleanAnswersHistory(), movedOver(), recordAnswers(): every finished questionnaire kept with its date (`PlanState.answersHistory`, oldest first, at most 100)
  outcome.ts      startOutcome(), TopicScore: each topic's starting score from the questionnaire answers; outcome(input, asOf): per step, concept, topic and area, from ratings and questionnaires up to a day (time and streak are added to the same function); a topic with a teacher's score (`OutcomeInput.teacherScores`) is scored from it, see below
  teacherScores.ts cleanTeacherScores(), setScores(), scoreAt(), MAX_TEACHER_SCORES (500): the scores a teacher set (`PlanState.teacherScores`, oldest first, `TeacherScore`: topic, score 0 to 3 in tenths, ISO `at`, and `day`, the teacher's local yyyy-mm-dd, which old entries lack); setScores adds an entry per topic whose value moved by 0.05 or more, on the day it is given; scoreAt is the newest entry whose day (`entryDay`: `day`, else the date of `at`) is on or before a day. `StoredPlan.teacher` (`madeAt`, `comment` up to 2000 characters) marks a week a teacher made; `sanitiseState` keeps both
  topicLevels.ts  raisedAnswers(answers, entries, asOf, teacherScores?): the answers (a topic with a teacher's score starts at its whole part, only ratings after it raise) with each topic raised one level at a time while the next level is reached by the tracker's rule (`levelReached`), never lowered; what `composeToday` and `composeStudentWeek` hand the composer and `/dev/path` hands `reach()` (NEW7)
  daySteps.ts     solidRatedAt(), daySteps(): which path steps a day's plan works on (fresh, open, review) from the answers, the solid steps with their rating dates and the date (a rating with no time counts as the oldest, here and in compose.ts); pure (NEW7)
  compose.ts      composeDay(): one day's plan of library blocks (`Candidate`) for those steps, filled to the minutes (planned review blocks counted first and placed last, each one at most a third of the day, 5 minutes at least: a review step with no block that short is passed over for the next, and with none no review is planned; then fresh steps, open steps, more blocks on the day's steps, more review; `short` when more than 5 minutes under); a block naming any step beyond the player's reach (`reach()`: ahead and not open) or off the path is never picked; a block fits the highest step it names on a track, a step with none walks down its track, also onto a step already solid, and that block counts as new, not as the day's review; more review goes round the review steps until the minutes are filled; never yesterday's, declined or kept blocks; random only from `seed`. composeWeek(): seven days in a row, each the day before as `yesterday` (NEW7)
  keys.ts         the keys a plan is in: `KEY_LADDERS` (per area, easiest first: guitar from E, voice and theory from C; every key on one of five rungs), `keyRung` (the answer to the keys question, else from the area's level), `keysAt` / `exerciseKeys` (`PlayerKeys`: the rung's keys `now`, at most three, and the nearest three `back`), `hasKeySelector`, and `withKeys(block, keys)`: the block drawn with the player's keys in every Key selector (a choice whose chips set only a key), the tools moved to the first key, `back` marking where the earlier keys start (the chips write "Earlier" before them). `composeDay` puts `keys` on each picked exercise with a Key selector; they are the slot's (like minutes), never part of the block id, and `ExerciseCard` applies them when it draws. `explainDay` is `composeDay` with a `ComposeTrace` (minutes, the day's steps, the library counts, every pick with its stage, step, reason and keys), drawn on /dev/compose.
  today.ts        taughtView(state, date): what `/plan` draws for a teacher's student (the week covering today, else an upcoming one with its start in words, else the newest ended one, else none; `older`: the other started weeks); daysLabel(n) ("1 day", "7 days"), dateLabel(date) ("16 November"), dayWords(date, exercises): a composed day's title (its date) and theme (its topics, from `topic` or the steps' tracks); hasNewPicks(today, day): whether another try brought anything besides today's rated exercises; pastDays(history, current, date): the composed days (and a composed current from before `date`), newest first, the last PAST_DAYS (14); todayView(), shouldAsk(): what the page shows for today and when it asks (never with `off`); applyFirst(), applyAnother(): what an answer does to the state, or the failure to say (`TodayFailure`)
  trackerView.ts  mergeTimes(), shownAreas(), topicLevel(), minutesOf(): what the progress tracker shows, from an outcome (the live day timer laid over every plan's records; the areas chosen plus practised ones; a topic's level by name and the next one; whole minutes)
  blocks.ts       blocksOf(), fitBlocks(), blockAt(): an exercise's timed blocks
  choice.ts       applyChoice(), choiceWarnings(), resolvedChoice(): a choice's value set on the tools under it (one `PARTS` entry per part); transpose.ts moves a tool to another key, `setLevel` (tools.ts) to another level
  checks.ts       mixesSingAndPlay(), tempoWithoutMetronome(): paste-time exercise checks
  fixRequest.ts   fixRequest(warnings): the message /dev/prompt's "Copy fix request" button copies, to paste back to the AI
  config.ts       parsePlanConfig(): the pasted reply to a checked PlanConfig, with warnings
  prompt.ts       buildPrompt(answers, entries, previous, course), promptParts(): the whole prompt, with "Find models in the library" and its showcase blocks (`showcaseBlocks()`, read from the seed files); for agents, devtools and scripts only
  promptCore.ts   PROMPT_VERSION (raised with an entry in CHANGELOG.md), every other part (`promptPartsWith(…, library)`), weekByTopic(), weekReport(); never imports the seed files, so the authoring guide (`agentBlocks.ts`) the browser loads stays without them (agentBlocks.test.ts follows its imports to check)
  CHANGELOG.md    what each version of the prompt, the teaching skills and AGENTS.md changed, newest first; versions.test.ts (in library/seed) holds the newest to the code
  cleanExercise.ts cleanExercise(), cleanCells(): an exercise's cells and choice run through the plan's parser again (`parseCellDiag` with `stored`, as a draft), so a tool the reader can't draw is dropped, and an exercise left with no cell shows its title; used by sanitiseState, startDay, anotherDay and editDay before the block id is made
  state.ts        sanitiseState(): a stored PlanState made safe, for client and server (localPlanStore re-exports it): every exercise cleaned (`cleanExercise.ts`), the history cut to `HISTORY_CAP` (60), `given: []` when missing and a given plan with neither `from` nor a `teacher` record dropped, a broken `composed` dropped. fitPlanState(s, maxBytes): the oldest earlier plans dropped until the JSON fits (the server's 2 MB cap, `MAX_PLAN_BYTES`), then, with none left, the oldest given plans, never the newest one; the current plan is never dropped
  schedule.ts     local dates, today's day, progress (`dayProgress`), ratePlan(); the composed day: ownDay(s, date) (today's own plan, a composed `current` started on that date, else null), startDay(s, day, meta, newId) (a `ComposedDay` as `current`, one day, `startedOn` the date, `composed = { attempt, declined: [], short }`, cleaned (`cleanExercise`) and given new slot ids and block ids; the plan before it goes first in the history; today's own plan already there, or a date before the running composed day's: `s` unchanged, so two tabs, an answer arriving twice or a stale answer never replace or double it), anotherDay(s, day, meta, newId) (another try of today: same plan id and `startedOn`; an exercise kept by block id keeps its slot id, tick and rating, re-keyed to its new place, and so its day-timer seconds; one rated in `s` that the answer left out (rated while the request was out) is kept anyway, and the kept ones then go first in their old order; the old block ids not in the new day join `composed.declined`; the same or a lower attempt (a late answer) or no own plan today: `s` unchanged); `meta` is `{ date, attempt, title?, theme? }`, the words going to `config.title` and the day's `theme` ("" when left out); givenPlan(s, id); updateGiven(s, id, change) (a change stored on that given plan only; an id not in `given`: `s` unchanged); hideGiven(s, id, hidden) (sets or clears `hidden` on a given plan: off the list, still in progress); storedPlans(s) (current, history, then given: every plan for progress and the outcome); givenToday(plan, date) (the day of a given plan to open and whether its days are over: its last day's date has passed); the teacher's week (teachers and students): giveWeek(s, days, { start, madeAt, title, replace?, dropUntouched? }, newId) (seven composed days first in `given`, `teacher = { madeAt }`, every theme "", stored as `startDay` stores them; an empty day stays so day numbers match dates; with `replace`, that given plan goes first in the history with its ratings and comment; with `dropUntouched` one with no tick, rating or comment is dropped instead), teacherWeek(s, date) (the newest given week a teacher made that has started by `date`), teacherWeekOn(s, date) (the one whose seven days cover `date`), upcomingTeacherWeek(s, date) (the teacher's week that starts after `date`: at most one, making the next week again replaces it), dayBeforeWeek(s, start) (the block ids of the last day of the teacher's week that ends the day before `start`)
  dayClock.ts     dayClock(): a day's countdown, which exercise its elapsed time falls in
  planTime.ts     DayTime: the day timer's record of one day of one plan (used seconds, seconds per exercise id), kept apart from the plan, with `blocks` (slot id -> block id, for the slots with seconds, so time finds its block without the plan) and `on` (seconds per local date, the 31 latest, so a day's time has the dates it was practised; stored in the column `plan_day_times.on_dates`); parseDayTime() (client and server), elapsedOn(), spentOn(), dayTime(), withDayTime()
server/           what needs the database; tested on memory repos
  composeToday.ts composeToday(d, player, { date, another }): reads the player's stored plan (`answers`, own composed days; never `given`), their ratings (`solidRatedAt`, and `raisedAnswers` for each topic's level) and the library's blocks (`composeBlocks`), and answers `{ ok: true, day, date, attempt }` or `{ ok: false, code }` (`no-answers`, `bad-date` for a date more than a day from today, `no-blocks` when no day of one or more exercises can be made). `another` keeps today's rated exercises and bars the unrated ones for the day; yesterday's blocks (the newest own composed day before `date`) are never picked. Writes nothing. Topics are paced with `state.teacherScores` (none for a player without a teacher). Exports `candidateOf`
  composeStudentWeek.ts composeStudentWeek(d, studentId, { start, seed, today?, yesterday? }, state): seven days for a teacher's student from the same inputs as `composeToday` (`composeWeek`), paced as of the later of `start` and `today` (a rotated week starts in the past), `yesterday`'s block ids barred on the first day, every day kept, empty ones too; `{ ok: true, days, short }` (`short` when any day is short or empty) or `no-answers`, `no-blocks` (every day empty). Writes nothing; `students/server/plans.ts` stores the week
  stubLibrary.ts  tests only: `stubBlock`, `topicBlocks`, `stubLibrary` (a library that answers `composeBlocks` with hand-made blocks)
intake/           the first questionnaire, its own feature: topics.ts (18 topics, four lines each), answers.ts (PlanAnswers, migrateAnswers(), levelOf()), ui/ (the screens, RangeFinder); see its README
store/
  PlanStore.ts    the storage interface: load() / save() of one PlanState, loadTimes(planId) / loadAllTimes() / saveTime(time) of the day timer's records (loadAllTimes: every plan's, read once per page; the server store sends a read each call and lays this visit's saves over it), and on the server store flush() (send the waiting save now; true once it landed), used before Share
  serverPlanStore.ts  createServerPlanStore(): the plan as one document on the server (/api/me/documents/plan), read once per session (loads share the request, then the store keeps the plan) and saved through a DocClient, cut to the server's cap first (`fitPlanState`), so a save is never refused for its size; the day timer's records are read once per plan (`GET /api/me/plan/time?plan=`) and each day saved through its own DocClient (`PUT /api/me/plan/time`): a signed-in player's store
  memoryPlanStore.ts  memoryPlanStore(initial): kept for the visit, saving nothing (a visitor, the demo plan)
  localPlanStore.ts  the localStorage store ("musickit.plan", the timer's records under "musickit.planTimes", the newest 100), only for the site without a database
  composeClient.ts requestDay({ date, another }): POST /api/me/plan/compose, 15 s timeout, never throws: sends `X-Account-Id` (`accountHeaders`): the day, a 409's code, `logged-out` (401), `account-changed` (409 `account-changed`), `offline` (the fetch threw) or `failed` (timeout, 5xx, another shape); 409 `taught`: the account is a teacher's student, whose plans are the teacher's
  usePlan.tsx     the hook the UI uses, usePlanTimes(planId) for the day timer's records, useAllPlanTimes() for every plan's (`{ times, loaded }`, read once per store; a refused read stays not loaded), PlanStoreProvider to swap the store, usePlanStore for a reader outside the hook
ui/               DayPlan (today's plan: its header with Get another plan, the day, the short-day line; `TodayStatus`: the line while it is made, or why it isn't there), useTodayPlan (composes today's plan once per page view and date, and another on request; flushes first), PastDays (the last 14 composed days, read-only), GivenPlans (Plans shared with you: a link per given plan, the weeks a teacher made left out; `EarlierWeeks`, a teacher's student's earlier weeks; `SHARED_PLAN`, the one name of a given plan on the screen; `weekTitle`, a teacher's week named by its dates, "Week of 16 November", through `givenTitle` on every page; `givenHref`), TaughtPlan (`TaughtPlanView`: `/plan` for a teacher's student, from `taughtView`; tested in TaughtPlan.test.tsx), planPieces (what `/plan` and a given plan's page share: `rateHandler`, a rating to the plan and the progress log the page reads; `SharePlan`, the button and popover with its flush; `CornerLabels`, `PhoneLabels`), PlanFlow (the questionnaire's step modal), PromptAndPaste, InviteClaim (the invite page's claim and its notices), useBlockAgentTools (the browser AI's block tools, WebMCP: `get_authoring_guide`, and on the notes creator `read_block` / `check_block` / `write_block` of the note, on `/plan` while a plan runs `read_plan`, `read_block`, `check_block`, `write_block`, `insert_block`, `remove_block`; replies in `model/agentBlocks.ts`, `check_block` reads a block as the write would and changes nothing (`checkNote`, `checkExercise`), the guide tells the AI to check, fix and check again before it sends, every plan change through `editDay`), WeekView (the seven-day strip, `ended` once a given plan's days are over; each day is a `DayPanel`, which `DayPlan` and `PastDays` use too, with **Edit** on a day: `DayEditor`, each exercise the block editor under `ExerciseMetaForm` (title with hashtags, minutes, why, links), the parse checks under it, Add an exercise / Remove exercise within 2–5, Done applies `model/editPlan.ts` `editDay`: an exercise that changed is a new one (new id, its stars, tick and time cleared), the rest keep theirs and move with their place; Cancel drops the draft; the day timer is put away meanwhile; the page wraps the plan in the notes' `NotesEditorHost` for the widget controls and palette), editor/ (`BlockEditor`: a block written as a notebook, the title and key bar in its frame, one column of cells, sections as frames, a gutter on every cell (drag handle, Move up / Move down named with the cell, Add above / Add below / Delete); a tool cell has Settings (the host's controls, `toolControls`) and JSON; changes go through `model/editBlock.ts`), reader/ (the block reader: `BlockArticle` for a note's page, `BlockTitle` and `BlockBody` for a plan card; a block's cells in order, each section a headed step under a thin rule, like an article, ending in a small "Top of section" button that scrolls back to its heading; an open block choice drawn as the key bar only when the host says `keyBar`; under a `CellAsideContext` (`reader/aside.ts`), the /dev/library item view, each tool is framed with its type; every tool has its own tour button, `ToolTour` from `features/guide`, walking `TOOL_TOURS` inside that tool only, and only the first unseen one on the page wobbles; each tool sits in a `ToolBoundary`, so a tool that throws shows "This tool couldn't load." in its place and the rest of the page works), DayTimer (the floating day countdown), ExerciseTool
  tracker/        StreakButton (the day streak, opens the tracker), ProgressTracker (the tracker modal's body: areas, topics by level name, concepts with details)
api/me/plan/compose (src/app/api/me/plan/compose/route.ts)   POST { date, another }: 200 with composeToday's `ok: true` answer; 409 { error, code } for its three codes; 400 for a body of another shape; 500 { error } when the library or the database fails; the usual 401/403/503 and 409 `account-changed` (`signedIn`). Writes nothing; the page stores the day
PlanApp.tsx       the page body: no answers → the intro and Start; answers and no plan for today → `TodayStatus`; today's plan → `DayPlan`, Plans shared with you, Past days, a Back to top button; the flow modal and the progress tracker
GivenPlan.tsx     a given plan's page body (`/plan/given/<id>`): `LiveGivenPlan` (the plan live: ratings, ticks, timer and edits through `updateGiven`; also `/plan` for a teacher's student), `GivenPlanView` draws the header and `WeekView`, or the not-found state; tested in GivenPlan.test.tsx
reminders.ts, PracticeReminder.tsx   notifications (PracticeReminder is mounted in PageShell, on every page); for a teacher's student today's plan is today's day of the teacher's week ("Today is day 3 of 7 of your plan."), and nothing is due with no week covering today
```

## Storage, and moving to an API

Every exercise carries two ids. `id` is the slot's, new for each run of a plan. `blockId` says what the block is (content and tags, never minutes, why or links) and is filled when a day is stored (`startDay`, `anotherDay`), on every load (`sanitiseState`) and by the day editor (`editDay`, which also sets `parentBlockId` to the block it was edited from). All three first clean the exercise (`cleanExercise`), so the id is of what is stored and shown, and a save and reload never changes it. It is always recomputed, never read from a stored or sent plan. The prompt never carries either. On the server, every save of the plan document also puts its blocks in the shared library (`blocks`, `block_owners`; `storePlanBlocks` in `features/userData/server/data.ts`), private to the player.

The UI only talks to `PlanStore`. `UserDataProvider` (`features/userData`, in the root layout) picks the store for every
page by the data source: a new `createServerPlanStore()` for each signed-in session, a fresh `memoryPlanStore` for a visitor, and
`localPlanStore` when the site has no database. Until the source is known the store is a waiting one, so the page stays
in its loading state. `DemoPlan` wraps its plan in its own memory stores, plan and progress. `PracticeReminder` reads the
same store through `usePlanStore()`: when the page opens or the tab comes back, then again only when the plan it holds
says a reminder is due. The open flow (step and answers) is kept in `sessionStorage` (`musickit.plan.flow`) so a
reload doesn't lose it; that one stays local.

The progress log has its own store with the same idea (`src/features/progress`: `ProgressStore`, `serverProgressStore`,
`memoryProgressStore`, `localProgressStore` under `musickit.progress`, `useProgress`, `ProgressStoreProvider`). Exercises get their ids when a day is stored
(`startDay`, `anotherDay`), new ones each time; plans stored before ids get them on load.
`localPlanStore` saves back at once whatever loading changed (ids, answers moved to the topic shape); no backup is kept.

## The plan format

The prompt asks for one JSON object, exactly seven days. An exercise is a **block** (`model/types.ts`: `Block`, the
content; `ExerciseMeta`, what the plan knows about it; `PlanExercise = Block & ExerciseMeta & { id? }`): a `title`, an
optional `choice`, and `cells` shown in order. A cell is `text`, `list` (numbered steps), `notice` (`headphones`), `tool`
(one of the tools below, set up) or `section`: a step with a `heading`, `minutes` when it is a timed block, its own
`choice` and its own `cells` (any kind but section). A tool sits right after the text it belongs to, so a step that needs
another view just adds another tool. Links are not cells: `learnBefore` (at least one lesson to read first) and
`exploreMore` (going deeper), up to 3 attunr hrefs each; the app shows each with the page's real name. A title may end
with hashtags that stand for the fields (`"Barre drill #guitar #beginner #technique"`, `model/hashtags.ts`): the parser
reads them into `area`, `level` and `tags` (a field written as a field wins), stores the title without them, and the
card shows them after the title. There is no `focus`. Design: `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md`.

```json
{ "title": "…", "summary": "…", "days": [ { "theme": "…", "exercises": [
  { "title": "A minor pentatonic, positions 1 and 2 #guitar #beginner #technique", "minutes": 8, "why": "…",
    "choice": { "key": "a", "scale": "minor-pentatonic" },
    "learnBefore": ["/course/5/pentatonic"],
    "cells": [
      { "type": "text", "text": "…" },
      { "type": "section", "heading": "Position 1", "minutes": 4, "cells": [
        { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "a", "boxes": [1] } },
        { "type": "list", "items": ["…"] } ] },
      { "type": "section", "heading": "Position 2, in D", "minutes": 4,
        "choice": { "label": "variant", "options": [ { "key": "d" }, { "key": "a" } ] },
        "cells": [
          { "type": "tool", "tool": { "type": "scale-neck", "scale": "minor-pentatonic", "key": "d", "boxes": [2] } },
          { "type": "tool", "tool": { "type": "backing-band", "key": "a", "pinned": ["key"], "bpm": 60, "parts": { "click": "on" } } } ] } ],
    "exploreMore": ["/theory/scales/minor-pentatonic/a"] } ] } ] }
```

**The choice** (`model/choice.ts`) is a layer over the tools under it: the block's reaches every cell, a section's own
wins inside that section. Two shapes (`parseChoiceDiag` in `tools.ts`): `options`, 2–4 chips the student picks from,
every option holding the same parts, the tools written as option 1 (what `step-choice` was); and open, the parts
themselves (`{ "key": "a", "scale": "minor-pentatonic" }`), any value, which every tool under it is written in and
follows (stored as `{ open: {…} }`). The parts are `key`, `scale`, `bpm`, `position` and `level` (`PART_NAMES`, one
`PARTS` entry each); a tool keeps its own value for a part it lists in `pinned` (`canFollowPart`). Tools are stored
complete (their own key, scale, tempo); `applyChoice(cells, choice, index)` sets a part's tools on draw, as before, and
`choiceWarnings(block)` warns on paste about a choice with nothing to move, a part no tool has, an option 1 that isn't how
the tools are written, or a tool written in another value than an open choice ("staff written in G under a choice in A;
it will follow A."). The tools know nothing about the chooser.

On paste: a code fence or prose around it is fine; minutes are clamped to 1–120. The parser is forgiving, but it says
so: everything it changes or drops is a warning in `parsePlanConfig` (`config.ts`; `parseExercise` does one block),
worded to be pasted back to the AI. Left out, with why (`parseToolDiag`, `parseCellDiag`): a tool of an unknown type, or
one that can't be shown ("left out a scale-neck (unknown scale "x")": each parser in `TOOLS` names its reason where it
returns null, `no(d, why)`), an empty cell, a section with no heading or no cell it could show, a section inside a
section, a `heading` cell ("write a section instead"), an unknown link, unknown tags or hashtags or concepts. Cut: a text
at 700 characters, a heading 100, a list item 240, a list at 8 items, 24 cells (sections' cells counted), 8 exercises,
`add` notes at 4, chord lists at 8 or 16, kind tags at 3 (the implied `multi-octave` is added after the cut); the schemas
in `CELLS` carry the same limits (`maxLength`), so the prompt states them. A default standing in for something the AI
got wrong or left out is named ("backing-band had no key; used A."): `key` and `bpm` of a `backing-band`, `bpm` of
`strum-along`, `guitar-play-along` and the technique stubs, a staff's `voice` (tenor, the prompt's default), an
out-of-range `bpm`, `fret` or `cents`; the documented defaults of optional props (an `interval-singer` left without a
key, a staff `click` without a `bpm`) are silent when left out and warn only when the value is wrong. A list prop that
lost entries it couldn't read names them (`scale-neck "highlight" had entries it could not read (9, "x"); left them
out.`): `boxes`, `positions`, `enable`, `highlight`, `mute`, `hide`, a staff's `notes`, `add`, `strings`, an
`interval-singer`'s `intervals` and `keys`, an `arpeggio-neck`'s `part`, a backing band's or track's `parts` and `mute`,
a scale-neck's `parts`, a tool's `pinned` (`lost` in `tools.ts`; duplicates are no loss); a choice names the options it
left out. Numbers in the degree lists are removed from pasted input before parsing (the AI's `3` means the 3rd, not 3
semitones) and reported, saying to write degrees as strings ("3", "b7"). No voice-range check exists on purpose: every
singing tool places its notes inside the voice by construction (the staff, runs, tunes and interval-singer fit the key
to the range), so no key can be out of range. Rules the prompt states are checked: an exercise with more than 6 tools or
with no `learnBefore` link left, a day with fewer than 2 or more than 5 exercises. A reply still written with `sections`
gets its title as one text cell and the warning "has no cells (did you write "sections"?)". Beside the warnings the paste
step on /dev/prompt has a "Copy fix request" button (`ui/PromptAndPaste.tsx`) that copies `fixRequest(warnings)`: the app checked the
plan, these are the problems, send the whole plan again as one JSON block. An exercise without a known `level` (new,
beginner, intermediate, advanced), `area` (guitar, voice, theory) or kind tag (`EXERCISE_TAGS`) warns
(`exerciseLevelArea`, `exerciseTags` in `tools.ts`); fewer than seven days or an empty day is refused. Nothing older is
read: a stored plan whose exercises have no `cells` is dropped on load (`sanitiseState`), and there is no migration of old tool names or shapes (`migrate.ts` is gone).

## The prompt

`prompt.ts` (its parts in `promptCore.ts`) writes the student section from the answers (per area: a rough level worked out from the answers, then each
topic with the line the student picked, or `(not answered)`; voice type and range in note names; minutes; notes; styles
marked "flavour only"), on a next week the week by topic (`weekByTopic`) and the AI's last progress summary, then how to
plan (from the lines picked; how to keep the progress summary: one line per topic, rewritten each week, ratings over
starting answers, under about 300 words) and the
rules for good exercises (singing keys inside the range; one
skill each; `minutes` are the truth and a guitar-play-along or backing-track loops until stopped; exercises over 5 minutes in 2+ timed blocks, each
block changing something real; sing or play, never both; longer singing made musical; every named note lit, the root never
muted, one chart per step; intervals inside an octave unless tagged `multi-octave`; a progression practised several ways;
no genre-driven plans), a "Common mistakes" list of wrong → right pairs (box far from open chords, wrong degree highlighted,
chord tones as prose, muted Do, one chart for five steps, 12 minutes of one tool, sing-and-play, timer vs text, a why
paragraph, repeat counts and poetic lines, jargon), "How to write an exercise" (drills first with at most one sentence of
why in `why`; how to use the app over technique; playful, no repeat counts, one action per sentence; targets say which
chord they land on; syllables only with a reason; "position" for scale shapes; "the staff", explained for beginners;
non-singing staffs in tenor), then the interface, generated from
`model/tools.ts`: every section kind and tool as name, description and `inputSchema` (as an MCP server lists tools), and the
pages a link may go to as a few URI templates (`/theory/scales/{scale}/{key}`, `/course/{stage}/{section}`).

The prompt is built as labelled parts (`promptParts`: intro, student, earlier weeks, how to plan; then the definitions: exercise format, the section interface, which tool for what (every tool by what the student does;
`prompt.test.ts` fails when a tool is missing from it), the tool interface, links; then the rules that use them: rules, mistakes, how to write; then "Find models in the library" (the agent looks plans and blocks up with the library tools, `find_blocks` / `get_block` / `find_plans` / `get_plan` / `library_coverage` / `player_progress`, preferring the current `docs_teaching`, and each showcase is named by its computed block id); the answer format last, ending with a short final check the AI runs over its plan; each rule is stated once, and a skipped questionnaire makes the first reply the questions), `buildPrompt` joins them.

The prompt pastes no examples: the seed plans and blocks (`src/features/library/seed`) are what the agent finds in the library over MCP. The dev prompt studio (`src/features/devtools`, `/dev/prompt`) shows, edits and runs them part by part.

## Tools

The AI writes an exercise's text and its tools in the same list; the page draws only from the tools. So the prompt makes
them agree: every note the text plays is in the scale or its `add`, any outside note is named as outside, with why.

Notes on a neck or staff have four states (`noteState` in `exercises/cues/visibility.ts`): hidden, muted, normal,
highlighted, from two layers the AI sets apart: `enable` (the notes the student plays; absent: all) and `highlight` (the
few of interest among them, ringed; it never mutes anything). It lists them, and `mute` and `hide`, as degrees or note
names (`"c-sharp"`, read against the key, or the chord on `arpeggio-neck`); `others` (`muted` / `hidden`, old `dimmed`
reads as `muted`) sets the notes not enabled. A plan from before `enable` with a `highlight` and `others` muted or hidden
meant "only these": it parses as that `enable` (`layersOf`). Notes in `add` are highlighted without muting the scale.
`scale-neck` and `arpeggio-neck` take a `placement` instead of `boxes` (`exercises/cues/placement.ts`): `{ by: "open" | "fret" | "root" | "box" | "chords" }`; `chords` is resolved on
paste from the exercise's chord-shapes or guitar-play-along (`resolveChordPlacement`: open voicing → open, barre → the first
chord's fret). Not yet: `placement` on the shapes' per-chord `place`, and `mute` / `hide` / note names on `guitar-play-along`
(it keeps chord-relative degree `enable` and `highlight`, `others` muted or hidden).

Notes in an exercise's text are written `{{3}}` (a degree) or `{{c-sharp}}` (a note name) and drawn as the fretboard's
dot inline (`ui/InlineNote.tsx`, the same `NoteDot` the necks use): coloured by degree, labelled by the global label
setting (`useLabelSystem`), the other name on hover, played on tap. `model/noteText.ts` splits the tokens out and reads
them against the root of the tool after the text (else the one before); a token it can't read stays as text. A line
written between underscores (`_Don't reach for high notes._`) is a care line: `markRuns` (same file) pairs the
underscores across notes and explained words, and `ui/reader/NoteText.tsx` draws the line over a low band of amber. The words
"reach for high notes" are in `GLOSSARY`, so the app adds the (i) and the link to the lesson by itself.

The tools are the learning components of `src/features/exercises` (see its README): `scale-neck`, `chord-shapes`,
`staff`, `backing-band` (`parts`: each part offered, mapped to `"on"`, `"off"` or `"always"`), `note-finder`, `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer`, `string-singer`, `breathwork` (`drill`; `from` and `to` kept only for farinelli, `seconds` and `rounds` only for the others; it can't change key with a choice), `voice-hill` (`where` and `sound` kept only when not the default low hum; `seconds`, `reps`, `voice`), `lip-roll` (`shape`; `speed` only for a slide, `seconds` only for "hold"; `play`; `plays`, `voice`; neither changes key), `strum-along`, `video` (a library video by its id, `@/features/videos`: only a published one parses from the AI, a stored one is kept; the prompt lists the published ones with title, area, length and line, and leaves the tool out while there are none; it can't change key),
`backing-track` (the backing tracks player, drums, bass and keys: a curated `progression` id or the lesson's own `numerals`
(pasted `chords` are read into numerals in the `key` at parse, so moving the key moves them), `key`, optional `style`,
`bpm` and `parts` (drums, bass, keys, each `"on"`, `"off"` or `"always"`, a part left out silent with no row; all `"on"` stores no `parts`); with neither a known progression nor chords the tool
is dropped; nothing is saved, so it opens as the plan set it; a "band" part
of its step) and the guided `guitar-play-along` (one shape: `progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`,
`solo-over`). The prompt lists them from `COMPONENT_DOCS`, the debug panel shows each one's short doc (open it for the
prop table). Eight tools take a `level` (`new`, `beginner`, `intermediate`, `advanced`: `interval-singer`, `interval-ears`, `note-finder`, `string-singer`, `breathwork`, `finger-pattern`, `picking-drill`, `legato-trill`): a short way to write the settings in `exercises/basics/levels.ts`. The parse fills in what the tool leaves out (a prop written beside the level wins) and keeps the level on the tool, so a choice with `level` options can move it (`setLevel`, which replaces the level's settings). The prompt's "Levels" part says what each level means by area, what a next stage is against a next level, and that the student chooses with a choice on the section, not from a list on a tool (`interval-singer` shows its key chips only with `picker`). `melody-singer` and `run-singer` take a `pick` ({ difficulty, stage, index }, `theory/melodyPick.ts`) instead of a number; it is resolved at parse (never stored) and a pick that matched no tune exactly warns. The exercises' `minutes` add up to the day timer. Sections with `minutes` are timed blocks (`blocks.ts`); on paste the block minutes are scaled to add up to the exercise's, and an exercise over 5 minutes with fewer than two blocks gets a warning. An exercise that asks the student to both sing and play their instrument also warns (`checks.ts`, `mixesSingAndPlay`), a narrow heuristic: singing is a mic tool (`melody-singer`, `run-singer`, `string-singer`, a `staff` without `mic: false`) or the word "sing" in text; playing is text only ("play", "strum", "pick the strings", "find it on the guitar"), so an instrument tool shown as a visual doesn't count. Play-along, "press Play" and the app or backing playing are ignored. An exercise whose text asks for a tempo ("60 bpm", "play it at 80") but shows no tool that sounds the beat (a `backing-band` offering its click or drums, `play-along`, `strum-along`) warns too (`tempoWithoutMetronome`); the stubs' `bpm` is no metronome. A `strum-along` `pattern` (one bar of D / U / . strokes, 1-4 a beat) is kept only when it fills the bar evenly, rewritten with a `|` between beats; otherwise dropped (a down a beat). A `staff` can carry its own backing (`drone`, `click`, `bpm`; `PracticeBand` `view="inline"`, with its own Play beside the staff's "Start microphone"). Each section (and the block's own cells) is an `ExerciseStep` (`src/components/practice/exerciseStep.tsx`): when its tools have more than one kind of thing to start (the mic and a drone, the mic and chords) a "Start exercise" button above the first tool starts them all and "Stop exercise" stops them all, so a singing exercise says "Press Start exercise below" instead of pairing a `backing-band` with a staff; the prompt prefers it and keeps `backing-band` for a drone or click with no mic listening. A staff with its `click` counts as a metronome for `tempoWithoutMetronome`. The choice is described under "The plan format"; its chips are `exercises/basics/choice` (not a tool), drawn by `Cells` in the section's header (or above the block's own cells), and `Cells` owns the picked option per part. The tools remount on a pick so what played stops, and the `{{3}}` dots in the text follow, since they read the moved tools. A `scale-neck` takes `parts` like a band's (`positions`, `neck`, each `"on"`, `"off"` or `"always"`, a part left out not drawn): the whole neck lies above the position boxes with the same marks (`enable`, `highlight`, `add`) and the shown position framed, and chips show or hide the parts that aren't `"always"`; with `parts` the older `neck` / `positions` booleans (the scales page's guitar section, kept for the studio's Scale widget, no marks) are not stored. A staff's `labels` (`degree` or `solfege`) labels its notes whatever the student's label setting; a staff with the mic and no `labels` never shows bare note names (degrees when the setting is note names; `staffLabelSystem` in `theory/labels.ts`). The prompt asks for `labels` on every mic staff, and `examples/staffLabels.test.ts` checks every mic staff in the examples shows labels. A play-along's `under` picks what sounds under single
notes (the chords held by default). In development each tool shows its name above it (`DevName`).
Three tools are stubs, for the course's dexterity basics: `finger-pattern` (the spider), `picking-drill` and
`legato-trill`. The AI can use them now; until their real views exist they show a "Stub exercise: …" box with their settings.

No old tool name or shape is read (`migrate.ts` is gone): stored plans hold today's tools, and the demo plans (`demos.ts`) parse their example through `parsePlanConfig` once.

To add one: the component with its `@component` doc, its parse in `TOOLS` in `model/tools.ts`, a view in
`ui/ExerciseTool.tsx` (lazy-load anything with its own sound engine), and a test.

## Explained words

Hard words in an exercise's text and steps ("comp", "guide tones", "eighths"…) get a dotted underline and an (i) with a
one-line meaning and a link to the course article. The AI writes plain text; `explain()` in
`src/features/course/glossary.ts` finds the terms (plurals, -ing forms, multi-word and hyphenated) and marks each once
per exercise. To add a word: an entry in `GLOSSARY`, and an article; if there is none yet, add an empty `section()` to
the course and point at it. The prompt lists the terms with their meanings (generated from `GLOSSARY`) and asks the
AI to use them by name without defining them.

## Seed library

The hand-tuned exercises and 7-day plans live in `src/features/library/seed` (its README: files, `versions`, writing rules, `npm run -s seed -- check`). `plan/demos.ts` reads six of the plans for `/demo`; `/dev/library?item=<id>` draws any of them.

## Concepts

`model/path.ts` is the learning path (NEW13): `PATH`, 46 tracks, each one skill with its steps from easiest to hardest,
each step at its own level, so a track spans the levels its steps reach. A mixing step (`mix: true`, made with `m`,
named "Mix: ...") teaches nothing new: it uses what the steps before it in the track taught, together, so new material
(an interval, a chord shape, a mode) doesn't stay on its own; 33 of them, from the Fable agents' proposals (2026-11-16).
A mixing step has no ladder: its block uses the tool at the level of the ladder step before it. Steps are numbered by
place, so adding one renumbers the refs after it: change them all in one commit (`after`, `devtools/model/slopeProposal.ts`,
the seed blocks' `steps`, the tests). A step may name steps of other tracks to learn
first (`after`, as "trackId:n") and the ladder step in the code that stands for it (`ladder`, as "ladderId:key", from
`model/ladders.ts`: tool levels, the ear game's levels, the tune and run stages). `stepOf(trackId, tools)` reads the step
an exercise works on from its tools. A step with no ladder is "not implemented": no tool setting stands for it yet.
A step's predecessors are the step before it in its track and its `after` steps (`predecessorsOf`). `depthOf` is how deep
that chain runs, and `slope()` puts every step in path order: by level, then depth, then track order. So inside a level
the order shows: pentatonic before the modes, pentatonic position 1 before every other first position, double stops
before triads, the first triads before barre chords (design: `docs/superpowers/specs/2026-11-16-path-slope-design.md`;
/dev/path → "Slope" draws it).

`model/reach.ts` marks every step for a player: known, within reach or ahead (`reach({ topics, solid })`, NEW16). The
questionnaire's placement and the steps rated solid are known (a starting step rated solid too: the rating is newer),
and so is everything they need first; a step whose
predecessors are all known is within reach, a few per topic at a time (`REACH_CAP` by the topic's line: new 1, beginner
2, then no cap), starting steps always. The ones over the cap are "ahead" but `open`. Nothing blocks a player.
For the composer and `/dev/path`'s player in the browser, a topic's line goes up from the answer (unanswered: new) one
level at a time, to the next level only when the tracker's rule counts that level itself as reached (`raisedAnswers`,
`model/topicLevels.ts`, with `levelReached` from `outcome.ts`: every concept with a step there is solid there), so a
level reached higher up with a gap below raises nothing (one rating on an advanced track can't make a topic's unrated
steps known). Ratings never take a topic below its answer, and a topic never answered nor rated stays unanswered. `reach.ts` itself is unchanged.

`model/concepts.ts` is the catalogue the questionnaire rates and exercises are tagged with: `CONCEPTS`, one per track
(`level` is its first step's, `levels` every level its steps reach, `steps`, a `course` link), `AREAS`
and `conceptById`. An exercise names the path steps it practises in `steps` ("trackId:n"); `parseExercise` drops an unknown ref or a step of a track that is not one of its concepts (adding a missing track of its topic), and sets `level` to the highest of the steps' levels (`levelOfSteps` in `path.ts`). The prompt (version 4) asks for `steps` in place of `level` and lists every concept's steps, numbered, with their levels, under its topic in the answer format. The 67 concepts from before the
path (2026-11-16) map to their track (`OLD_CONCEPT_IDS`, `conceptId`, `conceptIds`): the parser, the outcome and the
library coverage read an old id as its track, so stored plans and ratings keep counting.

The outcome (`model/outcome.ts`) judges each step of a concept's track (`steps`): a rating counts for the highest step
its block named on that track and every step before it, never after (`reachIndex`). A rating with no step on the track
(rated before blocks named steps) reaches the last step at its block's level tag inside the span (the nearest end
outside it, the first level without one: `ratingLevel`). A step's state is the newest rating that reaches it. The
progress log copies the exercise's `steps` onto each rating. A concept stands at a level as its last step at or under
that level does (`at`), and a topic's level is reached when every concept with a step there is solid there.
`solidSteps(outcome)` lists the solid step refs by the outcome's rule; nothing calls it. The composer (NEW7) takes its solid steps from `solidRatedAt(entries)` (`model/daySteps.ts`: a step is solid when its newest rating that counts for it, by `reachIndex`, has 4 or 5 stars) and hands them to `reach()`; `/dev/path` shows the player in the browser by the same two (`entryProgress`, `playerReach` in `devtools/model/stepProgress.ts`).

### Course sections to write

Empty `section()` stubs added so concept links resolve: matching-a-pitch and breath-and-holding-a-note (stage 3),
augmented-chords, diminished-chords, chords-in-pop-rock, chords-in-folk (stage 7), singing-leaps, sight-singing,
harmony-line, vocal-runs (stage 6), fast-runs, stretching-your-range, improvising-a-melody (stage 9).

## Progress

`outcome(input, asOf)` (`model/outcome.ts`) says where the student is on a day. A rating or questionnaire counts when its day is on or before `asOf`; one whose `at` is not a date is left out. A concept is `solid` when its newest rating has 4 or more stars, `working` when it has ratings but the newest is lower, `not-yet` with none. A topic's `reached` level is the higher of its last questionnaire rung (or "new" once it has any rating) and the highest level whose concepts are all solid; its score adds the share of solid concepts one level up. Time comes from the day timer's records. A record's dates are the ones in its `on`, or, saved before that, `startedOn` plus its day holding `elapsed` (no plan: undated, counted in every run); as of a day, the share of its seconds dated up to then counts. Each slot's seconds go to the tags of its exercise, else of a plan exercise or rating with its block id, else only to the total; every known concept gets them in full, its topic and area once. The streak is the run of practised days ending at `asOf` (or the day before): a day with a counted rating, or with `STREAK_SECONDS` (300) of timer. The rules are in the progress tracker spec, `docs/superpowers/specs/2026-11-15-blocks-and-progress-design.md`. A topic with a teacher's score `T` set at time `t` (the newest entry dated on or before `asOf`, `scoreAt`) is scored from `T`: only ratings dated after `t` (a rating with only a date counts when its date is later than the teacher's day: the entry's `day`, else the local date of `t`) count toward the level and the share one level up, starting from the rung `floor(T)` instead of the questionnaire; the score is `max(T, that score)`, at most 3, and `reached` is `max(floor(T), that reached)`. So a teacher can lower a score, later ratings raise it, and ratings never lower it below `T`. The topic's `ratings` and `concepts` stay all-time; topics with no entry are scored as before. Known limitation: the progress log keeps one row per slot, so re-rating an exercise on a later day moves that rating's date; an earlier day can drop out of the streak, and as-of runs before the re-rating lose it.
