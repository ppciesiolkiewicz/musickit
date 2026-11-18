# Students: rules

- **No HTTP in `server/students.ts`.** It takes `AuthDeps` and the user-data repo, returns results, never reads a request or sets a cookie. A route calls it and mails the token.
- **A teacher reaches a student's data only through a `teacher_students` row** (`studentLink` / `studentsOf`), checked on the server in every route. Never trust a student id from a request without it.
- **The teacher's comment never reaches the student's screen**, and no label says who reads it.
- **A claim token is stored as its hash, used once, never logged.** It is returned raw only so the route can mail it.
- **No half-made student.** Anything after `createUser` that throws deletes the user again.
- `features/account` imports nothing from here; this feature imports account, userData and plan.
