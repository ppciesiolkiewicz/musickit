# Notes: rules

What it is and where things live: `README.md`; behaviour: `spec/notes.md` (keep both true with every change).

- **A note is a `Block`.** It is changed only through `editBlock` (`@/features/plan/model/editBlock`) and read only through the plan's
  reader. Nothing here knows exercise metadata.
- **Load and save go through `NoteStore`** (`model/noteStore.ts`). No component touches `localStorage` for the note.
- **`model/` is pure** and imports the stage's model by path (`@/features/stage/model/...`), never `@/features/stage`: a server page
  imports this feature, and the stage's index brings React context with it. The index exports only what pages need.
- Imports `@/features/plan` (model, reader, editor), the stage (model, `VideoPickContext`, `familyOf`), the studio's palette, family
  editor and share popover, and `@/features/videos`.
- Words on the screen: `design:ux-copy` with "Words about the app" (`teaching-voice`); the preset notes are teaching text.
- Every change: `tsx --test src/features/teachers/notes/*.test.ts src/features/teachers/notes/model/*.test.ts`, the plan model tests,
  `tsc --noEmit`, eslint, and a look at the page.
