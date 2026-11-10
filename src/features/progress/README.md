# Progress

How the student says something went, and the record of it.

- `stars.ts`: the shared 1 to 5 scale ("Can't do it yet" … "Easy now") used on plan exercises and course sections.
- `log.ts`: the **progress log**: one `ProgressEntry` per rated plan exercise (plan id, exercise id, day, a copy of the
  exercise's title, focus, area, level, topic and concepts, the stars, when). `cleanEntries` makes a stored log safe,
  `upsert` and `without` change it; an exercise has at most one row, so a new rating replaces the old one and clearing
  the rating removes the row.
- `ProgressStore.ts`: where the log is kept: `list()`, `put(entry)`, `remove(exerciseId)`, async so an API can replace it.
- `localProgressStore.ts`: the mock database for now: one JSON list in localStorage under `musickit.progress`
  (an account logged in on `/dev/account` has its own list, `musickit.progress@<id>`; see `features/account`).
- `useProgress.tsx`: the hook the UI uses, and `ProgressStoreProvider` to swap the store.

The plan writes to the log when an exercise is rated (`features/plan/PlanApp.tsx`, rows built by
`features/plan/model/progressLog.ts`). Rows stay after a plan leaves the plan history. `/dev/data` shows the log.

This folder knows nothing about plans: ids and tags are plain strings.
