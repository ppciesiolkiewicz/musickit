import { test } from "node:test";
import assert from "node:assert/strict";
import { degreeSemis, parseDegrees } from "./degrees";
import { clampTimeline, timelineSeconds } from "./timeline";

test("degreeSemis", () => {
  assert.equal(degreeSemis("b3"), 3);
  assert.equal(degreeSemis("♭7"), 10);
  assert.equal(degreeSemis("#4"), 6);
  assert.equal(degreeSemis("8"), null);
  assert.equal(degreeSemis(""), null);
});

test("parseDegrees", () => {
  assert.deepEqual(parseDegrees(["5", "1", "x", "1"]), [0, 7]);
  assert.deepEqual(parseDegrees("nope"), []);
});

test("timelineSeconds", () => {
  assert.equal(timelineSeconds({ bpm: 60, bars: 4, repeats: 2, events: [] }), 32);
});

test("clampTimeline", () => {
  const c = clampTimeline({ bpm: 0, bars: 0, repeats: 1e6, events: [] });
  assert.equal(c.bpm, 30);
  assert.equal(c.bars, 1);
  assert.equal(c.repeats, 50);
  const d = clampTimeline({ bpm: 90, bars: 4, events: [{ type: "scale", at: 40, key: 0, scale: "major" }, { type: "scale", at: 0, key: 0, scale: "major" }] });
  assert.equal(d.events.length, 1);
  assert.equal(d.repeats, undefined);
});
