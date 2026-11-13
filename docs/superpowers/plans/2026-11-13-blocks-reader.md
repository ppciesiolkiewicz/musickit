# Blocks reader Implementation Plan (plan 2 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One read-only reader of a `Block` (`BlockArticle`), drawn in the note's article look, that the plan's exercise card uses and that plan 4 will put under the shared and preset notes; `Cells.tsx` and `SectionAside.tsx` are retired into it.

**Architecture:** A new folder `src/features/plan/ui/reader/` holds the reader: `BlockArticle` (the whole article: title, key bar, body), `BlockTitle` and `BlockBody` (its two halves, so the plan card can put its own number, hashtags and minutes beside the title), `NoteText` (text with glossary words, `{{3}}` dots and care lines), `ToolFigure` (a tool as a figure), `KeyBar` (an open choice, read-only) and `aside.ts` (the review view's per-cell slot). What decides which cells are drawn under which choice is pure and moves to `model/choice.ts` (`drawnParts`, `keyBarValue`), tested. The reader receives a `Block` and plain flags; it never sees `ExerciseMeta`.

**Tech Stack:** TypeScript, React, Next.js 16, Tailwind; node:test through the cached `tsx` (`~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>`).

**Spec:** `docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md` ("Goals: Same look for both", "What the player sees: the plan" first bullets, "Interfaces"). Plan 1: `docs/superpowers/plans/2026-11-12-blocks-format.md`.

## Global Constraints

- The reader's props are a `Block` and flags. No `ExerciseMeta`, no `PlanExercise`, no store (`ExerciseTool` reads the player's voice from the plan store, as today; that stays).
- The key bar is drawn only when the host says so (`keyBar` prop) and the block's choice is `open`. A plan card never says so: a plan exercise's key is the AI's business.
- A staff listens only when its tool says `mic` (the parser's default stays: absent = on). The reader passes the tool as it is; it never forces `mic` either way (the stage forces `mic: false` today; plan 4 must keep notes' staffs quiet by writing `mic: false`).
- The plan page looks no worse than today: the card's text column, lists, care lines, chips, section rules and "Start exercise" / "Top of section" stay as they look now.
- The card keeps: number disc, title, hashtags after the title (small, muted), minutes or `SpentTime`, Learn before, why, Explore more, stars, the day timer's lift. Gone already (plan 1): the focus line, the level/area/kind chips.
- Interface copy: one new visible word, the key bar's row name "Key" (the chips' own row name). No other string changes.
- `/dev/examples` and `/dev/stories` render through the reader (stories draw tools only, unchanged).

## Decisions (my call)

- **Folder** `ui/reader/` on the plan's side, as the editor will be `ui/editor/`.
- **"Top of exercise"** in the design is today's "Top of section" button (it scrolls to the step's heading); its label stays.
- **Title sizes**: `BlockTitle` takes `size: "page" | "card"`: `page` is the note's title (display face, `text-3xl sm:text-4xl`), `card` the card's (`text-xl`). Text in a `page` reads at the note's size (`text-base sm:text-lg`, `max-w-2xl`); in a `card` at the plan's (`text-[15px]`, `max-w-3xl`).
- **Widgets as figures**: every tool is a `<figure>`. On a card it looks as today's `ToolBox` (tour button on a slim row above the tool, no frame); under a cell aside (the review view) as today's `ToolFrame` (its type in the caption). On a `page` it takes the note's frame (`rounded-xl ring-1 ring-slate-800 bg-slate-950 p-3`).
- **The key bar is read-only** in this plan: "Key" and the open value in words (`optionText`: "A · Minor pentatonic"). A shared note's Key widget does nothing today either; plan 4 swaps in the key selector (the choice component's variant).
- **The aside** is renamed `CellAside` / `CellAsideContext` (it was always per cell) and moves to `reader/aside.ts`; same signature.

## Review Focus

1. A block whose open choice is on the block, drawn on a plan card: not drawn, but its value still sets the tools (Task 1 test "an open block choice sets the tools").
2. A section with its own options choice under a block with an options choice: picking the section's chip moves only that section; the block's chips move the rest (Task 1 tests on `drawnParts`).
3. A picked index past the options (a stale pick after an edit): option 1, not a crash (Task 1).
4. A block that is all sections (no own cells), or has own cells after a section: parts in document order, the review view's flat indices unchanged (Task 1: `from` offsets).
5. A block with an `options` choice and `keyBar` set: no key bar (only an open choice is one) (Task 1: `keyBarValue`).

---

### Task 1: What is drawn, as pure logic

**Files:**
- Modify: `src/features/plan/model/choice.ts`
- Test: `src/features/plan/model/choice.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** One part of a block as drawn: its id ("own<k>" / "s<k>"; "block" is the block's pick key), the section or null, the section's own options choice (null otherwise), its cells with every choice applied, `from` as in layoutParts. */
  export interface DrawnPart { id: string; section: SectionCell | null; chips: Choice | null; cells: PlainCell[]; from: number }
  /** The picked option per choice id ("block", a part's id) as an index; missing or past the end: option 1. */
  export type Picks = Record<string, number>;
  export function pickAt(choice: Choice | undefined, picks: Picks, id: string): number;
  export function drawnParts(block: Pick<Block, "choice" | "cells">, picks: Picks): DrawnPart[];
  /** The open value to draw as the key bar: only with `keyBar` and an open block choice; else null. */
  export function keyBarValue(block: Pick<Block, "choice">, keyBar: boolean): ChoiceOption | null;
  ```
  `chips` is a section's own options choice only; the block's options chips are drawn once by the body, before the block's first tool, as today.

