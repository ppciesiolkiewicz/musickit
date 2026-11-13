import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cellLabel, editBlock, insertAt, pathOf, readable, selectionAfterRemove, withIds } from "./editBlock";
import type { Cell } from "./tools";
import type { Block } from "./types";

const t = (id: string, text = id): Cell => ({ type: "text", text, id });
const sec = (id: string, cells: Cell[], extra: Record<string, unknown> = {}): Cell => ({ type: "section", heading: id, cells: cells as never, id, ...extra });
const ids = (b: Block): unknown => b.cells.map((c) => (c.type === "section" ? [c.id, c.cells.map((x) => x.id)] : c.id));
const B: Block = { title: "T", cells: [t("a"), sec("S", [t("s1"), t("s2")]), t("b")] };

describe("editBlock: insert", () => {
  it("after a top cell, inside a section, at a section's start, at the end", () => {
    assert.deepEqual(ids(editBlock(B, { type: "insert", after: [0], cell: t("x") })), ["a", "x", ["S", ["s1", "s2"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "insert", after: [1, 0], cell: t("x") })), ["a", ["S", ["s1", "x", "s2"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "insert", after: [1], cell: t("x") })), ["a", ["S", ["x", "s1", "s2"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "insert", after: null, cell: t("x") })), ["a", ["S", ["s1", "s2"]], "b", "x"]);
  });
  it("a section never goes inside a section: it goes after it", () => {
    assert.deepEqual(ids(editBlock(B, { type: "insert", after: [1, 0], cell: sec("N", []) })), ["a", ["S", ["s1", "s2"]], ["N", []], "b"]);
  });
});

