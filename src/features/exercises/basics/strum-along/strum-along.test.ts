import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { strumAt, strumBars } from "./blocks";

describe("strumAt", () => {
  it("counts in one bar", () => {
    assert.deepEqual([0, 1, 2, 3].map((i) => strumAt(i, 4, "bar", 4)), [{ countIn: 1 }, { countIn: 2 }, { countIn: 3 }, { countIn: 4 }]);
  });
  it("one block a bar, looping", () => {
    assert.deepEqual(strumAt(4, 2, "bar", 4), { block: 0, beat: 0 });
    assert.deepEqual(strumAt(7, 2, "bar", 4), { block: 0, beat: 3 });
    assert.deepEqual(strumAt(8, 2, "bar", 4), { block: 1, beat: 0 });
    assert.deepEqual(strumAt(12, 2, "bar", 4), { block: 0, beat: 0 });
  });
  it("one block a beat", () => {
    assert.deepEqual(strumAt(3, 4, "beat", 3), { block: 0, beat: 0 });
    assert.deepEqual(strumAt(5, 4, "beat", 3), { block: 2, beat: 2 });
    assert.deepEqual(strumAt(7, 4, "beat", 3), { block: 0, beat: 1 });
  });
});

describe("strumBars", () => {
  it("a bar per block", () => assert.deepEqual(strumBars(3, "bar", 4), [[0], [1], [2]]));
  it("beats per bar", () => assert.deepEqual(strumBars(8, "beat", 4), [[0, 1, 2, 3], [4, 5, 6, 7]]));
  it("a short last bar", () => assert.deepEqual(strumBars(5, "beat", 4), [[0, 1, 2, 3], [4]]));
});
