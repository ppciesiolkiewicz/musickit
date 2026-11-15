# Progress

How the student says something went, and the record of it.

- `stars.ts`: the shared 1 to 5 scale ("Can't do it yet" … "Easy now") used on plan exercises and course sections.
- `log.ts`: the **progress log**: one `ProgressEntry` per rated plan exercise (plan id, exercise id, day, a copy of the
  exercise's title, focus, area, level, topic and concepts, the stars, when). `cleanEntries` makes a stored log safe,
  `upsert` and `without` change it; an exercise has at most one row, so a new rating replaces the old one and clearing
  the rating removes the row.
- `ProgressStore.ts`: where the log is kept: `list()`, `put(entry)`, `remove(exerciseId)`, async so an API can replace it.
- `serverProgressStore.ts`: `createServerProgressStore()`, a signed-in player's log on the server (`/api/me/progress`). Each `put` and `remove` is
  its own request through `withRetry` (`features/userData/client/retry.ts`), so it retries and shows in the save notice.
  An exercise has one sender that always sends its latest change, so a rating cleared while its request is out ends
  cleared. `list` lays any change not yet saved over what the server sent.
- `memoryProgressStore.ts`: `memoryProgressStore()`, a log for one visit that saves nothing (a visitor, the demo plan).
- `localProgressStore.ts`: one JSON list in localStorage under `musickit.progress`, only for the site without a database.
- `useProgress.tsx`: the hook the UI uses, and `ProgressStoreProvider` to swap the store. `UserDataProvider`
  (`features/userData`, root layout) picks the store by the data source; `DemoPlan` sets a memory one, so demo ratings
  never reach the real log.

The plan writes to the log when an exercise is rated (`features/plan/PlanApp.tsx`, rows built by
`features/plan/model/progressLog.ts`). Rows stay after a plan leaves the plan history. `/dev/data` shows only the data in this browser, not an account's log on the server.

This folder knows nothing about plans: ids and tags are plain strings.
