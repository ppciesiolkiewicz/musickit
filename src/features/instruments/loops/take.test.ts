import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOP_BARS, clampBars, cutTake, fadeEdges, loopOffset } from "./take";

describe("jam loops", () => {
  it("keeps the bars to the offered lengths", () => {
    assert.equal(clampBars(4), 4);
    assert.equal(clampBars(3), DEFAULT_LOOP_BARS);
    assert.equal(clampBars(NaN), DEFAULT_LOOP_BARS);
  });
  it("finds the place in a loop", () => {
    assert.equal(loopOffset(5, 1, 2), 0);
    assert.equal(loopOffset(5.5, 1, 2), 0.5);
    assert.equal(loopOffset(0.5, 1, 2), 1.5);
    assert.equal(loopOffset(3, 1, 0), 0);
  });
  it("cuts a take out of the chunks, silent where nothing was recorded", () => {
    const chunks = [
      { frame: 10, data: Float32Array.from([1, 2, 3, 4]) },
      { frame: 16, data: Float32Array.from([7, 8]) },
    ];
    assert.deepEqual([...cutTake(chunks, 12, 6)], [3, 4, 0, 0, 7, 8]);
    assert.deepEqual([...cutTake(chunks, 0, 3)], [0, 0, 0]);
    assert.deepEqual([...cutTake([chunks[1], chunks[0]], 9, 3)], [0, 1, 2]);
  });
  it("fades the seam", () => {
    assert.deepEqual([...fadeEdges(Float32Array.from([1, 1, 1, 1, 1, 1]), 2)], [0, 0.5, 1, 1, 0.5, 0]);
    assert.deepEqual([...fadeEdges(Float32Array.from([1]), 4)], [1]);
  });
});
