# Browser AI tools for blocks Implementation Plan (plan 6 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The AI in the player's or teacher's browser (WebMCP, `@/lib/webmcp`) reads and writes blocks: on the notes creator the note, on the plan page the running plan's exercises, through one set of tools checked by the one parser.

**Architecture:** Pure replies first (`plan/model/agentBlocks.ts`): the authoring guide, reading a block or the week, writing a note, and writing, inserting or removing an exercise of the running plan (through `editDay`, so the rating rule of plan 5 holds). Then one hook per page (`plan/ui/useBlockAgentTools.ts`) registering the tools while the page is mounted, and the notes creator's one line to paste into the AI extension.

**Tech Stack:** TypeScript, React, Next.js 16; node:test through the cached tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md` ("What the AI sees"). Earlier: plans 4 (`NotesApp`, `parseBlock`) and 5 (`editDay`).

## Global Constraints

- "One set of WebMCP tools (`@/lib/webmcp`), mounted on the notes creator and on the plan page while a plan is running, never on the studio. The existing `get_practice_plan_prompt` / `submit_practice_plan` (the flow) and `list_exercise_tools` / `show_exercise_tool` / `close_exercise_tool` (every page) stay."
- `get_authoring_guide()`: "the prompt's definitions, rules and examples without the student section (`promptParts` minus `student`, `earlier weeks` and `how to plan`), plus one short part on what a note is (a block alone, no days, the metadata optional)."
- `read_block(where)`: "the block's JSON and its current warnings. `where` is nothing on a note, `{ day, exercise }` on the running plan (1-based, as the week shows them)." `read_plan()`: "the whole week the same way, with each exercise's rating".
- `write_block(where, block)`: "replaces the block, parsed by the one parser … reads back `agentReply()`: what was changed or left out and why, the warnings, or refused (fewer than 2 or more than 5 exercises in the day, a block with no `learnBefore` on the plan, no cells). On the plan it is saved at once under a new exercise id (the rating rule above); the page shows the new block at once."
- `insert_block(where, block)` and `remove_block(where)` on the running plan, within the 2–5 rule. Not on a note.
- "The notes creator shows, where the plan's prompt step does, the one line to paste into the extension (…); without WebMCP it shows Edit as JSON as the path, as today."
- Words: the tool descriptions and the replies are prompt text (`teaching-voice`); the line on the page is interface copy (`design:ux-copy`, "Words about the app": "AI extension").
- Videos stay out of the AI's reach (`PROMPT_HIDDEN`): the guide never names the `video` tool.

## Decisions (my call)

- **The guide's parts:** `promptParts` minus `student`, `how-to-plan`, `week`, `course` and `answer-format` (the plan's JSON shape), plus a "note" part: "A note is one block: a title, an optional choice, cells. No days, no minutes needed; metadata (why, links, tags) is optional on a note. On the plan, an exercise is a block with its metadata, as the plan format says."
- **A note written by the AI** is parsed with `parseBlock` (not draft), so empty cells are refused like any paste; the note's key bar is its open choice if it has one.
- **An exercise written by the AI** is parsed with `parseExercise` (the paste parser, metadata and all); its warnings come back in the reply. Refused when it has no cells or no `learnBefore`, as the design says.
- **The page shows the change at once:** the note through the notes creator's `change`; the plan through `usePlan().update`.
- **Replies** are plain text, one line saying what happened, then the warnings as a list, then what to do next (send again, or nothing to fix).

## Review Focus

1. `write_block` on day 2 exercise 3 of a running plan: that exercise gets a new id and loses its stars; the others keep theirs (Task 1).
2. `remove_block` on a day of 2, `insert_block` on a day of 5: refused, nothing changed (Task 1).
3. `where` out of range (day 8, exercise 0, a string): refused with a line saying what is valid (Task 1).
4. `write_block` with JSON as a string or as an object: both read (Task 1).
5. The tools are gone when the page is left, and never on the studio (Task 2).

---

### Task 1: The replies

**Files:**
- Create: `src/features/plan/model/agentBlocks.ts`, `agentBlocks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Where = { day: number; exercise: number };          // 1-based, as the week shows them
  export function authoringGuide(entries: CatalogueEntry[]): string;
  export function readNoteReply(block: Block): string;            // JSON + warnings
  export function writeNote(raw: unknown): { block: Block | null; reply: string };
  export function readPlanReply(plan: StoredPlan): string;        // every day, every exercise's JSON and rating
  export function readExerciseReply(plan: StoredPlan, where: unknown): string;
  export function writeExercise(plan: StoredPlan, where: unknown, raw: unknown, entries: CatalogueEntry[], newId: () => string): { plan: StoredPlan | null; reply: string };
  export function insertExercise(plan: StoredPlan, where: unknown, raw: unknown, entries: CatalogueEntry[], newId: () => string): { plan: StoredPlan | null; reply: string };   // before `exercise` (n+1 = at the end)
  export function removeExercise(plan: StoredPlan, where: unknown, newId: () => string): { plan: StoredPlan | null; reply: string };
  ```
- [ ] **Step 1: Failing tests** for the five Review Focus lines; `authoringGuide` contains "which tool" and the note part, and not the student's lines or "video"; `writeNote` of `{ title, cells: [] }` → null block with "no cells"; a string block reads like an object.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (`editDay` for every plan change). **Step 4: Run** — PASS; tsc; eslint.
- [ ] **Step 5: Commit** `feat(plan): replies for the browser AI's block tools`.

### Task 2: The tools on the two pages

**Files:**
- Create: `src/features/plan/ui/useBlockAgentTools.ts`
- Modify: `src/features/teachers/notes/NotesApp.tsx`, `src/features/plan/PlanApp.tsx`, `src/features/plan/README.md`, `spec/notes.md`
- [ ] **Step 1: Load `teaching-voice`** for the descriptions; write `useNoteAgentTools(block, onChange)` (get_authoring_guide, read_block, write_block) and `usePlanAgentTools(plan | null, onChange)` (get_authoring_guide, read_plan, read_block, write_block, insert_block, remove_block; nothing registered without a running plan). Latest state read through refs, registered once, as `useBrowserAgentTools` does.
- [ ] **Step 2: Mount** them in `NotesApp` (the creator, not a shared link's reader) and `PlanApp` (while a plan runs).
- [ ] **Step 3: Load `design:ux-copy`.** The notes creator, with WebMCP: one line over the editor, "Ask your AI extension: Read the authoring guide, then write a note about [what] and send it with write_block.", with a Copy button; without it, nothing new (Edit as JSON stays).
- [ ] **Step 4: Check** with a fake `document.modelContext` injected by the browser script: the tools register on both pages, `write_block` changes what the page shows, they are gone after navigating away; tests, tsc, eslint.
- [ ] **Step 5: Commit** `feat(plan): the browser AI reads and writes blocks`.
