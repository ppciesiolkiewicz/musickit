import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blocksOf, fitBlocks } from "./blocks";
import type { Section } from "./tools";

const h = (text: string, minutes?: number): Section => ({ type: "heading", text, ...(minutes ? { minutes } : {}) });
const t: Section = { type: "text", text: "x" };
const mins = (s: Section[]) => s.map((x) => (x.type === "heading" ? x.minutes : undefined));

describe("blocksOf", () => {
  it("starts blocks at headings with minutes; earlier sections join block 1", () => {
    const s: Section[] = [t, h("A", 3), { type: "list", items: ["a"] }, h("plain"), h("B", 4), t];
    assert.deepEqual(blocksOf(s), [
      { title: "A", minutes: 3, from: 0, to: 4 },
      { title: "B", minutes: 4, from: 4, to: 6 },
    ]);
  });
  it("is empty without timed headings", () => assert.deepEqual(blocksOf([t, h("x")]), []));
});

describe("fitBlocks", () => {
  const three = [h("A", 3), t, h("B", 3), t, h("C", 3), t];
  it("scales with largest remainder, total exact", () => {
    const r = fitBlocks(three, 10);
    assert.deepEqual(mins(r.sections).filter(Boolean), [4, 3, 3]);
    assert.equal(r.changed, true);
  });
  it("drops the last blocks' minutes when there are too few minutes", () => {
    const r = fitBlocks([h("A", 1), t, h("B", 1), t, h("C", 1), t], 2);
    assert.deepEqual(mins(r.sections), [1, undefined, 1, undefined, undefined, undefined]);
    assert.equal(r.changed, true);
  });
  it("never makes a 0-minute block", () => {
    assert.deepEqual(mins(fitBlocks([h("A", 1), t, h("B", 1), t], 8).sections).filter(Boolean), [4, 4]);
  });
  it("leaves an exact sum alone", () => {
    const r = fitBlocks(three, 9);
    assert.equal(r.changed, false);
    assert.deepEqual(r.sections, three);
  });
});
