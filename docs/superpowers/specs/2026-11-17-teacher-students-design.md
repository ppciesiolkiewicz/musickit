# Teachers and their students: design

Date: 2026-11-17. Brainstormed with the user. Brings together NEW12 (teachers), NEW18 (follow-up) and the parts of
NEW7 (server autoplans) they lean on, from `tasks.txt`. Account setup and paying are a separate task of the user's.

## Why

A teacher should be able to run their students' practice in musickit: add a student, have a plan ready for them the
first time they open the app, see that plan, and make the next one with a quick read of how the week went. Today none
of this is modelled: a teacher can only share a plan as an invite (`sharePlan`), there is no link between a teacher
and a student, and nobody can make an account for someone else.

## Principles

- **Subscriptions decide what an account shows, not account types.** There is one kind of account. Every account is on
  one subscription (`users.plan_id` → `plans` table, `src/features/account/plans.ts`), and the subscription already
  gives a role (`student` / `teacher`). Teacher screens are new entries in `FEATURES` (`src/features/account/model.ts`)
  for the teacher role, checked with `can()`. Whoever pays runs their own account.
- A teacher can still do everything a student can (practise from plans of their own). That is the smaller change.
- The teacher pays for a number of students (`plans.students`), not a number of plans. Plans now mostly come from the
  library, so a plan costs little.
- No admin role. Nothing in this design is for our team only except reading the teachers' comments, which needs no new
  screen (see "Comment").

## Goals

1. **Add a student.** On a new "Students" page a teacher adds a student by name and email (required). The teacher
   fills in the questionnaire for the student: the same screens as a player's start (`questionSteps`,
   `src/features/plan/intake/ui/Questionnaire.tsx`), worded for "your student" where needed. This creates the
   student's account, records the answers on it, and puts a first plan on it.
2. **Claim (user).** We email the claim link to the student's address. Opening it signs them in (the email proves the
   address, like today's email link) and lands them on their welcome page, with the first plan already waiting. They
   do not see the questionnaire. No welcome page exists yet: build it as a stub (user) that greets them and links to
   the waiting plan; what it shows besides that comes later.
3. **Student limit.** Adding a student is refused when the teacher has as many students as `plans.students` allows
   (null: no limit). Students are counted whether claimed or not.
4. **See the plan.** From the Students page the teacher opens each student's current plan, read-only, as the student
   sees it.
5. **Next plan, with sliders.** For each student a "next plan" page shows one slider per topic of the student's areas
   (mock-up: `.superpowers/brainstorm/73040-1794902915/content/teacher-sliders.html`, normal view only):
   - range 0 New, 1 Beginner, 2 Intermediate, 3 Advanced, continuous (step 0.1), the same scale as the `outcome()`
     topic score (`scoreOf`, `src/features/plan/model/outcome.ts`);
   - it opens at the student's score now; a tick marks the score at the start of the current plan;
   - an optional box "Anything else about this week?";
   - two buttons: *Make next week's plan* (a new plan starting when the current one ends, or today if it has ended)
     and *Rotate this week's plan* (a new plan for the current dates, replacing the current one). Both are the same
     "next plan" step; only the start date differs.
6. **Slider values are real.** A moved slider becomes the student's score for that topic from that moment, and the
   student's ratings carry on from there. Later our own decision code (rules such as "Stuck twice in a row", built so
   rules are easy to add) replaces this; for now "the teacher's value is real".
7. **/dev/questionnaire** gets the same sliders, on sample students (brand new; a few weeks in; many ratings), showing
   what the slider opens at, the start-of-plan tick, and what the plan maker receives after a change.

## Non-goals (now)

