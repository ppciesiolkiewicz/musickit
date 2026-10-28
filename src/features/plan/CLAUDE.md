# AI practice plan: rules

What it is and where things live: `README.md`. Keep it up to date with every change.

- **Data goes through `PlanStore`** (`store/PlanStore.ts`). Components use `usePlan()`, never `localStorage`. `PracticeReminder` (mounted in `PageShell`) is the one exception: it reads `localPlanStore` directly.
- **Pure logic in `model/`** with tests (`model/plan.test.ts`): the prompt, parsing a pasted plan, links, tools, the schedule. No React there.
- Links in a plan must be attunr paths from `model/catalogue.ts`; unknown ones are dropped on paste.
- Exercise tools stay a small set (`model/tools.ts`), each a view with no settings to touch (`ui/ExerciseTool.tsx`); nothing embedded may write the address bar.
- The flow modal never closes except with its Close button, and its progress survives a reload.
- Every change: `tsx --test src/features/plan/model/*.test.ts`, `tsc --noEmit`, eslint on the feature.
