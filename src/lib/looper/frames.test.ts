import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyInputMode, assemble, beatFrames, beatInBar, effectiveGain, loopOffset, msToFrames, nextBoundary, peaks, quantUnitFrames, quantiseLength, type Chunk } from "./frames";

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

describe("metronome and quantising", () => {
  it("counts frames in a beat and a bar", () => {
    assert.equal(beatFrames(120, 48000), 24000);
    assert.equal(quantUnitFrames("beat", 120, 4, 48000), 24000);
    assert.equal(quantUnitFrames("bar", 120, 4, 48000), 96000);
    assert.equal(quantUnitFrames("off", 120, 4, 48000), 0);
  });
  it("rounds a take to whole units, never to zero", () => {
    assert.equal(quantiseLength(95000, 96000), 96000);
    assert.equal(quantiseLength(150000, 96000), 192000); // 1.56 bars rounds to 2
    assert.equal(quantiseLength(130000, 96000), 96000); // 1.35 bars rounds to 1
    assert.equal(quantiseLength(10, 96000), 96000);
    assert.equal(quantiseLength(12345, 0), 12345);
  });
  it("finds the beat in the bar, including the count-in before the anchor", () => {
    assert.deepEqual(beatInBar(10.0, 10, 0.5, 4), { beat: 0, index: 0 });
    assert.deepEqual(beatInBar(11.6, 10, 0.5, 4), { beat: 3, index: 3 });
    assert.deepEqual(beatInBar(12.0, 10, 0.5, 4), { beat: 0, index: 4 });
    assert.deepEqual(beatInBar(9.6, 10, 0.5, 4), { beat: 3, index: -1 });
  });
});

describe("loop length multiples", () => {
  it("rounds a free take up to 1, 2, 4, 8 or 16 loops", async () => {
    const { lengthMultiple } = await import("./frames");
    assert.equal(lengthMultiple(0.4, 1), 1);
    assert.equal(lengthMultiple(1.01, 1), 1);
    assert.equal(lengthMultiple(1.3, 1), 2);
    assert.equal(lengthMultiple(2.5, 1), 4);
    assert.equal(lengthMultiple(5, 1), 8);
    assert.equal(lengthMultiple(99, 1), 16);
    assert.equal(lengthMultiple(3, 0), 1);
  });
});
