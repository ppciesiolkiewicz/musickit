# Reminders: rules

What it is and where things live: `README.md`. Keep it up to date with every change.

- Settings change only through `ReminderRepo` (`server/repo.ts`); the plan document holds no reminder.
- The run never throws: each player's failure is counted and the run goes on.
- A send is claimed (`claim`) before it goes and unclaimed if it fails, so no email goes twice and none is lost.
- Every reminder email has the unsubscribe link and the one-click headers.
- Whether today's plan wants a reminder, and its words, are the plan feature's (`plan/model/reminder.ts`).
- Copy through `design:ux-copy` and "Words about the app" in `teaching-voice`.
- Every change: `tsx --test src/features/reminders/*.test.ts src/features/reminders/server/*.test.ts`, tsc, eslint.