describe("editBlock: remove, move, drop, update", () => {
  it("removes a cell, inside or outside a section", () => {
    assert.deepEqual(ids(editBlock(B, { type: "remove", at: [1, 1] })), ["a", ["S", ["s1"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "remove", at: [1] })), ["a", "b"]);
  });
  it("moves within a run", () => {
    assert.deepEqual(ids(editBlock(B, { type: "move", at: [1, 0], dir: 1 })), ["a", ["S", ["s2", "s1"]], "b"]);
  });
  it("moving across a section's edge", () => {
    assert.deepEqual(ids(editBlock(B, { type: "move", at: [1, 1], dir: 1 })), ["a", ["S", ["s1"]], "s2", "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "move", at: [1, 0], dir: -1 })), ["a", "s1", ["S", ["s2"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "move", at: [2], dir: -1 })), ["a", ["S", ["s1", "s2", "b"]]]);
    assert.deepEqual(ids(editBlock(B, { type: "move", at: [0], dir: 1 })), [["S", ["a", "s1", "s2"]], "b"]);
    // a section moves past its neighbour whole
    assert.deepEqual(ids(editBlock(B, { type: "move", at: [1], dir: 1 })), ["a", "b", ["S", ["s1", "s2"]]]);
    // nothing past the ends
    assert.equal(editBlock(B, { type: "move", at: [2], dir: 1 }), B);
  });
  it("drops a dragged cell before another", () => {
    assert.deepEqual(ids(editBlock(B, { type: "drop", from: [0], to: [1, 1] })), [["S", ["s1", "a", "s2"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "drop", from: [1, 0], to: [2] })), ["a", ["S", ["s2"]], "s1", "b"]);
  });
  it("updates a cell and the title", () => {
    assert.equal((editBlock(B, { type: "update", at: [1, 0], cell: t("s1", "new") }).cells[1] as { cells: { text: string }[] }).cells[0].text, "new");
    assert.equal(editBlock(B, { type: "title", title: "New" }).title, "New");
  });
});

describe("editBlock: the key", () => {
  const neck = (key: number, extra: Record<string, unknown> = {}): Cell => ({ type: "tool", id: `n${key}`, tool: { type: "scale-neck", scale: "major-ionian", key, ...extra } as never });
  it("the key moves unpinned tools only, and not where a section sets its own key", () => {
    const b: Block = {
      title: "T", choice: { open: { key: 0, scale: "major-ionian" } },
      cells: [neck(0), neck(0, { pinned: ["key"] }), sec("S", [neck(0)], { choice: { options: [{ key: 0 }, { key: 7 }] } })],
    };
    const out = editBlock(b, { type: "key", value: { key: 6, scale: "major-ionian" } });
    assert.deepEqual(out.choice, { open: { key: 6, scale: "major-ionian" } });
    assert.equal((out.cells[0] as { tool: { key: number } }).tool.key, 6);
    assert.equal((out.cells[0] as { id: string }).id, "n0");
    assert.equal((out.cells[1] as { tool: { key: number } }).tool.key, 0);
    assert.equal(((out.cells[2] as { cells: { tool: { key: number } }[] }).cells[0]).tool.key, 0);
  });
  it("a scale change reaches a section that sets only its key", () => {
    const b: Block = { title: "T", choice: { open: { key: 0, scale: "major-ionian" } }, cells: [sec("S", [neck(0)], { choice: { options: [{ key: 0 }, { key: 7 }] } })] };
    const out = editBlock(b, { type: "key", value: { key: 0, scale: "dorian" } });
    assert.equal(((out.cells[0] as { cells: { tool: { scale: string } }[] }).cells[0]).tool.scale, "dorian");
  });
});

describe("paths, selection, labels", () => {
  it("pathOf finds a cell by id", () => {
    assert.deepEqual(pathOf(B, "s2"), [1, 1]);
    assert.deepEqual(pathOf(B, "S"), [1]);
    assert.equal(pathOf(B, "zz"), null);
  });
  it("selection after delete: the next, else the previous, else none", () => {
    assert.equal(selectionAfterRemove(B, [1, 0]), "s2");
    assert.equal(selectionAfterRemove(B, [1, 1]), "s1");
    assert.equal(selectionAfterRemove(B, [2]), "S");
    assert.equal(selectionAfterRemove({ title: "", cells: [t("a")] }, [0]), null);
  });
  it("cellLabel names the kind and the first words", () => {
    assert.equal(cellLabel(t("a", "Two shapes that sit next to each other on the neck.")), "Text: Two shapes that sit next to…");
    assert.equal(cellLabel(sec("Position 1", [])), "Section: Position 1");
    assert.equal(cellLabel({ type: "tool", tool: { type: "scale-neck", scale: "major-ionian", key: 0 } }), "Scale neck");
    assert.equal(cellLabel({ type: "notice", notice: "headphones" }), "Notice: Use headphones");
  });
});

describe("editBlock: the start, and ids", () => {
  it("inserts at the very start", () => {
    assert.deepEqual(ids(editBlock(B, { type: "insert", after: "start", cell: t("x") })), ["x", "a", ["S", ["s1", "s2"]], "b"]);
  });
  it("withIds gives every cell without an id one, inside sections too, and keeps the rest", () => {
    let n = 0;
    const b = withIds({ title: "", cells: [{ type: "text", text: "a" }, t("keep"), { type: "section", heading: "S", cells: [{ type: "text", text: "s" }] }] }, () => `id${n++}`);
    assert.deepEqual(ids(b), ["id0", "keep", ["id1", ["id2"]]]);
    assert.equal(withIds(b, () => "never"), b);
  });
});

describe("final: review fixes", () => {
  it("the key bar moves a tool written only with chord names", () => {
    const b: Block = { title: "T", choice: { open: { key: 0, scale: "major-ionian" } }, cells: [{ type: "tool", id: "c", tool: { type: "chord-shapes", chords: ["C", "F", "G"] } }] };
    const out = editBlock(b, { type: "key", value: { key: 7, scale: "major-ionian" } });
    assert.deepEqual((out.cells[0] as { tool: { chords: string[] } }).tool.chords, ["G", "C", "D"]);
  });
  it("adding the key moves nothing: the tools stay as written", () => {
    const b: Block = { title: "T", cells: [{ type: "tool", id: "n", tool: { type: "scale-neck", scale: "dorian", key: 2 } as never }] };
    const out = editBlock(b, { type: "key", value: { key: 0, scale: "major-ionian" } });
    assert.deepEqual(out.choice, { open: { key: 0, scale: "major-ionian" } });
    assert.deepEqual((out.cells[0] as { tool: { key: number; scale: string } }).tool, { type: "scale-neck", scale: "dorian", key: 2 });
  });
  it("inserts before a cell, also right after a section", () => {
    assert.deepEqual(ids(editBlock(B, { type: "insert", before: [2], cell: t("x") })), ["a", ["S", ["s1", "s2"]], "x", "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "insert", before: [1, 0], cell: t("x") })), ["a", ["S", ["x", "s1", "s2"]], "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "insert", before: [0], cell: t("x") })), ["x", "a", ["S", ["s1", "s2"]], "b"]);
  });
  it("a drag down lands after the cell dropped on, so the last place can be reached", () => {
    const C: Block = { title: "", cells: [t("a"), t("b"), t("c")] };
    assert.deepEqual(ids(editBlock(C, { type: "drop", from: [0], to: [1] })), ["b", "a", "c"]);
    assert.deepEqual(ids(editBlock(C, { type: "drop", from: [0], to: [2] })), ["b", "c", "a"]);
    assert.deepEqual(ids(editBlock(C, { type: "drop", from: [2], to: [0] })), ["c", "a", "b"]);
    assert.deepEqual(ids(editBlock(B, { type: "drop", from: [1, 0], to: [1, 1] })), ["a", ["S", ["s2", "s1"]], "b"]);
  });
  it("a note to read leaves out what is still empty", () => {
    const d: Block = { title: "T", cells: [t("a", ""), t("b", "Words"), { type: "section", heading: "", cells: [], id: "s" }, { type: "section", heading: "", cells: [t("c", "In it")] as never, id: "s2" }] };
    assert.deepEqual(ids(readable(d)), ["b", ["s2", ["c"]]]);
    assert.equal(readable(B), B);
  });
});

describe("final: insertAt, where a picked widget goes", () => {
  it("after a cell, before one, at the start, at the end", () => {
    assert.deepEqual(ids(insertAt(B, "a", t("x"))), ["a", "x", ["S", ["s1", "s2"]], "b"]);
    assert.deepEqual(ids(insertAt(B, { before: "a" }, t("x"))), ["x", "a", ["S", ["s1", "s2"]], "b"]);
    assert.deepEqual(ids(insertAt(B, "S", t("x"))), ["a", ["S", ["x", "s1", "s2"]], "b"]);
    assert.deepEqual(ids(insertAt(B, "start", t("x"))), ["x", "a", ["S", ["s1", "s2"]], "b"]);
    assert.deepEqual(ids(insertAt(B, null, t("x"))), ["a", ["S", ["s1", "s2"]], "b", "x"]);
  });
  it("a cell that isn't in this block: at the end", () => {
    assert.deepEqual(ids(insertAt(B, "elsewhere", t("x"))), ["a", ["S", ["s1", "s2"]], "b", "x"]);
    assert.deepEqual(ids(insertAt(B, { before: "elsewhere" }, t("x"))), ["a", ["S", ["s1", "s2"]], "b", "x"]);
  });
});
