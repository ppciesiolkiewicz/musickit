# Students: rules

- **No HTTP in `server/students.ts` or `server/plans.ts`.** They take `AuthDeps` and the user-data repo (and the library, for a week), return results, never read a request or set a cookie. A route calls them and mails the token.
- **A teacher reaches a student's data only through a `teacher_students` row** (`studentLink` / `studentsOf`), checked on the server in every route. Never trust a student id from a request without it.
- **The teacher's comment never reaches the student's screen**, and no label says who reads it. The server takes it off the student's document GET and puts it back on their save (`features/userData/server/data.ts`); never send it to a student's page another way.
- **A claim token is stored as its hash, used once, never logged.** It is returned raw only so the route can mail it.
- **No half-made student.** Anything after `createUser` that throws deletes the user again; if that delete fails too, it is logged and the first error is thrown.
- **A claim link is mailed at most once a minute and 5 times a day per student** (`newClaimLink`), so a teacher can't have attunr mail an address over and over.
- `features/account` imports nothing from here; this feature imports account, userData, plan and the library's repo type.
- **No client file imports `server/`.** A shape both sides need goes in `model/types.ts`.
- The page words a failure by the route's own `error` line, or `CLIENT_WORDS` for the page's codes; every call has a timeout.
- **Only a slider the teacher moved is sent** (`moved` in `model/sliders.ts`): the server records a teacher's score for every topic it is sent, and that score holds the topic from then on.
- **A student's week on the teacher's page is read-only**: `GivenPlanView` without `onRate`, `onTime` or `onEdit`, so nothing runs or saves there. Replacing a running week (Rotate) asks first, in the app's `Modal`, never a browser dialog.
