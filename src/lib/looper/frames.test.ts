import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyInputMode, assemble, channelChoices, channelLabel, cycleBars, detectChannels, eachChannel, inputChannels, beatFrames, beatInBar, effectiveGain, loopOffset, msToFrames, nextBoundary, peaks, quantUnitFrames, quantiseLength, timelineOrigin, timelinePosition, type Chunk } from "./frames";

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

describe("take status", () => {
  it("counts beats down while waiting", async () => {
    const { takeStatus } = await import("./frames");
    const base = { start: 10, end: null, stopping: false, started: false, period: 0.5, beatsPerBar: 4 };
    assert.deepEqual(takeStatus({ ...base, now: 8.1 }), { phase: "armed", beatsLeft: 4, bar: 0, totalBars: 0, beat: 0 });
    assert.equal(takeStatus({ ...base, now: 9.6 }).beatsLeft, 1);
  });
  it("shows bar over a total that doubles as the take grows", async () => {
    const { takeStatus } = await import("./frames");
    const base = { start: 0, end: null, stopping: false, started: true, period: 0.5, beatsPerBar: 4 };
    const at = (t: number) => takeStatus({ ...base, now: t });
    assert.deepEqual([at(0.1).bar, at(0.1).totalBars, at(0.1).beat], [1, 1, 1]);
    assert.deepEqual([at(5).bar, at(5).totalBars, at(5).beat], [3, 4, 3]);
    assert.deepEqual([at(8.2).bar, at(8.2).totalBars], [5, 8]);
  });
  it("counts beats to the end after stop and knows a planned length", async () => {
    const { takeStatus } = await import("./frames");
    const s = takeStatus({ now: 5, start: 0, end: 8, stopping: true, started: true, period: 0.5, beatsPerBar: 4 });
    assert.deepEqual([s.phase, s.beatsLeft, s.totalBars], ["stopping", 6, 4]);
    assert.equal(takeStatus({ now: 1, start: 0, end: 8, stopping: false, started: true, period: 0.5, beatsPerBar: 4 }).totalBars, 4);
  });
});

describe("device channels", () => {
  it("maps a mode and a pair to the device's channels", () => {
    assert.deepEqual(inputChannels("left"), { a: 0, b: 0, how: "mono" });
    assert.deepEqual(inputChannels("right", 1), { a: 3, b: 3, how: "mono" });
    assert.deepEqual(inputChannels("stereo", 2), { a: 4, b: 5, how: "stereo" });
    assert.deepEqual(inputChannels("sum", 1), { a: 2, b: 3, how: "sum" });
    assert.deepEqual(inputChannels("left", -3), { a: 0, b: 0, how: "mono" }, "a bad pair falls back to the first");
  });
  it("labels channels from 1", () => {
    assert.equal(channelLabel("right"), "Input 2");
    assert.equal(channelLabel("stereo", 1), "Inputs 3-4");
    assert.equal(channelLabel("sum"), "Inputs 1-2 to mono");
  });
  it("reads the channel count from settings, then capabilities", () => {
    assert.equal(detectChannels(2, 8), 2);
    assert.equal(detectChannels(undefined, 4), 4);
    assert.equal(detectChannels(0, undefined), 0, "unknown");
    assert.equal(detectChannels(undefined, 999), 32, "capped");
  });
  it("offers each channel, each pair as stereo and as mono", () => {
    assert.deepEqual(channelChoices(2).map((c) => c.label), ["Input 1", "Input 2", "Inputs 1-2", "Inputs 1-2 to mono"]);
    assert.equal(channelChoices(0).length, 4, "unknown counts as stereo");
    assert.equal(channelChoices(1).length, 4, "a mono device still offers the pair (Input 2 is silent)");
    assert.deepEqual(channelChoices(3).map((c) => c.label), ["Input 1", "Input 2", "Input 3", "Inputs 1-2", "Inputs 1-2 to mono"], "no pair for the odd last channel");
    assert.equal(channelChoices(8).length, 16);
  });
  it("makes one strip per channel", () => {
    assert.deepEqual(eachChannel(4), [{ mode: "left", pair: 0 }, { mode: "right", pair: 0 }, { mode: "left", pair: 1 }, { mode: "right", pair: 1 }]);
    assert.equal(eachChannel(1).length, 2);
  });
});

describe("timeline", () => {
  it("cycle is the longest loop in bars, at least one", () => {
    assert.equal(cycleBars([]), 1);
    assert.equal(cycleBars([2, 4, 1]), 4);
    assert.equal(cycleBars([0.4]), 1);
    assert.equal(cycleBars([2.01]), 2);
  });
  it("timelinePosition walks bars and beats and wraps at the cycle end", () => {
    // 120 bpm, 4/4: beat 0.5 s, bar 2 s, cycle of 2 bars = 4 s
    assert.deepEqual(timelinePosition(10, 10, 0.5, 4, 2), { bar: 0, beat: 0, fraction: 0, countIn: false });
    assert.deepEqual(timelinePosition(12.75, 10, 0.5, 4, 2), { bar: 1, beat: 1, fraction: 0.6875, countIn: false });
    assert.deepEqual(timelinePosition(14, 10, 0.5, 4, 2), { bar: 0, beat: 0, fraction: 0, countIn: false });
  });
  it("timelinePosition during the count-in", () => {
    // anchor 10, one count-in bar from 8 to 10
    const p = timelinePosition(8.6, 10, 0.5, 4, 2);
    assert.equal(p.countIn, true);
    assert.equal(p.bar, 0);
    assert.equal(p.beat, 1);
    assert.equal(p.fraction, 0);
  });
  it("timelineOrigin follows the take, then the longest loop, then the grid", () => {
    // counting in: the grid's beat 1
    assert.equal(timelineOrigin({ countIn: true, takeAt: 9, loopOrigin: 7, anchor: 12 }), 12);
    // a take that started bars after beat 1 is measured from where it started
    assert.equal(timelineOrigin({ countIn: false, takeAt: 9, loopOrigin: 7, anchor: 1 }), 9);
    // no take: the longest armed loop's own start
    assert.equal(timelineOrigin({ countIn: false, takeAt: null, loopOrigin: 7, anchor: 1 }), 7);
    assert.equal(timelineOrigin({ countIn: false, takeAt: null, loopOrigin: null, anchor: 1 }), 1);
  });
});
