# Notes

A teacher's page of words and widgets: one block. Behaviour: `spec/notes.md`.

- `NotesApp.tsx`: the notes creator page (the editor from `@/features/plan/ui/editor`, the studio's palette in notes mode, Share, View
  as a note, Edit as JSON, the page tour's `data-tour` targets `notes-*`). Share sends the waiting change and waits for it to land (`NoteStore.flush`; if it hasn't, the popover says so and nothing is shared), then shares the stored note through `SharePopover`.
- `NoteReader.tsx`: `NoteReader` (a note read as an article). A shared note's page is `src/app/notes/shared/[id]`: the frozen copy
  (`readNoteShare`, `userData/server/shares.ts`) in `NoteReader` under a memory `UserDataProvider`.
- `PresetNote.tsx`, `presetNotes.ts`, `presetInfo.ts`: the notes made ahead at `/note/<slug>`.
- `NotesEditorHost.tsx`: the studio's family controls and palette as an `EditorHost` (plan/ui/editor), for block editors on other pages (`/plan`'s day editor).
- `NoteViewMode.tsx`: View as a note, shared by the page's header and the creator.
- `model/note.ts`: the empty note, `cellFromSubject`, `blockFromStage`, `notePageParts`. `model/noteStore.ts`:
  `NoteStore` (with an optional `flush`), `localNoteStore` (`musickit.note`) and `memoryNoteStore`. `model/serverNoteStore.ts`: `createServerNoteStore` (the `note` document; `flush` sends a waiting save). `useNoteStore.tsx`: `NoteStoreProvider` and `useNoteStore()`, set by `UserDataProvider` for the data source.
