import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BPM, MAX_BPM, MIN_BPM, clampTempo, nextBeat } from "./clock";

describe("jam clock", () => {
  it("keeps the tempo whole and in range", () => {
    assert.equal(clampTempo(120.4), 120);
    assert.equal(clampTempo(5), MIN_BPM);
    assert.equal(clampTempo(999), MAX_BPM);
    assert.equal(clampTempo(NaN), DEFAULT_BPM);
  });
  it("finds the next beat line", () => {
    assert.equal(nextBeat(0.5, 1, 0.5), 1);
    assert.equal(nextBeat(1, 1, 0.5), 1);
    assert.equal(nextBeat(1.1, 1, 0.5), 1.5);
    assert.equal(nextBeat(2, 1, 0.5), 2);
  });
});
