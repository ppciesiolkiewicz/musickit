# Students

A teacher adds a student by name, email and the answers to the first questionnaire. That makes a normal account for the
student (role student, on the `taught` plan, so no setup), a `teacher_students` link, and a plan document that holds the
answers. The student signs in the first time with a claim link, mailed by the teacher's route.

## Parts

- `server/students.ts`: the rules. `addStudent` (checks in a fixed order: role, name, email, answers, plan limit, an email that already has an account; a step that fails after the account is made deletes the account again), `listStudents` (newest first, with the plan's limit), `newClaimLink` (the teacher's own unclaimed student, one a minute), `peekClaim` and `openClaim` (the claim token is used once, signs in, records `claimedAt`, goes to `/welcome`), `CLAIM_TTL` (30 days).
- `server/plans.ts`: a teacher's student's weeks. `studentView` (the student's row, the current week the teacher made, `teacherWeekOn(today)` else the newest started, with the teacher's comment, and a slider per topic of the student's areas: `now`, the `outcome()` score today, 0 when nothing is known; `atStart`, the score the day before that week started, null with no week). `makeWeek` (the link checked first; then from the document read with its version: the moved sliders recorded with `setScores` against `now` (topics of the student's areas, finite, clamped 0..3; a value sent unchanged records nothing), the comment (trimmed, at most 2000 characters, empty changes nothing) on the current week, never the new one, the start (rotate: the running week's start, replacing it; next: the day after the running week's last day; no running week: today), seven days composed (`composeStudentWeek`, seed `studentId:start:madeAt`) and put first in `given` (`giveWeek`), written with the version read; a stale write starts again from a fresh read, three tries, then `busy`; `no-answers` and `no-blocks` write nothing at all).
- `server/mail.ts`: `claimEmail` and `claimUrl` (`/claim?token=`). Sent with `sendMail` from `features/account/server/mail.ts`.
- The limit is the teacher's own plan row: `students` null is no limit; no plan row, or 0, is no places.
- Tests: `server/*.test.ts` over `memoryRepo` and `memoryUserDataRepo`; `plans.test.ts` with the plan feature's `stubLibrary`.
