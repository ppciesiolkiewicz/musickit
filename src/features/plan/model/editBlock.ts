import { applyChoice, partsOf } from "./choice";
import type { Cell, ChoiceOption, PlainCell, SectionCell } from "./tools";
import type { Block } from "./types";

/**
 * The block editor's changes, as pure functions over a `Block`. A cell is addressed by its place: `[i]` in the block's own
 * cells, `[i, j]` inside section `i`. One level only: a section never holds a section.
 */
export type CellPath = [number] | [number, number];

export type EditAction =
  /** after `after` (null: at the end, "start": before everything); after a section's own cell, inside the section; after a section itself, at its start */
  | { type: "insert"; after: CellPath | null | "start"; cell: Cell }
  /** right before the cell at `before` (Add above); a section never goes inside a section: before that section */
  | { type: "insert"; before: CellPath; cell: Cell }
  | { type: "remove"; at: CellPath }
  /** one place up or down; across a section's edge a cell leaves it or goes into the section next to it; a section moves whole */
  | { type: "move"; at: CellPath; dir: -1 | 1 }
  /** a drag: the cell at `from` put before the cell at `to` */
  | { type: "drop"; from: CellPath; to: CellPath }
  | { type: "update"; at: CellPath; cell: Cell }
  | { type: "title"; title: string }
  /** the key bar: the block's open choice, and every tool under it that follows it (moved from the key it had; a key added for the first time moves nothing) */
  | { type: "key"; value: ChoiceOption };

const isSection = (c: Cell): c is SectionCell => c.type === "section";

/** The cell at a path, or undefined. */
export function cellAt(block: Block, at: CellPath): Cell | undefined {
  const top = block.cells[at[0]];
  if (at.length === 1) return top;
  return top && isSection(top) ? top.cells[at[1]] : undefined;
}

/** The block's cells with one taken out, and that cell. */
function take(cells: Cell[], at: CellPath): [Cell[], Cell | undefined] {
  if (at.length === 1) return [cells.filter((_, i) => i !== at[0]), cells[at[0]]];
  const s = cells[at[0]];
  if (!s || !isSection(s)) return [cells, undefined];
  const out = cells.slice();
  out[at[0]] = { ...s, cells: s.cells.filter((_, j) => j !== at[1]) };
  return [out, s.cells[at[1]]];
}

/** The cells with `cell` put at `at` (before what is there now); a section is never put inside a section. */
function put(cells: Cell[], at: CellPath, cell: Cell): Cell[] {
  if (at.length === 1 || isSection(cell)) {
    const i = at[0] + (at.length === 2 ? 1 : 0);
    return [...cells.slice(0, i), cell, ...cells.slice(i)];
  }
  const s = cells[at[0]] as SectionCell;
  const out = cells.slice();
  out[at[0]] = { ...s, cells: [...s.cells.slice(0, at[1]), cell as PlainCell, ...s.cells.slice(at[1])] };
  return out;
}

const idOf = (c: Cell | undefined): string | undefined => c?.id;

/** Where the cell with this id is, or null. */
export function pathOf(block: Block, id: string): CellPath | null {
  for (let i = 0; i < block.cells.length; i++) {
    const c = block.cells[i];
    if (c.id === id) return [i];
    if (isSection(c)) {
      const j = c.cells.findIndex((x) => x.id === id);
      if (j >= 0) return [i, j];
    }
  }
  return null;
}

function move(block: Block, at: CellPath, dir: -1 | 1): Block {
  const cells = block.cells;
  const cell = cellAt(block, at);
  if (!cell) return block;
  if (at.length === 2) {
    const [i, j] = at;
    const s = cells[i] as SectionCell;
    const k = j + dir;
    if (k >= 0 && k < s.cells.length) {
      const inner = s.cells.slice();
      [inner[j], inner[k]] = [inner[k], inner[j]];
      const out = cells.slice();
      out[i] = { ...s, cells: inner };
      return { ...block, cells: out };
    }
    // out of the section: before it going up, after it going down
    const [rest] = take(cells, at);
    return { ...block, cells: put(rest, [dir < 0 ? i : i + 1], cell) };
  }
  const i = at[0];
  const k = i + dir;
  if (k < 0 || k >= cells.length) return block;
  const next = cells[k];
  if (isSection(next) && !isSection(cell)) {
    // into the section next to it: at its end going up, at its start going down
    const [rest] = take(cells, at);
    const si = dir < 0 ? k : k - 1;
    const s = rest[si] as SectionCell;
    return { ...block, cells: put(rest, [si, dir < 0 ? s.cells.length : 0], cell) };
  }
  const out = cells.slice();
  [out[i], out[k]] = [out[k], out[i]];
  return { ...block, cells: out };
}

function drop(block: Block, from: CellPath, to: CellPath): Block {
  const cell = cellAt(block, from);
  const target = idOf(cellAt(block, to));
  if (!cell || !target || target === cell.id) return block;
  const [rest] = take(block.cells, from);
  const found = pathOf({ ...block, cells: rest }, target);
  if (!found) return block;
  // dragged down within its own list it lands after the target (as a sortable list moves), else before it
  const sameList = from.length === to.length && (from.length === 1 || from[0] === to[0]);
  const down = sameList && from[from.length - 1] < to[to.length - 1];
  const at: CellPath = down ? (found.length === 1 ? [found[0] + 1] : [found[0], found[1] + 1]) : found;
  // a section dropped inside a section goes before that section
  return { ...block, cells: isSection(cell) && at.length === 2 ? put(rest, [at[0]], cell) : put(rest, at, cell) };
}