- [ ] **Step 1: Write the failing tests** in `describe("drawnParts")`:
  - "an open block choice sets the tools": block `{ choice: { open: { key: 9 } }, cells: [scale-neck in C] }` → part 0's tool has `key: 9`, `chips` null.
  - "a section's chip moves only that section": block options `[{key:0},{key:7}]`, a section with options `[{bpm:60},{bpm:80}]` and a backing-band (key 0, bpm 60), and own cells with a backing-band; picks `{ s1: 1 }` → section tool bpm 80, key 0; own tool unchanged; picks `{ block: 1 }` → both tools key 7.
  - "a pick past the options is option 1": picks `{ block: 5 }` → same as `{}`; `pickAt(choice, { block: 5 }, "block") === 0`.
  - "parts in document order with flat offsets": cells `[section A (2 cells), text, section B (1 cell)]` → ids `["s0","own1","s2"]`, `from` `[0,2,3]`.
  - "keyBarValue": open + true → the value; open + false → null; options + true → null; none → null.

- [ ] **Step 2: Run** `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test src/features/plan/model/choice.test.ts` — expect FAIL (not exported).
- [ ] **Step 3: Implement** in `choice.ts` from `layoutParts` and `applyUnder` (the body is what `Cells` does today at lines 108–121).
- [ ] **Step 4: Run** the same — PASS.
- [ ] **Step 5: Commit** `feat(plan): drawnParts and keyBarValue, what the reader draws`.

### Task 2: The reader

**Files:**
- Create: `src/features/plan/ui/reader/BlockArticle.tsx` (`BlockArticle` default, `BlockTitle`, `BlockBody`), `reader/NoteText.tsx` (`NoteText`, `CareLine`, moved from `Cells.tsx`), `reader/ToolFigure.tsx`, `reader/KeyBar.tsx`, `reader/aside.ts`
- Delete: `src/features/plan/ui/Cells.tsx`, `src/features/plan/ui/SectionAside.tsx`
- Modify: `src/features/plan/ui/ExerciseCard.tsx`, `src/features/devtools/examples/Comments.tsx`, `src/features/plan/README.md` (the `ui/` line and the "Cells" mentions), `src/features/devtools/README.md` (`SectionAsideContext` → `CellAsideContext`)

**Interfaces:**
- Consumes: Task 1's `drawnParts`, `pickAt`, `keyBarValue`, `Picks`.
- Produces (what plan 4 uses):
  ```ts
  export type ReaderSize = "page" | "card";
  export function BlockTitle(p: { title: string; size: ReaderSize; done?: boolean }): JSX.Element; // h2 for page, h3 for card, display face
  export function BlockBody(p: { block: Block; size: ReaderSize; keyBar?: boolean; address?: string }): JSX.Element;
  export default function BlockArticle(p: { block: Block; keyBar?: boolean; address?: string }): JSX.Element; // <article aria-label={title}>, size "page"
  // aside.ts
  export type CellAside = (at: { address: string; index: number; section: PlainCell }) => ReactNode;
  export const CellAsideContext: React.Context<CellAside | null>;
  ```
- `BlockBody` owns the picks (`useState<Picks>`), draws the key bar (when `keyBarValue`), then each part as `Cells` drew it: the rule between parts, a section's heading + minutes, chips before the part's first tool (block chips before the block's first tool), `StartExercise`, `ToSectionTop`, `ExerciseStep` around each part; tools remount on a pick (key as today).
- `ExerciseCard`: header row = disc, `BlockTitle size="card" done`, hashtags in a `text-xs text-slate-500` span right after the title in the same wrapping row, minutes / `SpentTime` at the end; body = `<ExerciseSettings><BlockBody block={e} size="card" address={address} /></ExerciseSettings>`. `e` is passed as a `Block` (`{ title, choice, cells }`), never the whole exercise.

- [ ] **Step 1: Move** `NoteText`/`CareLine` and the aside verbatim; write `ToolFigure`, `KeyBar` (row name "Key" in the chips' row style, value `optionText(value)`), `BlockTitle`, `BlockBody`, `BlockArticle`.
- [ ] **Step 2: Point** `ExerciseCard` and `Comments.tsx` at the reader; delete `Cells.tsx` and `SectionAside.tsx`; update both READMEs.
- [ ] **Step 3: Run** `npx tsc --noEmit 2>&1 | grep -v '^.next/'` (empty), `npx eslint src/features/plan/ui src/features/devtools/examples/Comments.tsx` (clean), the plan model tests and `src/features/plan/examples/*.test.ts` and `src/features/devtools/model/*.test.ts` (pass).
- [ ] **Step 4: Read it on the screen** (`npx next dev --webpack -p 3017` in the worktree): `/plan` with a demo plan (`demos.ts`; back up and restore `musickit.plan`), `/dev/examples` (an exercise with chips, a plan), `/dev/stories`, at desktop and phone width; compare with main's dev server or screenshots. The bar: no worse.
- [ ] **Step 5: Commit** `feat(plan): the block reader; the card reads its block through it`.
