# Students: rules

- **No HTTP in `server/students.ts` or `server/plans.ts`.** They take `AuthDeps` and the user-data repo (and the library, for a week), return results, never read a request or set a cookie. A route calls them and mails the token.
- **A teacher reaches a student's data only through a `teacher_students` row** (`studentLink` / `studentsOf`), checked on the server in every route. Never trust a student id from a request without it.
- **The teacher's comment never reaches the student's screen**, and no label says who reads it.
- **A claim token is stored as its hash, used once, never logged.** It is returned raw only so the route can mail it.
- **No half-made student.** Anything after `createUser` that throws deletes the user again.
- `features/account` imports nothing from here; this feature imports account, userData, plan and the library's repo type.
