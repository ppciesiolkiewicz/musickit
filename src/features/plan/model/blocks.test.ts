import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockAt, blocksOf, fitBlocks } from "./blocks";
import type { Cell } from "./tools";

const t: Cell = { type: "text", text: "x" };
const s = (heading: string, minutes?: number): Cell => ({ type: "section", heading, ...(minutes ? { minutes } : {}), cells: [t] });
const mins = (c: Cell[]) => c.map((x) => (x.type === "section" ? x.minutes : undefined));

describe("blocksOf", () => {
  it("is the sections with minutes, in order, with their place in the cells", () => {
    const cells: Cell[] = [t, s("A", 3), { type: "list", items: ["a"] }, s("plain"), s("B", 4), t];
    assert.deepEqual(blocksOf(cells), [
      { title: "A", minutes: 3, index: 1 },
      { title: "B", minutes: 4, index: 4 },
    ]);
  });
  it("is empty without timed sections", () => assert.deepEqual(blocksOf([t, s("x")]), []));
});

describe("fitBlocks", () => {
  const three = [s("A", 3), t, s("B", 3), t, s("C", 3), t];
  it("scales with largest remainder, total exact", () => {
    const r = fitBlocks(three, 10);
    assert.deepEqual(mins(r.cells).filter(Boolean), [4, 3, 3]);
    assert.equal(r.changed, true);
  });
  it("drops the last blocks' minutes when there are too few minutes", () => {
    const r = fitBlocks([s("A", 1), t, s("B", 1), t, s("C", 1), t], 2);
    assert.deepEqual(mins(r.cells), [1, undefined, 1, undefined, undefined, undefined]);
    assert.equal(r.changed, true);
  });
  it("never makes a 0-minute block", () => {
    assert.deepEqual(mins(fitBlocks([s("A", 1), t, s("B", 1), t], 8).cells).filter(Boolean), [4, 4]);
  });
  it("leaves an exact sum alone, and never changes the given cells", () => {
    const r = fitBlocks(three, 9);
    assert.equal(r.changed, false);
    assert.deepEqual(r.cells, three);
    fitBlocks(three, 10);
    assert.deepEqual(mins(three).filter(Boolean), [3, 3, 3]);
  });
});

describe("blockAt", () => {
  const blocks = blocksOf([s("A", 3), s("B", 4)]);
  it("finds the running block and the seconds left in it", () => {
    assert.deepEqual(blockAt(blocks, 0), { index: 0, leftInBlock: 180 });
    assert.deepEqual(blockAt(blocks, 200), { index: 1, leftInBlock: 220 });
  });
  it("is null past the last block", () => assert.equal(blockAt(blocks, 420), null));
});
