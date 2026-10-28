# AI practice plan: rules

`/plan`: the player answers a questionnaire, copies a prompt into their own AI, pastes back a JSON plan of 7 days; one day opens per day, earlier days stay open. After day 7 (or day 7 done) the next prompt carries last weeks' done/skipped exercises and the player's notes.

- **Data goes through `PlanStore`** (`store/PlanStore.ts`): `load()` / `save()` of one `PlanState` document. Components use `usePlan()`, never `localStorage`. Today it is `localPlanStore` (`musickit.plan`); an API store is a new `PlanStore` passed with `PlanStoreProvider`. `PracticeReminder` (mounted in `PageShell`) reads `localPlanStore` directly, so swap it there too.
- **Pure logic in `model/`** with tests (`model/plan.test.ts`): the prompt, parsing a pasted plan, links, the schedule. No React there.
- Links in a plan must be attunr paths from `model/catalogue.ts`; unknown ones are dropped on paste. A new page the AI should use goes in the catalogue (theory sections are picked up automatically).
- Reminders are browser notifications while a tab is open (checked once a minute); there is no push server.
