# Notes

A teacher's page of words and widgets: one block. Behaviour: `spec/notes.md`.

- `NotesApp.tsx`: the notes creator page (the editor from `@/features/plan/ui/editor`, the studio's palette in notes mode, Share, View
  as a note, Edit as JSON). A `#note=` link opens `NoteView` instead.
- `NoteReader.tsx`: `NoteReader` (a note read as an article) and `NoteView` (a shared link).
- `PresetNote.tsx`, `presetNotes.ts`, `presetInfo.ts`: the notes made ahead at `/note/<slug>`.
- `NotesEditorHost.tsx`: the studio's family controls and palette as an `EditorHost` (plan/ui/editor), for block editors on other pages (`/plan`'s day editor).
- `NoteViewMode.tsx`: View as a note, shared by the page's header and the creator.
- `model/note.ts`: the link codec, the empty note, `cellFromSubject`, `blockFromStage`, `notePageParts`. `model/noteStore.ts`:
  `NoteStore` and `localNoteStore` (`musickit.note`).