function insert(block: Block, after: CellPath | null | "start", cell: Cell): Block {
  const cells = block.cells;
  if (!after) return { ...block, cells: [...cells, cell] };
  if (after === "start") return { ...block, cells: [cell, ...cells] };
  if (after.length === 2) return { ...block, cells: isSection(cell) ? put(cells, [after[0] + 1], cell) : put(cells, [after[0], after[1] + 1], cell) };
  const here = cells[after[0]];
  if (here && isSection(here) && !isSection(cell)) return { ...block, cells: put(cells, [after[0], 0], cell) };
  return { ...block, cells: put(cells, [after[0] + 1], cell) };
}

/**
 * The key bar's value applied: every tool that follows it moves from the key the bar had to the new one (a tool with only
 * chord names moves by the distance); a section's tools only for the parts its own choice doesn't set. A key added for the
 * first time moves nothing: the tools stay as they were written.
 */
function key(block: Block, value: ChoiceOption): Block {
  const open = { open: value };
  const prev = block.choice && "open" in block.choice ? block.choice.open : null;
  if (!prev) return { ...block, choice: open };
  const only = (o: ChoiceOption, drop: string[]) => Object.fromEntries(Object.entries(o).filter(([p]) => !drop.includes(p))) as ChoiceOption;
  const move = <T extends Cell>(cells: T[], drop: string[]): T[] => {
    const from = only(prev, drop), to = only(value, drop);
    return Object.keys(to).length ? applyChoice(cells, { options: [from, to] }, 1) : cells;
  };
  const cells = block.cells.map((c) => (isSection(c) ? { ...c, cells: move(c.cells, c.choice ? partsOf(c.choice) : []) } : move([c], [])[0]));
  return { ...block, choice: open, cells };
}

/**
 * A note as a reader gets it: what the editor still holds empty (a text with no words, a section with no heading and no cells)
 * left out; a section with cells and no heading keeps its cells. The same block when nothing is empty.
 */
export function readable(block: Block): Block {
  const keep = (c: Cell) => !(c.type === "text" && !c.text.trim()) && !(isSection(c) && !c.heading.trim() && c.cells.every((x) => x.type === "text" && !x.text.trim()));
  const cells = block.cells.filter(keep).map((c) => (isSection(c) && c.cells.some((x) => !keep(x)) ? { ...c, cells: c.cells.filter(keep) } : c));
  return cells.length === block.cells.length && cells.every((c, i) => c === block.cells[i]) ? block : { ...block, cells };
}

export function editBlock(block: Block, a: EditAction): Block {
  switch (a.type) {
    case "insert":
      if ("before" in a) return { ...block, cells: isSection(a.cell) && a.before.length === 2 ? put(block.cells, [a.before[0]], a.cell) : put(block.cells, a.before, a.cell) };
      return insert(block, a.after, a.cell);
    case "remove":
      return { ...block, cells: take(block.cells, a.at)[0] };
    case "move":
      return move(block, a.at, a.dir);
    case "drop":
      return drop(block, a.from, a.to);
    case "update": {
      if (a.at.length === 1) return { ...block, cells: block.cells.map((c, i) => (i === a.at[0] ? a.cell : c)) };
      const [i, j] = a.at;
      return { ...block, cells: block.cells.map((c, k) => (k === i && isSection(c) ? { ...c, cells: c.cells.map((x, m) => (m === j ? (a.cell as PlainCell) : x)) } : c)) };
    }
    case "title":
      return { ...block, title: a.title };
    case "key":
      return key(block, a.value);
  }
}

/** Every cell with an id (`make` gives the missing ones), inside sections too; the same block when none was missing. */
export function withIds(block: Block, make: () => string): Block {
  let changed = false;
  const give = <C extends Cell>(c: C): C => {
    if (c.id) return c;
    changed = true;
    return { ...c, id: make() };
  };
  const cells = block.cells.map((c) => {
    const own = give(c);
    if (!isSection(own)) return own;
    const inner = own.cells.map(give);
    return inner.some((x, i) => x !== own.cells[i]) ? { ...own, cells: inner } : own;
  });
  return changed ? { ...block, cells } : block;
}

/**
 * A picked widget put where it was asked for: after a cell (by id; after a section: at its start), before one (`{ before }`),
 * at the start, or (null) at the end. A cell that is not in this block puts it at the end.
 */
export function insertAt(block: Block, at: string | { before: string } | "start" | null, cell: Cell): Block {
  if (at && typeof at === "object") {
    const before = pathOf(block, at.before);
    return editBlock(block, before ? { type: "insert", before, cell } : { type: "insert", after: null, cell });
  }
  return editBlock(block, { type: "insert", after: at === "start" ? "start" : at ? pathOf(block, at) : null, cell });
}

/** The cell to select once the one at `at` is deleted: the next beside it, else the one before, else its section, else none. */
export function selectionAfterRemove(block: Block, at: CellPath): string | null {
  const list = at.length === 1 ? block.cells : ((block.cells[at[0]] as SectionCell).cells as Cell[]);
  const k = at[at.length - 1];
  return idOf(list[k + 1]) ?? idOf(list[k - 1]) ?? (at.length === 2 ? idOf(block.cells[at[0]]) : undefined) ?? null;
}

const firstWords = (s: string, max = 30): string => {
  const one = s.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max).trimEnd()}…`;
};
const toolName = (type: string) => type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ");

/** A cell's name for its gutter buttons and for a browser AI: its kind and its first words ("Text: Two shapes that sit…"). */
export function cellLabel(c: Cell): string {
  switch (c.type) {
    case "text":
      return `Text: ${firstWords(c.text) || "empty"}`;
    case "list":
      return `List: ${firstWords(c.items[0] ?? "") || "empty"}`;
    case "notice":
      return "Notice: Use headphones";
    case "tool":
      return toolName(c.tool.type);
    case "section":
      return `Section: ${firstWords(c.heading) || "no heading"}`;
  }
}
