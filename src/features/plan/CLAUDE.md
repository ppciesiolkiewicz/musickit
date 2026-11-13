# AI practice plan: rules

What it is and where things live: `README.md`. Keep it up to date with every change.

- **Data goes through `PlanStore`** (`store/PlanStore.ts`). Components use `usePlan()`, never `localStorage`. `PracticeReminder` (mounted in `PageShell`) is the one exception: it reads `localPlanStore` directly.
- **Pure logic in `model/`** with tests (`model/plan.test.ts`): the prompt, parsing a pasted plan, links, tools, the schedule. No React there.
- Links in a plan must be attunr paths from `model/catalogue.ts`; unknown ones are dropped on paste.
- Exercise components live in `src/features/exercises` (see its README and CLAUDE.md). Their docs come from each `*.props.ts` via `npm run docs:exercises`; the plan only parses them in `model/tools.ts` (the single source for cells, the choice, tags and link resources; the prompt's interface is generated from `COMPONENT_DOCS`, never hand-listed). Nothing old is read (no migration of tool names or shapes). Nothing embedded may write the address bar.
- The flow modal never closes except with its Close button, and its progress survives a reload.
- Flow copy follows the teaching-voice skill's "Words about the app": name who acts in each sentence, never a bare "it". The AI a player runs in their browser is "AI extension" in every step and label (not "the extension", "the AI in your browser"); the copy-and-paste route is "any AI chat" / "your AI".
- **The block editor (`ui/editor/`) changes a block only through `editBlock`** (`model/editBlock.ts`, pure, tested): cells are addressed by path, every cell has an `id` (`withIds`). It receives a `Block` and callbacks, never `ExerciseMeta`; a host gives a tool cell its controls (`toolControls`), the editor imports nothing of the studio.
- Every change: `tsx --test src/features/plan/model/*.test.ts`, `tsc --noEmit`, eslint on the feature.
