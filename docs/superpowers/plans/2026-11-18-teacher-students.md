# Teachers and their students (TeacherStudentFlow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher adds a student, a first week's plan waits for the student when they claim their account, the teacher reads that plan and makes the next one with one slider per topic.

**Architecture:** A new feature folder `src/features/students` (pure `model/`, rules over repos in `server/`, screens in `ui/`), built like `features/account`: pure rules taking deps, a drizzle and a memory repo, thin routes. The student is a normal account on a new subscription row `taught`; the teacher's writes go into the student's own `plan` document on the server, guarded by a new version number on `user_documents`. A week is made by the existing `composeWeek` and stored in `PlanState.given` with `teacher` set.

**Tech Stack:** Next.js (this repo's version: read `node_modules/next/dist/docs/` first, AGENTS.md), TypeScript, Drizzle + Postgres, `tsx --test` (node:test).

**Spec:** `docs/superpowers/specs/2026-11-17-teacher-students-design.md`. Composer as built: `docs/superpowers/specs/2026-11-18-plan-composer-design.md`, `src/features/plan/model/compose.ts`, `src/features/plan/server/composeToday.ts`.

## Global Constraints

- One kind of account. A teacher's student is stored nowhere but a normal `users` row and its own `user_documents` rows.
- A teacher reads and writes a student's data only through a `teacher_students` row, checked on the server in every route. Never trust a student id from the body without that check.
- Slider range 0 to 3, step 0.1 (0 New, 1 Beginner, 2 Intermediate, 3 Advanced), the scale of `outcome()`'s topic score.
- The teacher's comment never reaches the student's screen, never goes to the composer, and no label says who reads it. Its label is exactly "Anything else about this week?".
- Nothing is thrown away when a plan is made or a slider moves: answers, `answersHistory`, ratings, old plans stay.
- Every route that changes something starts with `auth()`/`signedIn(req)` (which checks `sameOrigin`); a token is stored as its hash, used once, never logged; `next` goes through `safeNext`.
- Every failure the person can meet shows a toast or an inline error; every `fetch` has a timeout (memory: always surface errors).
- Words on the screen: load `design:ux-copy` and read "Words about the app" in the `teaching-voice` skill before writing any string; report strings old → new. No hype, no exclamation marks. The plan page is "Practice plan"; a player is "your student" on teacher screens.
- `features/account` imports no feature. `server/` folders are server only.
- Schema changes: edit `src/lib/db/schema.ts`, run `npm run db:generate`, apply with `npm run db:migrate` only against the local Docker database (`docker start musickit-db`; check `DATABASE_URL` first: `.env.local` points at Supabase). Never migrate or write Supabase.
- Other sessions have uncommitted work in this checkout (among it `src/app/api/account/route.ts`, `src/features/account/ui/AccountPanel.tsx`, `src/features/account/README.md`, `tasks.txt`). Never `git add` in the main checkout: commit your own files through a temporary `GIT_INDEX_FILE`. Leave others' hunks alone; if a file you must change has their edits, change it and commit only if the whole file can go, else report it.
- `npx tsx` hangs here: use the cached tsx (`ls ~/.npm/_npx/*/node_modules/.bin/tsx`). Type check: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. eslint on changed files.
- Keep each feature's `README.md` and `CLAUDE.md` true in the same commit as the change.

## Review Focus

1. A student has the app open while the teacher makes the next plan: the student's next save must be refused as stale and their page must load the teacher's plan, not overwrite it (Task 1, Task 5).
2. The claim link is opened twice, after it expired, or by an email scanner before the student: no second account, no error page without a way on; a used or dead link says so and offers Log in (Task 3, Task 9).
3. A teacher asks for a student that isn't theirs (another teacher's id, their own id, a random uuid): 404 on every student route, nothing read or written (Task 6).
4. A slider moved below what the ratings say, then the student rates Solid again: the score rises from the teacher's value, counting only ratings after the move (Task 4).
5. A student whose answers fit no library block (or too few for seven days): adding still makes the account and says the plan is short or missing; the teacher is never left with a half-made student they can't see (Task 3, Task 5).

