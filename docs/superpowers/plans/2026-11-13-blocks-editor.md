# Block editor and the notes creator on it Implementation Plan (plan 4 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A note is one block. The notes creator becomes its own page on one notebook-style block editor (a column of cells, sections as frames, a gutter on every cell), stores and shares a block, and shared and preset notes read through the block reader (plan 2).

**Architecture:** Pure model first: the note's store seam and link codec (`src/features/teachers/notes/model/`), and the editor's reducer over a `Block` (`src/features/plan/model/editBlock.ts`, addressing cells by path). Then the reader side (preset notes as blocks, `/note/<slug>`, a shared link), then the editor UI (`src/features/plan/ui/editor/`), then the page that hosts it (`src/features/teachers/notes/NotesApp.tsx`), reusing the studio's palette to make cells. The studio loses its notes mode.

**Tech Stack:** TypeScript, React, Next.js 16, Tailwind, `@dnd-kit/core` + `@dnd-kit/sortable` (already in the repo); node:test through the cached tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md` ("What the teacher sees: the notes creator", "The format", "Interfaces", "How it gets made"). Earlier plans: 1 (format), 2 (`2026-11-13-blocks-reader.md`), 3 (`2026-11-13-blocks-tools.md`).

## Global Constraints

- A note is one `Block` (`{ title, choice?, cells }`), stored at `musickit.note` (the studio keeps `musickit.studio.stage`). Nothing old is read: a saved `musickit.studio.notes` stage is ignored, an old shared link opens with one line saying the note was made with an older version.
- Load and save of the note go through one module (`notes/model/noteStore.ts`, `NoteStore`): the login project will add an API store behind the same interface.
- The editor and the reader receive a `Block` and flags, never `ExerciseMeta` (design "Interfaces").
- "One column of cells, in reading order … no Grid / Free selector and no One per row switch." "The block is the outer frame: its title and its key bar … A section is a frame inside it." "The gutter on every cell: a handle (drag; Move up / Move down for a keyboard or a browser AI, named with the cell's kind and first words …), and on hover: add above, add below, delete." "Section is a row of the palette like any widget; it adds an empty frame." "Add a widget (`/`, ⌘K) opens the palette as today and adds a cell after the selected one, inside its section when it is in one."
- "The master key, hover tags for pinning, and the Layers list are gone from notes; the cell's follow / pinned tags and the step's choice do that job." When the key bar moves, every unpinned tool under it is rewritten to the new key and scale (design "Tools are stored complete").
- The text box keeps working with browser writing and AI extensions, as `TextWidget` does today (unscaled, a script-set value read by a native `input` listener).
- `/teachers/studio?notes=1` stays the notes creator's address (every link uses it); `/cheatsheet`, `/creator`, `/theory/cheatsheet` keep redirecting there.
- Every word on screen: `design:ux-copy` with "Words about the app" (`teaching-voice`); the preset notes' text is teaching text (`teaching-voice`, then `review-teaching-text`). Report strings old → new.
- Checked on the screen: the notes creator, a shared note, both preset notes, at desktop and phone width.

## Decisions (my call)

- **Videos in a note** (the user, 2026-11-13: "yes"): the plan's `video` tool also takes a teacher's recording or a placeholder: `{ "type": "video", "video": "<library id>" }` as today, or `{ "type": "video", "ref": { "source": "recording", "id", "title" } | { "source": "placeholder", "text"? } }`. Drawn as the studio's video widget draws them (`VideoPlayer`, the Record this video card through `VideoPickContext`). A recording stays in the browser (IndexedDB) in this plan; uploading to Blob storage with a `videos` row is the login project's (`docs/superpowers/specs/2026-11-13-supabase-login-design.md`, "Videos"), which adds an `upload` source to the same `ref`.
- **No videos in the AI plan** (the user: "for now we don't add videos to autoplan"): `video` leaves the prompt's tool interface and the which-tool guide (a `PROMPT_HIDDEN` list in `tools.ts`; the which-tool test skips it). The parser still reads it, so a note keeps working and a pasted plan with one keeps it.
- **Cells carry an `id`** (the design's call): a short random string, kept through edits, used for drag, selection and React keys; the parser keeps a given `id` and the editor makes one for a cell without.
- **A text cell is plain text.** Headings come from sections; `parseText` is not used in the editor. A text cell whose first line is `# …` is not special (the block's title is its own field).
- **Choices on sections are edited in the cell's JSON tab** in this plan; the header shows the chips as the reader does. (A teacher's choice editor is a later step.)
- **Key bar:** Key and Scale as in today's Key & scale widget (`KeyBar` from the creator, without "no key"); a block with no open choice shows **Add key** in the header, which sets `{ open: { key, scale } }` from C major.
- **The studio's Share as a note** converts its stage to a block (`blockFromStage`: tool → tool cell, text → text cell, headphones → notice, video → video tool, the rest dropped) and shares that.
- **Folder:** the page is `src/features/teachers/notes/` (`NotesApp`, `model/`); the editor is `src/features/plan/ui/editor/`.