- Schools, extra teachers sharing a pool of students, school quotas (the user's later account-setup work).
- An advanced, per-concept view of the sliders (shown in the mock-up and dropped).
- Daily plans for a teacher's student: they get the teacher's weekly plans only (Claude's call, less work; may change).
- Any flow for a self-serve student to upgrade to a teacher or school subscription (allowed in principle, not built).
- "Start anew": a student starting a new track while keeping old progress and feedback. Nothing here may rule it out:
  keep answers, ratings, feedback and old plans when a new plan is made (today's `history` already does).
- Watching the cost of AI plans written to teacher notes (NEW12's note) — later.
- An admin role.

## Anti-goals

- A second kind of account, or a teacher's student stored anywhere but in a normal account. A claimed student is an
  ordinary account whose data happens to have been started by a teacher.
- The teacher's comment shown back to the student or labelled as read by our team.
- Score changes that throw away the student's ratings or answers history.

## Decided details

- **Who sees whom.** A new link (table) teacher → student, one row per student, with when it was made and when the
  student claimed. A teacher reads and writes a student's plan data only through that link, on the server.
- **Student's data** stays in the student's own `userDocuments` row (kind `plan`, `PlanState`), so the student's app
  works unchanged after claiming. The teacher's actions write into it on the server.
- **Answers.** The teacher's questionnaire is recorded as the student's `answers` and an `answersHistory` entry, as if
  the student had answered.
- **Slider storage.** A moved slider is recorded with its time and topic, next to the answers history (a new kind of
  entry or field; builder's call).
- **How a teacher value counts (Claude's call, from "treat adjusted as real and start from there").** For a topic with
  a teacher value T set at time t, `outcome()` scores it as T plus what practice adds after t: only ratings dated after
  t count toward `fromPractice` and the share one level up, and the score is `max(T, that score)`. So a teacher can
  lower a score (earlier practice no longer counts), and later ratings raise it again. Ratings never lower it; that
  waits for the rules code. Topics the teacher never moved are scored as today.
- **Saving without losing the teacher's writes (Claude's call).** The plan document is saved whole by the client, last
  write wins (`docClient.ts`). A teacher write and a student's open app would overwrite each other. Add a version check
  to the document save (a stale save is refused and the client reloads), which every player's save then goes through.
- **Subscription of a teacher's student (Claude's call).** A new `plans` row for a teacher's student (price 0, not
  choosable on /account/setup), written when the teacher adds the student, so the account skips setup. What happens
  when the teacher's subscription lapses or the teacher removes a student belongs to the user's account-setup task;
  until then the student keeps the account and its plans.
- **Comment.** For our team only (user): it does not go to the plan maker. Stored with the plan it was written on (like
  `StoredPlan.feedback`, but its own field), in the student's document; readable by us in the database. No team screen
  now.
- **NEW12 line replaced.** "A teacher does not set a student's step or level by hand; the note is how they steer" no
  longer holds: the sliders set the topic score.
- **Words.** Interface copy is written with `design:ux-copy` and "Words about the app" in `teaching-voice` (AGENTS.md).

## Dependency: where plans come from

No server code makes a plan today (`src/app/api` has no autoplan route; plans come from agents in Claude Code, invites
and restarting an old plan). Goals 1 and 5 need one. The plan maker is NEW7's composer (plans composed from library
blocks by the player's steps, no AI); this design calls it as one function, "make a plan for this student from their
answers and scores, for these dates, 7 days", and does not design it. Until it exists, see the open question.

## Order and the remaining calls

- **NEW7 first (user).** This is built after NEW7's composer can make a 7-day plan on the server; nothing of it ships
  before. Its implementation plan is written then, against the composer as it turned out.
- **An email that already has an account (Claude's call; the user didn't pick).** Checked when the teacher adds the
  student: the teacher is told the address already has a musickit account and the student is not added. No merging
  or relinking for now; easy to change later.

## Left to the builder

The link table's shape, the claim link (a one-time token like `authTokens`, or a share-like id with a claim route
like `planClaims`), how an account is made without a sign-in (the `userFor` path in
`src/features/account/server/auth.ts` makes accounts only on first sign-in), the Students page layout, and the
claim email's wording (with `design:ux-copy`).
