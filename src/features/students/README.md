# Students

A teacher adds a student by name, email and the answers to the first questionnaire. That makes a normal account for the
student (role student, on the `taught` plan, so no setup), a `teacher_students` link, and a plan document that holds the
answers. The student signs in the first time with a claim link, mailed by the teacher's route.

## Parts

- `server/students.ts`: the rules. `addStudent` (checks in a fixed order: role, name, email, answers, plan limit, an email that already has an account; a step that fails after the account is made deletes the account again), `listStudents` (newest first, with the plan's limit), `newClaimLink` (the teacher's own unclaimed student, one a minute), `peekClaim` and `openClaim` (the claim token is used once, signs in, records `claimedAt`, goes to `/welcome`), `CLAIM_TTL` (30 days).
- `server/mail.ts`: `claimEmail` and `claimUrl` (`/claim?token=`). Sent with `sendMail` from `features/account/server/mail.ts`.
- The limit is the teacher's own plan row: `students` null is no limit; no plan row, or 0, is no places.
- Tests: `server/*.test.ts` over `memoryRepo` and `memoryUserDataRepo`.
