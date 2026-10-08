import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyInputMode, assemble, effectiveGain, loopOffset, msToFrames, nextBoundary, peaks, type Chunk } from "./frames";

const chunk = (frame: number, values: number[]): Chunk => ({ frame, l: new Float32Array(values), r: new Float32Array(values.map((v) => -v)) });

describe("assemble", () => {
  it("cuts an exact window across chunk boundaries", () => {
    const chunks = [chunk(0, [1, 2, 3, 4]), chunk(4, [5, 6, 7, 8]), chunk(8, [9, 10, 11, 12])];
    const { l, r } = assemble(chunks, 2, 10);
    assert.deepEqual([...l], [3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual([...r], [-3, -4, -5, -6, -7, -8, -9, -10]);
  });
  it("fills dropped chunks with silence and keeps the length", () => {
    const { l } = assemble([chunk(0, [1, 1, 1, 1]), chunk(8, [2, 2, 2, 2])], 0, 12);
    assert.equal(l.length, 12);
    assert.deepEqual([...l], [1, 1, 1, 1, 0, 0, 0, 0, 2, 2, 2, 2]);
  });
  it("returns silence when the window is before the data", () => {
    const { l } = assemble([chunk(100, [1, 1])], 0, 4);
    assert.deepEqual([...l], [0, 0, 0, 0]);
  });
});

describe("loop timing", () => {
  it("offsets inside the loop", () => {
    assert.equal(loopOffset(10.5, 8, 2), 0.5);
    assert.equal(loopOffset(8, 8, 2), 0);
    assert.ok(Math.abs(loopOffset(7.5, 8, 2) - 1.5) < 1e-9);
  });
  it("finds the next boundary with a lead time", () => {
    assert.equal(nextBoundary(10.5, 8, 2), 12);
    assert.equal(nextBoundary(11.95, 8, 2, 0.1), 14);
    assert.equal(nextBoundary(5, 8, 2), 8);
  });
});

describe("misc", () => {
  it("computes peaks per bucket", () => {
    const p = peaks(new Float32Array([0, 0.5, -1, 0.25, 0, 0, 0.1, -0.2]), 4);
    assert.deepEqual([...p].map((v) => Math.round(v * 100) / 100), [0.5, 1, 0, 0.2]);
    assert.equal(peaks(new Float32Array(0), 3).length, 3);
  });
  it("selects input channels", () => {
    const l = new Float32Array([1, 1]), r = new Float32Array([0, 0.5]);
    assert.equal(applyInputMode(l, r, "left").r, l);
    assert.equal(applyInputMode(l, r, "right").l, r);
    assert.deepEqual([...applyInputMode(l, r, "sum").l], [0.5, 0.75]);
    assert.equal(applyInputMode(l, r, "stereo").r, r);
  });
  it("mutes and solos", () => {
    assert.equal(effectiveGain({ volume: 0.8, muted: false, solo: false }, false), 0.8);
    assert.equal(effectiveGain({ volume: 0.8, muted: true, solo: false }, false), 0);
    assert.equal(effectiveGain({ volume: 0.8, muted: false, solo: false }, true), 0);
    assert.equal(effectiveGain({ volume: 0.8, muted: false, solo: true }, true), 0.8);
    assert.equal(msToFrames(10, 48000), 480);
  });
});
