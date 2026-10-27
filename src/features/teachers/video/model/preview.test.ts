import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScore } from "./score";
import { formatMs, frameAt, momentLabel, tuneStarts } from "./preview";
import type { VideoConfig } from "./config";

/** A 2-second intro, then two 2-bar tunes, two passes each, at 60 bpm so a beat is a second. */
const config = (): VideoConfig => ({
  name: "t",
  tonicPc: 0,
  scale: "major-ionian",
  bpm: 60,
  voice: "alto",
  intro: { title: "Hi", seconds: 2 },
  layers: [],
  formats: {},
  timeline: [
    { tune: "1 2 3 2 | 1w", times: 2, caption: "first" },
    { tune: "3 2 1 2 | 3w", times: 2, caption: "second" },
  ],
});

describe("tuneStarts", () => {
  it("puts each tune at its countdown, after the intro", () => {
    assert.deepEqual(tuneStarts(buildScore(config())), [2000, 22000]);
  });
});

describe("frameAt", () => {
  it("counts 30 frames a second, the frame showing at that time", () => {
    assert.equal(frameAt(0), 0);
    assert.equal(frameAt(1000), 30);
    assert.equal(frameAt(1049), 31);
  });
});

describe("formatMs", () => {
  it("writes minutes, seconds and tenths", () => {
    assert.equal(formatMs(0), "0:00.0");
    assert.equal(formatMs(83456), "1:23.4");
    assert.equal(formatMs(600000), "10:00.0");
    assert.equal(formatMs(-5), "0:00.0");
  });
});

describe("momentLabel", () => {
  const s = buildScore(config());
  it("names the intro, the count-in, the pass and the end", () => {
    assert.equal(momentLabel(s, 1000), "Intro");
    assert.equal(momentLabel(s, 2500), "Tune 1 · count-in");
    assert.equal(momentLabel(s, 6500), "Tune 1 · pass 1 of 2");
    assert.equal(momentLabel(s, 14500), "Tune 1 · pass 2 of 2");
    assert.equal(momentLabel(s, 22500), "Tune 2 · count-in");
    assert.equal(momentLabel(s, 42500), "End");
  });
});