## Review Focus

1. A cell moved down past the end of a section leaves the section and lands after it; moved up past a section's top it leaves to before it (Task 2 tests "moving across a section's edge").
2. The key bar moved to F♯ with a pinned-key tool and a section with its own choice: the pinned tool keeps its key, the tools under the section's choice follow the section (Task 2 "the key moves unpinned tools only").
3. A shared link from before (stage format) and a broken link: one line each, never a crash (Task 1).
4. An empty note (no title, no cells): the editor shows the empty state with Add a widget; View as a note shows the empty-note line; Share is disabled (Task 5).
5. Deleting the selected cell: selection moves to the next cell, or the previous one, or none (Task 2 "selection after delete").

---

### Task 1: The note's model: store seam, link, conversions

**Files:**
- Create: `src/features/teachers/notes/model/note.ts`, `noteStore.ts`, `note.test.ts`
- Modify: `src/features/plan/model/tools.ts` (the `video` tool's `ref`; `PROMPT_HIDDEN`), `src/features/plan/model/prompt.ts` and `prompt.test.ts` (no video), `src/features/exercises/basics/video/*` (view and props for `ref`), `src/features/plan/model/tools.ts` cell parse (keep `id`)

**Interfaces:**
- Produces:
  ```ts
  export const NOTE_KEY = "musickit.note";
  export const EMPTY_NOTE: Block; // { title: "", cells: [] }
  export async function encodeNote(block: Block): Promise<string>;   // "b" + base64url(deflate(JSON)) (or "c" plain when no CompressionStream)
  export async function decodeNote(s: string): Promise<{ block: Block } | { old: true } | { error: string }>; // "z"/"j" prefixes = old stage links
  export function noteFromHash(hash: string): string | null;          // "#note=…"
  export function blockFromStage(stage: Stage): Block;
  export function cellFromSubject(s: Subject): Cell | null;           // tool/text/headphones/video; else null
  export function newCellId(): string;
  // noteStore.ts
  export interface NoteStore { load(): Promise<Block | null>; save(block: Block): Promise<void> }
  export const localNoteStore: NoteStore;                              // musickit.note, try/catch, parsed by parseBlock
  ```
- [ ] **Step 1: Failing tests:** `toolInterface()` and the which-tool part do not name `video`, and `parseTool({ type: "video", video: <a library id> })` still parses; encode → decode round trip of a block with a section, a choice and a tool; a `z…` link → `{ old: true }`; `"%%"` → `{ error }`; `blockFromStage` of a stage with text, a scale-neck tool, headphones, a camera → text, tool, notice cells (camera dropped); `cellFromSubject({ kind: "chord" })` → null; video tool with `ref: { source: "recording", id: "r1", title: "Take 1" }` parses, with `ref: { source: "nope" }` drops with a reason; a cell `id` survives `parseBlock`.
- [ ] **Step 2: Run** `tsx --test src/features/teachers/notes/model/note.test.ts src/features/plan/model/*.test.ts` — FAIL.
- [ ] **Step 3: Implement.** `localNoteStore.load` returns null for a missing or unreadable value (the page starts empty).
- [ ] **Step 4: Run** — PASS; `npm run docs:exercises` (video props); tsc; eslint.
- [ ] **Step 5: Commit** `feat(notes): a note is a block: store, link and conversions`.

### Task 2: The editor's reducer

**Files:**
- Create: `src/features/plan/model/editBlock.ts`, `editBlock.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** a cell's place: [i] in the block's cells, [i, j] inside section i */
  export type CellPath = [number] | [number, number];
  export type EditAction =
    | { type: "insert"; after: CellPath | null; cell: Cell }          // null: at the end; after a section's own cell: inside it; a section is never put inside a section
    | { type: "remove"; at: CellPath }
    | { type: "move"; at: CellPath; dir: -1 | 1 }                      // across a section's edge: out of it, or into the section next to it
    | { type: "drop"; from: CellPath; to: CellPath }                   // a drag
    | { type: "update"; at: CellPath; cell: Cell }
    | { type: "title"; title: string }
    | { type: "key"; value: ChoiceOption };                            // the open choice; rewrites every unpinned tool under it (and not under a section's own choice for that part)
  export function editBlock(block: Block, a: EditAction): Block;
  export function pathOf(block: Block, id: string): CellPath | null;
  export function selectionAfterRemove(block: Block, at: CellPath): string | null;
  export function cellLabel(cell: Cell): string;                       // "Text: Two shapes that sit…", "Scale neck", "Section: Position 1"
  ```
- [ ] **Step 1: Failing tests:** insert after a top cell, after a cell inside a section (lands in it), after a section cell itself (first inside it), a section inserted inside a section (goes after that section); move up/down within a run; "moving across a section's edge" (down past the last cell of a section → right after the section; up from the first cell of the run after a section → into that section's end); drop between sections; "the key moves unpinned tools only": a scale-neck in C and a pinned-key arpeggio, key to F♯ → scale-neck in F♯, arpeggio unchanged, a tool in a section with its own `key` options unchanged; `selectionAfterRemove` (next, else previous, else null); `cellLabel` cuts text to 30 characters with "…".
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (pure; the key action uses `applyChoice` with `{ open: value }` and `follows`). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(plan): editBlock, the block editor's reducer`.

### Task 3: Notes read as blocks

**Files:**
- Modify: `src/features/teachers/studio/presetNotes.ts` → `src/features/teachers/notes/presetNotes.ts` (as blocks), `presetInfo.ts` (+ its test), `src/app/note/[slug]/page.tsx`, `src/features/teachers/studio/PresetNote.tsx`, `NoteView.tsx` (→ `notes/`), `src/features/teachers/studio/StudioApp.tsx` (Share as a note via `blockFromStage`)
- Delete: `src/features/stage/render/NoteArticle.tsx` and `NoteReader` once nothing uses them
- Test: `src/features/teachers/notes/presetNotes.test.ts`
- [ ] **Step 1: Load `teaching-voice`.** Rewrite the two preset notes as blocks: the `# ` title is the block title, each `### ` heading opens a section holding the cells under it up to the next heading, the key is the block's open choice. The words stay as they are unless the reviewer finds a break from the voice.
- [ ] **Step 2: Failing tests:** every preset parses with `parseBlock` with no warnings; its title equals `PRESET_INFO[slug].title` and its first text equals the description (replaces `presetInfo.test.ts`'s stage check).
- [ ] **Step 3: Implement** the pages: `/note/<slug>` reads `BlockArticle` with `keyBar`; `?edit=true` opens the notes creator on it (memory only, as today); a shared link (`#note=`) reads through `decodeNote`: a block, the old-version line, or the broken-link line, each with **Make your own note**.
- [ ] **Step 4: Run** tests, tsc, eslint; `review-teaching-text` on the two notes; look at both `/note/<slug>` pages and a shared link at 1280 and 390 px.
- [ ] **Step 5: Commit** `feat(notes): shared and preset notes read as blocks`.

### Task 4: The block editor

**Files:**
- Create: `src/features/plan/ui/editor/BlockEditor.tsx` (the frame, header, the sortable column), `CellFrame.tsx` (gutter), `TextCell.tsx`, `ToolCell.tsx`, `SectionFrame.tsx`, `KeyHeader.tsx`, `index.ts`
- Modify: `src/features/plan/README.md`, `src/features/plan/CLAUDE.md`

**Interfaces:**
- Consumes: Task 2's `editBlock`, `pathOf`, `selectionAfterRemove`, `cellLabel`; plan 2's reader parts (`ToolFigure`, chips); plan 3's `FamilyEditor` (studio) for a tool cell's controls (move it to `@/features/stage` if the plan side may not import the studio; stage is importable from plan's ui).
- Produces:
  ```ts
  export default function BlockEditor(p: {
    block: Block; onChange: (b: Block) => void;
    selected: string | null; onSelect: (id: string | null) => void;
    /** open the palette to add after this cell (null: at the end) */ onAdd: (after: string | null) => void;
  }): JSX.Element;
  ```
- [ ] **Step 1: Load `design:ux-copy` and `teaching-voice` ("Words about the app").** Labels: Move up, Move down (`aria-label` "Move up: <cellLabel>"), Add above, Add below, Delete, Add key, Key, Scale, Minutes, the JSON tab ("JSON"), the controls tab ("Settings").
- [ ] **Step 2: Build** the frame (title input over the key header), the sortable column (`@dnd-kit/sortable`, vertical list strategy, a section's own list nested), `CellFrame` (handle always shown; add above / add below / delete on hover and on focus within), `TextCell` (today's `TextWidget` behaviour), `ToolCell` (the tool as the reader draws it; under it Settings — the family's controls, or none — and JSON — the tool's JSON, applied on blur when it parses, its warnings shown), `SectionFrame` (heading input, minutes input, chips when it has a choice, its cells indented).
- [ ] **Step 3: Look at it** in `/dev/stories` (add a hand story "Block editor" with the `showcase-variants-same-frets` example as its block) at 1280 and 390 px: drag a cell, Move up/down by keyboard, add above/below, delete, edit a heading and minutes, change the key and see the scale neck follow. tsc; eslint.
- [ ] **Step 4: Commit** `feat(plan): the block editor`.

### Task 5: The notes creator page

**Files:**
- Create: `src/features/teachers/notes/NotesApp.tsx`, `src/features/teachers/notes/index.ts`, `src/features/teachers/notes/CLAUDE.md`, `README.md`
- Modify: `src/app/teachers/studio/page.tsx` (the `?notes=1` branch renders `NotesApp`), `src/features/teachers/studio/Palette.tsx` (a **Section** row in the Text section for notes; `onPick` unchanged), `src/features/stage/model/subject.ts` (`StudioCommand` "section-add", `isNoteCommand`), `src/features/teachers/studio/StudioApp.tsx` (notes mode removed: `notes` prop, `NOTE_STEPS`, View as a note, the notes branch of `useStage`), `spec/studio.md`, `spec/` notes section moved to `spec/notes.md`
- [ ] **Step 1: Load `design:ux-copy`.** Keep today's page frame, title, intro and the three steps (reworded for cells: "Press Add a widget to put a scale, a chord box, a neck, a video or some text in the note.", "Drag a cell by its handle to move it.", "Press View as a note to see the page as your students will.").
- [ ] **Step 2: Build** `NotesApp`: loads with `localNoteStore` (a preset with `?edit=true` instead, in memory), saves on every change (debounced 300 ms); the side panel with **Share as a note** (the `SharePopover` as today), **View as a note** (`BlockArticle` with `keyBar` in place of the editor, **← Back to editing**), **Edit as JSON (dev)** (the block's JSON; Apply parses with `parseBlock` and shows its warnings), **Add a widget** (`/`, ⌘K); the palette in notes mode: a picked row becomes `cellFromSubject(subject)` inserted after the selected cell; **Section** inserts `{ type: "section", heading: "", cells: [] }`; Video and Record a video work as today and insert a video tool cell. Empty note: "Nothing in this note yet." with Add a widget; View as a note says "This note is empty."; Share is disabled.
- [ ] **Step 3: Remove** the studio's notes mode; the studio page is the video studio only.
- [ ] **Step 4: Look at it** on the dev server at 1280 and 390 px: build the minor pentatonic note from empty (title, key, a section, text, a scale neck, a backing track, a video placeholder), reload (kept), View as a note, Edit as JSON round trip, open a preset with `?edit=true`; the studio still records (camera prompt not needed; just load it and add a widget). Back up and restore any `musickit.*` key the browser had.
- [ ] **Step 5: Run** every test, tsc, eslint on changed files. Update `spec/studio.md` (no notes mode), write `spec/notes.md` from the design's notes creator section as built, the README/CLAUDE of `teachers/notes`, `stage/CLAUDE.md` (NoteArticle gone).
- [ ] **Step 6: Commit** `feat(notes): the notes creator on the block editor`.
