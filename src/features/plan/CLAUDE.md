# AI practice plan: rules

What it is and where things live: `README.md`. Keep it up to date with every change.

- **Data goes through `PlanStore`** (`store/PlanStore.ts`). Components use `usePlan()` (or `usePlanStore()` for a reader outside it, like `PracticeReminder`), never `localStorage` or a store module directly: `UserDataProvider` picks the store (server, memory or local). Nothing reads `musickit.plan.backup`; no backup is kept.
- **Pure logic in `model/`** with tests (`model/plan.test.ts`): the prompt, parsing a pasted plan, links, tools, the schedule. No React there.
- Links in a plan must be attunr paths from `model/catalogue.ts`; unknown ones are dropped on paste.
- Exercise components live in `src/features/exercises` (see its README and CLAUDE.md). Their docs come from each `*.props.ts` via `npm run docs:exercises`; the plan only parses them in `model/tools.ts` (the single source for cells, the choice, tags and link resources; the prompt's interface is generated from `COMPONENT_DOCS`, never hand-listed). Nothing old is read (no migration of tool names or shapes). Nothing embedded may write the address bar.
- **Share plan** shares the stored plan, so it flushes the store first (`PlanStore.flush`) and refuses while the latest change hasn't landed. The invite page claims, then loads `/plan?added=<planId>` with a full page load (`window.location.replace`), never a client navigation: the plan store is per session and keeps the document it read. A plan's live invites are never drawn as links in the popover (opening one claims it).
- The flow modal never closes except with its Close button, and its progress survives a reload.
- Flow copy follows the teaching-voice skill's "Words about the app": name who acts in each sentence, never a bare "it". Players have no outside-AI route to a plan (no prompt to copy, no AI extension writing it): flow copy never asks them to run an AI.
- **The block editor (`ui/editor/`) changes a block only through `editBlock`** (`model/editBlock.ts`, pure, tested): cells are addressed by path, every cell has an `id` (`withIds`). It receives a `Block` and callbacks, never `ExerciseMeta`; a host gives a tool cell its controls (`toolControls`), the editor imports nothing of the studio.
- **A block id is computed, never trusted** (`withBlockIds`, `model/blockId.ts`): content and tags only, cell ids left out; minutes, why and links are the slot's. It is made of the exercise as it is stored, after `cleanExercise` (`startPlan`, `editDay` and `sanitiseState` alike), so a save and reload never changes it.
- Every change: `tsx --test src/features/plan/model/*.test.ts`, `tsc --noEmit`, eslint on the feature.
