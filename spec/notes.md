# Notes

A note is one block (`@/features/plan` block format: a title, an optional choice, cells). Code: `src/features/teachers/notes`.
Design: `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md`. Plan: `docs/superpowers/plans/2026-11-13-blocks-editor.md`.

## The notes creator

`/teachers/studio?notes=1` (the Theory menu's **Notes creator**; `/cheatsheet`, `/creator` and `/theory/cheatsheet` redirect there),
in the site's page frame with its title and line. Three numbered steps over the editor.

- **The editor** (`BlockEditor`): the note's **Title** and its key bar (**Key**, **Scale**; a note with no key has **Add key**, which
  starts at C major) in the outer frame; under it one column of cells in reading order. A section is a frame of its own: its heading,
  its minutes, its choice's chips (a choice is edited in its JSON for now), its cells indented. Changing the key moves every tool that
  follows it (a tool that pins its key or scale keeps it; a section's own choice wins for the parts it sets).
- **A cell** is text (a plain box, extension-friendly as the studio's was), a notice, or a tool: the tool as the student sees it, and
  under it **Settings** (the palette family's controls, or "This widget has no settings here") and **JSON** (the whole tool, applied
  when the box is left and it reads, with the parser's notes). A placeholder video is a **Record this video** card that opens Add a
  video and takes the video picked.
- **The gutter** on every cell: the handle (drag), **Move up** and **Move down** (each named with the cell's kind and first words, for
  a keyboard or a browser AI); on hover or focus (always on a phone) **Add above**, **Add below**, **Delete**. Moving past a section's
  edge takes a cell out of it, or into the section beside it.
- **Add a widget** (`/` or ⌘K, never while typing) opens the studio's palette in notes mode: only rows that can be a cell (no Key &
  scale, Metronome, logo, camera…), plus **Section** (an empty frame) and the Video commands. A new cell goes after the selected one
  (inside its section when it is in one), or where Add above / Add below asked.
- **Kept** in this browser under `musickit.note` (`localNoteStore`, through `NoteStore`: the login project adds an API store). An
  empty note says "Nothing in this note yet." with Add a widget; Share is off until there is something in it.
- **Share as a note** is the demo popover (sharing isn't open yet). **View as a note** shows the note as its page draws it, the page's
  header becoming the note's own, with **Back to editing**. **Edit as JSON (dev)** opens the whole block as JSON; Apply reads it with
  `parseBlock` and lists what it left out.

## The browser's AI

With an AI extension in the browser (WebMCP), the notes creator offers it `get_authoring_guide` (the plan prompt's formats, rules
and examples without the student, plus what a note is; videos are never in it), `read_block` (the note as JSON) and `write_block`
(a whole note, read by `parseBlock`, shown at once; refused with no cells). A line over the editor says what to ask it, with Copy.
`/plan` offers the same guide and, while a plan runs, `read_plan`, `read_block`, `write_block`, `insert_block` and `remove_block`
(a rewritten exercise is a new one; a day keeps 2 to 5). Never on the studio.

## Reading a note

- **A shared link** `…?notes=1#note=<b|c><base64url>` (the block's JSON, deflated `b` or plain `c`) opens the note to read: the key
  bar, the Your voice picker when it sings, the reader's article, **Make your own note**. A link made before notes were blocks (`z`,
  `j`) says the note was made with an older version; a broken one says it could not be opened.
- **Preset notes** `/note/<slug>` (`presetNotes.ts`, written as block JSON and read by the same parser): the header is the note's title
  and first text, the article the rest. `?edit=true` opens it in the notes creator; changes are kept in this tab only, so View the note
  shows them until a reload.

## Videos

A video cell is the plan's `video` tool: a library id, or in a note a `ref` to a recording kept in this browser or a placeholder.
The AI plan is not offered videos. Uploading recordings is the login project's (`docs/superpowers/specs/2026-11-13-supabase-login-design.md`).