---

### Task 1: A version on stored documents; a stale save is refused

**Files:**
- Modify: `src/lib/db/schema.ts` (`userDocuments`), `drizzle/` (generated)
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts`, `data.ts`
- Modify: `src/app/api/me/documents/[kind]/route.ts`
- Modify: `src/features/userData/client/docClient.ts`, `registry.ts`, `retry.ts` (as needed), `SaveNotice.tsx`, and the server plan store `src/features/plan/store/serverPlanStore.ts` and other callers of `putDocument`
- Test: `src/features/userData/server/data.test.ts`, `src/features/userData/client/docClient.test.ts`, `src/features/plan/store/serverPlanStore.test.ts`

**Interfaces:**
- Produces:
  - column `user_documents.version integer not null default 0`
  - `UserDataRepo.getDocVersioned(userId, kind): Promise<{ data: unknown; version: number } | null>`
  - `UserDataRepo.putDoc(userId, kind, data, now, expect?: number): Promise<{ ok: true; version: number } | { ok: false; version: number }>`: writes and adds 1 to the version in one statement; with `expect` given, writes only when the stored version equals it (no row counts as version 0).
  - `writeDoc(repo, userId, kind, raw, now, expect?: number): Promise<{ ok: true; version: number } | { ok: false; error: "too-big" | "bad-kind" | "stale"; version?: number }>`
  - `readDocVersioned(repo, userId, kind): Promise<{ data: unknown; version: number }>` (parsed; 0 when none)
  - `GET /api/me/documents/<kind>` answers `{ data, version }`; `PUT` takes `{ data, version? }`, answers `{ ok: true, version }` or 409 `{ error, code: "stale", version }`.
  - `SaveStatus` gains `"stale"`.

- [ ] **Step 1: Failing server tests** in `data.test.ts`: `writeDoc` returns version 1 then 2; `writeDoc(..., expect: 0)` after one write returns `{ ok: false, error: "stale", version: 1 }` and the stored data is unchanged; without `expect` it always writes (old tabs keep working); the plan side effects (`storePlanBlocks`) don't run on a stale write.
- [ ] **Step 2: Run** `tsx --test src/features/userData/server/data.test.ts`, expect FAIL.
- [ ] **Step 3: Implement** schema column, both repos, `writeDoc`, `readDocVersioned`, the route. `npm run db:generate`; migrate the local database.
- [ ] **Step 4: Failing client tests** in `docClient.test.ts`: the client sends the version it last read or was answered (`DocClientOpts.version: number` to start from, `put(body, init)` now sends `{ data, version }`); after an ok answer it sends the new version; a 409 with `code: "stale"` sets status `"stale"`, is not retried, and calls `opts.onStale?.()` once.
- [ ] **Step 5: Implement** in `docClient.ts`; the server plan store (and each other server-backed document store) passes the loaded version and an `onStale` that reloads the page with `window.location.reload()` after showing the line in `SaveNotice` (copy with ux-copy: says another device or your teacher changed your data, and that the page is loading the newer version). Two tabs of one player now meet this too: that is intended.
- [ ] **Step 6: Run** the three test files, tsc, eslint. Expect PASS, clean.
- [ ] **Step 7: Commit** `feat(userData): version on documents; a stale save is refused`

### Task 2: The link table, the `taught` subscription, the claim token kind, the `students` feature

**Files:**
- Modify: `src/lib/db/schema.ts`, `drizzle/` (generated, plus the hand-added row insert), `scripts/db-wipe*.mjs` if they list tables
- Modify: `src/features/account/model.ts`, `plans.ts`, `server/repo.ts`, `server/repo.drizzle.ts`, `server/repo.memory.ts`, `server/auth.ts` (`toAccount`)
- Test: `src/features/account/model.test.ts`, `plans.test.ts`, `server/auth.test.ts`

**Interfaces:**
- Produces:
  - table `teacher_students`: `teacher_id uuid not null → users.id on delete cascade`, `student_id uuid not null unique → users.id on delete cascade`, `created_at`, `claimed_at` (null until claimed); primary key (`teacher_id`, `student_id`).
  - `authTokenKind` gains `"claim"`; `TokenKind = "email_link" | "signup" | "claim"`.
  - a `plans` row written by the migration: id `taught`, name "Student of a teacher", role `student`, 0 cents, `trial_days` 0, `students` 0, `autoplans_per_month` 0, `enabled` false, `sort` 99. `export const TAUGHT_PLAN_ID = "taught"` in `plans.ts`.
  - `Account.taught: boolean` (`toAccount`: `u.planId === TAUGHT_PLAN_ID`); `isAccount` accepts accounts without it.
  - `FEATURES.students = ["teacher", "owner"]`; `FEATURES.dailyPlan` is not added: the plan page reads `account.taught`.
  - `AuthRepo`: `addStudent(teacherId, studentId, now): Promise<void>`, `studentsOf(teacherId): Promise<{ user: UserRow; createdAt: Date; claimedAt: Date | null }[]>` (newest first), `studentLink(teacherId, studentId): Promise<{ createdAt: Date; claimedAt: Date | null } | null>`, `markClaimed(studentId, now): Promise<void>` (only while null), `teacherOf(studentId): Promise<UserRow | null>`.

- [ ] **Step 1: Failing tests**: `can(teacherAccount, "students")` true, student false, null true; `toAccount` sets `taught`; memory repo: `addStudent` then `studentsOf` lists it, `studentLink` of another teacher is null, `markClaimed` twice keeps the first time; `choosablePlans` never offers `taught` to someone not on it (it is `enabled: false`).
- [ ] **Step 2: Run**, expect FAIL. **Step 3: Implement** (schema, generate, add the `insert into plans ... on conflict do nothing` to the generated SQL, migrate locally). **Step 4: Run** account tests, tsc, eslint.
- [ ] **Step 5: Commit** `feat(account): teacher_students, the taught subscription, claim tokens`

### Task 3: Adding a student and the claim link (rules, no HTTP)

**Files:**
- Create: `src/features/students/server/students.ts`, `students.test.ts`, `mail.ts`, `mail.test.ts`
- Create: `src/features/students/README.md`, `CLAUDE.md`
- Modify: `package.json` (`test` script: add `src/features/students/*/*.test.ts`)

**Interfaces:**
- Consumes: Task 2's repo methods; `AuthDeps`, `hashToken`, `startSession` (export it from `account/server/auth.ts`), `cleanEmail`, `isEmail`, `cleanName`, `migrateAnswers`; `writeDoc`/`readDocVersioned`; `recordAnswers`; Task 5's `makeWeek` is called by the route, not here.
- Produces:
  - `CLAIM_TTL = 30 days`.
  - `addStudent(deps: { auth: AuthDeps; userData: UserDataRepo }, teacher: Account, input: { name: unknown; email: unknown; answers: unknown }): Promise<{ ok: true; studentId: string; claimToken: string } | { ok: false; error: "name" | "email" | "exists" | "limit" | "answers" | "not-teacher" }>`. Order: `can(teacher, "students")`; name and email valid; answers through `migrateAnswers` with at least one area and no `areasMissingTopics`; limit (the teacher's `plans.students`: null no limit, else refuse at `studentsOf().length >= students`; a teacher with no plan row is refused as `limit`); `userByEmail` exists → `exists`; `createUser` (role student) → null means a race → `exists`; `setUserPlan(id, "taught", "year", "student")`; `addStudent` link; write the student's plan document `{ ...EMPTY_STATE, answers }` passed through `recordAnswers(state, answers, now)`; a `claim` token (`next: "/welcome"`, expires `now + CLAIM_TTL`).
  - `listStudents(deps, teacher): Promise<{ students: StudentRow[]; limit: number | null }>` with `StudentRow = { id: string; name: string; email: string; addedAt: string; claimedAt: string | null }`.
  - `newClaimLink(deps, teacher, studentId): Promise<{ ok: true; email: string; name: string; claimToken: string } | { ok: false; error: "not-found" | "claimed" | "wait" }>`: only for the teacher's own unclaimed student; at most one a minute per student (`lastTokenAt(email, "claim")`).
  - `peekClaim(deps, token): Promise<{ name: string } | null>` and `openClaim(deps, token, userAgent): Promise<SignedIn | null>`: `takeToken(hash, "claim", now)`, find the user by the token's email, `markClaimed`, `startSession(..., next "/welcome")`. Null for a used, expired or unknown token.
  - `claimEmail(to, studentName, teacherName, link, env)` → `{ from, to, subject, text, html }` like `linkEmail` in `account/server/mail.ts`; `claimUrl(base, token) = ${base}/claim?token=…`.

- [ ] **Step 1: Failing tests** over `memoryAuthRepo` + `memoryUserDataRepo`: a student is made on `taught`, `needsSetup` false, the document holds the answers and one `answersHistory` entry; each error in the order above; the limit counts unclaimed students; `exists` leaves no link and no document; `openClaim` signs in once, a second open is null, an expired one is null, and `claimedAt` is set; `newClaimLink` refuses another teacher's student (`not-found`), a claimed one, and a second ask inside a minute; a teacher adding their own email → `exists`.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** Write the email's words with ux-copy (subject names the teacher: who it is from is why the student opens it). **Step 4: Run**, tsc, eslint. Write README (what, where) and CLAUDE.md (the access rule, the comment rule, "no HTTP in `server/students.ts`").
- [ ] **Step 5: Commit** `feat(students): add a student and the claim link`

### Task 4: A teacher's score for a topic, in the model

**Files:**
- Modify: `src/features/plan/model/types.ts`, `state.ts`, `outcome.ts`, `topicLevels.ts`
- Create: `src/features/plan/model/teacherScores.ts`, `teacherScores.test.ts`
- Test: `outcome.test.ts`, `topicLevels.test.ts`, `state.test.ts`

**Interfaces:**
- Produces:
  - `interface TeacherScore { topic: string; score: number; at: string }` (`at` ISO datetime); `PlanState.teacherScores: TeacherScore[]` (oldest first, `EMPTY_STATE` has `[]`); `MAX_TEACHER_SCORES = 500`; `cleanTeacherScores(raw): TeacherScore[]` (unknown topics dropped via `topicById`, score clamped to 0..3 and rounded to 0.1, broken entries dropped) used by `sanitiseState`.
  - `StoredPlan.teacher?: { madeAt: string; comment?: string }` (set on a week the teacher made; `comment` capped 2000 chars; kept by `sanitiseState`).
  - `setScores(s: PlanState, scores: Record<string, number>, at: string, now: Record<string, number | null>): PlanState`: appends one entry per topic whose value differs from `now[topic]` by 0.05 or more.
  - `scoreAt(scores: TeacherScore[], topic: string, asOf: string): TeacherScore | null`: the newest entry for the topic dated on or before the end of local day `asOf`.
  - `OutcomeInput.teacherScores?: TeacherScore[]`. In `topicOutcome`, with a teacher entry `T` at `t`: `concepts` for the score are built from the ratings dated after `t` only; `{ reached, score }` come from `scoreOf(those, floor(T) as Rung, …)` and the score is `max(T, that)`; `reached` is `max(floor(T), that reached)`. `ratings` and `concepts` shown on the topic stay all-time. No entry: as today.
  - `raisedAnswers(answers, entries, asOf, teacherScores?: TeacherScore[])`: for a topic with a teacher entry, the start level is `floor(T)` (not the answer) and only entries after `t` raise it.

- [ ] **Step 1: Failing tests**: a topic answered 1 with solid ratings reaching 2, teacher sets 0.5 → score 0.5, reached 0; one more solid rating after `t` that completes level 1 → reached 1; teacher sets 2.4 on a topic with no ratings → 2.4; a teacher value never lowers below itself with later low ratings; an untouched topic equals today's outcome (compare with and without `teacherScores` for other topics); `outcome(..., asOf)` before `t` ignores the entry; `raisedAnswers` with `T = 2.4` gives rung 2; `setScores` skips unmoved sliders; `sanitiseState` round-trips `teacherScores` and `teacher`.
- [ ] **Step 2: Run** `tsx --test src/features/plan/model/*.test.ts`, FAIL. **Step 3: Implement.** **Step 4: Run**, tsc, eslint. Update `src/features/plan/README.md`.
- [ ] **Step 5: Commit** `feat(plan): a teacher's score counts as the topic's score from then on`

### Task 5: A week for a student, made and stored on the server

**Files:**
- Create: `src/features/plan/server/composeStudentWeek.ts`, `composeStudentWeek.test.ts`
- Modify: `src/features/plan/model/schedule.ts` (+ `schedule.test.ts`), `src/features/plan/server/composeToday.ts` (export `candidateOf`, pass `teacherScores` to `raisedAnswers`)
- Create: `src/features/students/server/plans.ts`, `plans.test.ts`

**Interfaces:**
- Consumes: `composeWeek`, `candidateOf`, `solidRatedAt`, `raisedAnswers`, Task 1 `readDocVersioned`/`writeDoc(expect)`, Task 4 `setScores`/`scoreAt`, `outcome`.
- Produces:
  - `giveWeek(s: PlanState, days: ComposedDay[], meta: { start: string; madeAt: string; title: string; replace?: string }, newId: () => string): PlanState` in `schedule.ts`: a `StoredPlan` (`startedOn: start`, `teacher: { madeAt }`, exercises through `storedConfig`, each day's `theme` `""`) at the front of `given`. With `replace` (a plan id in `given`), that plan leaves `given` and goes to the front of `history` (cap `HISTORY_CAP`), its ratings kept on it.
  - `teacherWeek(s: PlanState, date: string): StoredPlan | null`: the newest `given` plan with `teacher` set; `teacherWeekOn(s, date)`: the one whose seven days cover `date`, else null.
  - `composeStudentWeek(d: { library: LibraryRepo; userData: UserDataRepo }, studentId: string, body: { start: string; seed: string }, state: PlanState): Promise<{ ok: true; days: ComposedDay[]; short: boolean } | { ok: false; code: "no-answers" | "no-blocks" }>`: the same inputs as `composeToday` (blocks, `solidRatedAt`, `raisedAnswers` with `state.teacherScores`), `composeWeek(..., 7)`; `no-blocks` when every day is empty; `short` when any day is.
  - `makeWeek(d, teacher: Account, studentId: string, input: { today: string; rotate: boolean; scores?: Record<string, number>; comment?: string }, now: Date, newId: () => string): Promise<{ ok: true; planId: string; start: string; short: boolean } | { ok: false; error: "not-found" | "no-answers" | "no-blocks" | "busy" }>` in `students/server/plans.ts`: link check (`studentLink`) → read the document with its version → `setScores` (against `studentView`'s scores now) → the comment onto the current teacher week (`teacherWeekOn(today) ?? teacherWeek`) → start: rotate = that week's `startedOn` (or `today` with none), next = the day after its last day, or `today` when it has ended or there is none → compose (seed `${studentId}:${start}:${madeAt}`) → `giveWeek` (rotate passes `replace`) → `writeDoc(..., expect: version)`; on `stale` read again and retry, three tries, then `busy`.
  - `studentView(d, teacher, studentId, today): Promise<{ ok: true; student: StudentRow; plan: StoredPlan | null; topics: { topic: string; label: string; area: Area; now: number; atStart: number | null }[] } | { ok: false; error: "not-found" }>`: `topics` are the topics of the student's areas; `now` is `outcome(...).score ?? 0` today; `atStart` the score as of the day before the current week's `startedOn` (null with no week). `plan` has every `teacher.comment` removed? No: the teacher wrote it, so the teacher may read it back; it is stripped only for the student (Task 9).

- [ ] **Step 1: Failing tests**: `giveWeek` puts a 7-day plan first in `given` and leaves `current`/`history`; with `replace` the old week is first in `history` with its `rated` intact; `makeWeek` next after a running week starts the day after its last day, after an ended week starts today, rotate keeps `startedOn` and replaces; scores are recorded only for moved sliders and the composed week is paced by them (a topic set to 2 gets intermediate steps: assert via the `raisedAnswers` rung handed to a stubbed library); the comment lands on the week that was current, never on the new one; another teacher → `not-found` and nothing written; a document changed between read and write is retried and the student's change survives (memory repo with a hook that bumps the version once); `no-blocks` writes scores? No: nothing is written when no plan could be made (assert the document is unchanged).
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run** plan + students tests, tsc, eslint.
- [ ] **Step 5: Commit** `feat(students): make a student's week on the server`

### Task 6: The routes

**Files:**
- Create: `src/app/api/students/route.ts` (GET list, POST add), `src/app/api/students/[id]/route.ts` (GET view), `src/app/api/students/[id]/claim-link/route.ts` (POST), `src/app/api/students/[id]/plan/route.ts` (POST next or rotate), `src/app/api/auth/claim/route.ts` (POST open)
- Create: `src/features/students/server/http.test.ts` (route handlers called with `Request`s over memory deps, as `account/server/http.test.ts` and `userData/server/http.test.ts` do)

**Interfaces:**
- Consumes: Tasks 3 and 5. `signedIn(req)`, `json`, `readJson`, `baseUrl`, `sendMail`, `resultCookies`.
- Produces (JSON, every error body `{ error: string, code: string }`, the words written with ux-copy):
  - `GET /api/students` → `{ students, limit }`; 403 `not-teacher`.
  - `POST /api/students` `{ name, email, answers, today }` → adds, makes the first week (`makeWeek`, `rotate: false`), mails the claim link → 200 `{ student, plan: "made" | "short" | "none", mail: "sent" | "off" }`. The student is kept when the plan or the mail fails; the answer says which, so the page can say what to do ("Make a plan from the student's page", "Send the link again"). 409 for `exists`, `limit`; 400 for `name`, `email`, `answers`.
  - `GET /api/students/<id>?today=yyyy-mm-dd` → `studentView`; 404 `not-found`.
  - `POST /api/students/<id>/claim-link` → mails a new link; 409 `claimed`, 429 `wait`, 404.
  - `POST /api/students/<id>/plan` `{ today, rotate, scores, comment }` → `makeWeek`; 409 `no-blocks` / `no-answers` / `busy`, 404.
  - `POST /api/auth/claim` `{ token }` → `openClaim`; 200 `{ next }` with the session cookies, or 410 `{ code: "gone" }`. `GET /api/auth/claim?token=` → `{ name }` from `peekClaim` or 410 (the page shows who it is for before anything is spent, so an email scanner's GET spends nothing).
- `today` is checked as in `composeToday` (`isRealDate`, within a day of the server's date; export that check).

- [ ] **Step 1: Failing tests**: Review Focus 3 for each `[id]` route (another teacher's student, own id, random uuid, a non-uuid → 404, and the memory repos unchanged); a student account calling any `/api/students` route → 403; POST without same origin → 403; signed out → 401; add over the limit → 409 `limit`; `mail: "off"` when `sendMail` is off still 200.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement**; in development with mail off, log the claim link to the console (the one allowed exception, as for the log-in link). **Step 4: Run**, tsc, eslint.
- [ ] **Step 5: Commit** `feat(students): routes for students, their plans and the claim link`

### Task 7: The Students page and adding a student

**Files:**
- Create: `src/app/students/page.tsx`, `src/features/students/ui/StudentsApp.tsx`, `AddStudent.tsx`, `src/features/students/client.ts` (typed fetches with a 20 s timeout, `accountHeaders`), `src/features/students/ui/StudentsApp.test.tsx`
- Modify: the app nav (find where `/plan` is listed for the bar and where `can("sharePlan")` gates a control) to show "Students" when `can("students")`; `src/features/plan/intake/ui/Questionnaire.tsx` only if a line must say "your student"

**Interfaces:**
- Consumes: Task 6 routes; `questionSteps(draft, set)`; the modal the plan flow uses (`PlanFlow.tsx` shows how steps are hosted); `useAccount().can`.
- Produces: `/students`: the list (name, email, "Not opened yet" or the date they first opened the link, a link to the student's page, "Send the link again" for an unclaimed one), "n of m students" when there is a limit, "Add a student". Adding: step one name and email (both required, checked before the questionnaire opens), then the questionnaire steps with a `forStudent` wording where a line says "you" (pass a flag into `questionSteps`; default wording unchanged), then one request; the result line says what happened for the plan and the email. An account that can't (`!can("students")`) gets the not-for-you state with a link to `/account`, not a blank page.

- [ ] **Step 1: Failing render tests** (as `GivenPlan.test.tsx` does): the empty state has one line and the Add button; a full list disables Add and says why; an `exists` answer shows its line under the email field and keeps what was typed; a failed list load shows an error with Try again.
- [ ] **Step 2: Implement**, strings with ux-copy + "Words about the app". **Step 3: Run** tests, tsc, eslint. **Step 4: Read it on the dev server** signed in as a teacher on the local database (memory: local login + DB; back up and restore the browser's localStorage keys), at desktop and phone width.
- [ ] **Step 5: Commit** `feat(students): Students page, add a student`

### Task 8: A student's page: their plan, and the next one with sliders

**Files:**
- Create: `src/app/students/[id]/page.tsx`, `src/features/students/ui/StudentPage.tsx`, `TopicSliders.tsx`, `src/features/students/model/sliders.ts`, `sliders.test.ts`, `StudentPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/students/<id>`, `POST …/plan`; `GivenPlanView` from `src/features/plan/GivenPlan.tsx` (read-only: `onRate`, `onTime`, `onEdit` no-ops, no `controls`; if it can't be made read-only by props, add a `readOnly` prop there); `AREA_LOOK`.
- Produces:
  - `sliders.ts`: `LEVEL_MARKS = ["New", "Beginner", "Intermediate", "Advanced"]`, `STEP = 0.1`, `moved(start: Record<string, number>, now: Record<string, number>): Record<string, number>` (only topics changed by ≥ 0.05), `levelWord(score): string` ("Beginner, 40% to Intermediate" style, final words by ux-copy).
  - The page: the student's name; the current week drawn as the student sees it, read-only (or "No plan yet" with the button to make one); then "Next plan": one slider per topic grouped by area, 0 to 3 step 0.1, opening at `now`, a tick at `atStart`, the level words under the scale; the box "Anything else about this week?"; two buttons, "Make next week's plan" and "Rotate this week's plan" (the second only with a current week). After either: the page loads the view again and says what was made and from which date; the comment box empties. Rotate asks once before replacing (it removes the plan the student may be in). Mock-up, normal view only: `.superpowers/brainstorm/73040-1794902915/content/teacher-sliders.html` if it is still on disk.

- [ ] **Step 1: Failing tests**: `moved` and `levelWord`; the page sends only moved sliders; a 409 `no-blocks` shows its line and keeps the sliders where the teacher put them; Rotate is absent with no week; a 404 shows the not-found state with a link back to Students.
- [ ] **Step 2: Implement.** Sliders are native `input type="range"` with a visible value and a label per topic (keyboard and screen reader work without extra code). **Step 3: Run**, tsc, eslint. **Step 4: Read it on the dev server**, both widths, both themes.
- [ ] **Step 5: Commit** `feat(students): a student's plan and the next plan with sliders`

### Task 9: The student's side: claim, welcome, and /plan

**Files:**
- Create: `src/app/claim/page.tsx`, `src/features/students/ui/ClaimLink.tsx`, `src/app/welcome/page.tsx`, `src/features/students/ui/Welcome.tsx`
- Modify: `src/lib/publicPaths.ts` (`/claim` public), `src/features/plan/PlanApp.tsx`, `src/features/plan/ui/useTodayPlan.ts`, `src/features/plan/model/today.ts` (+ test), `src/features/plan/model/state.ts` or the plan store's load (strip `teacher.comment` before the student's page sees it: do it in `GET /api/me/documents/plan`'s answer, keeping it in the database, and make `writeDoc` put the stored comments back onto the same plan ids so a student's save can't erase them; test both in `data.test.ts`)
- Test: `src/features/plan/DayPlan.test.tsx` or a new `TaughtPlan.test.tsx`, `today.test.ts`, `data.test.ts`

**Interfaces:**
- Consumes: `GET`/`POST /api/auth/claim`; `Account.taught`; `teacherWeekOn`, `teacherWeek`; `GivenPlanView`/`GivenPlan`.
- Produces:
  - `/claim?token=`: shows "This is <name>'s attunr account" and one button (the GET spent nothing); the button POSTs, then `window.location.replace(next)`. A dead link (410): one line saying the link was used or is too old, with Log in (their email already has the account, so the normal email link signs them in) and "ask your teacher to send it again". Built like `account/ui/ConfirmLink.tsx`.
  - `/welcome` (stub, the user's word): greets by name, says their teacher made a plan, one link "Open your practice plan" to `/plan`. Signed-in page; an account that isn't `taught` is sent to `/plan`.
  - `/plan` for `account.taught`: no questionnaire, no composing (`useTodayPlan` gets `off: true` and asks nothing), no "Get another plan", no "Change my answers". It draws the teacher's week covering today (`teacherWeekOn`), else the newest one, through the same view `/plan/given/<id>` uses, with ratings and the timer working (`updateGiven`). With no week: one line that their teacher hasn't made a plan yet. Older teacher weeks are listed under it as links to `/plan/given/<id>`. `GivenPlans` ("Plans shared with you") leaves out plans with `teacher` set.

- [ ] **Step 1: Failing tests**: the decision in `today.ts` (taught → never compose, whatever the state); the taught page draws the covering week and no composer controls; the document GET has no `comment`; a student save keeps the stored comment; the dead-link state.
- [ ] **Step 2: Implement**, strings with ux-copy. **Step 3: Run**, tsc, eslint. **Step 4: Walk it on the dev server**: add a student as a teacher, open the logged claim link in a private window, land on `/welcome`, open the plan, rate one exercise; then make the next plan as the teacher and see the student's open tab take the newer version (Review Focus 1).
- [ ] **Step 5: Commit** `feat(students): claim link, welcome page, a taught student's plan page`

### Task 10: The sliders on /dev/questionnaire

**Files:**
- Modify: `src/features/devtools/questionnaire/QuestionnaireLab.tsx` (and its model/test files beside it)

**Interfaces:**
- Consumes: `TopicSliders`, `outcome`, `setScores`, `raisedAnswers`; the lab's sample students.
- Produces: a "Teacher sliders" view on three sample students (brand new; a few weeks in; many ratings): what each slider opens at, the start-of-plan tick, and, after a slider is moved, what the plan maker receives (the levelled answers' rung per topic, before → after).

- [ ] **Step 1: Failing test** for the pure part (the before → after rungs for a moved slider on each sample). **Step 2: Implement.** **Step 3: Run** devtools tests, tsc, eslint; read `/dev/questionnaire` on the dev server.
- [ ] **Step 4: Commit** `feat(devtools): teacher sliders on /dev/questionnaire`

### Task 11: Documents

**Files:**
- Modify: `src/features/students/README.md`, `CLAUDE.md`, `src/features/account/README.md` + `CLAUDE.md` (the `students` feature, `taught`), `src/features/plan/README.md` + `CLAUDE.md` (a taught student's `/plan`, `teacher` on a given plan, `teacherScores`), `src/features/userData/README.md` + `CLAUDE.md` (versions, the stale save), `docs/db/schema.svg` (`npm run db:diagram`), `tasks.txt` (dated notes under TeacherStudentFlow1 and 2; leave the user's other edits)

- [ ] **Step 1:** Write them. **Step 2:** `npm test` whole suite, tsc, eslint on every changed file. **Step 3: Commit** `docs(students): READMEs, rules, schema diagram`
