import assert from "node:assert/strict";
import { test } from "node:test";
import type { Cue } from "../cues/cues";
import type { Timeline } from "../timeline/types";
import { barEvents, isFinished, loopsDone } from "./schedule";

const cue = (at: number): Cue => ({ at, beats: 1, chord: "G", kind: "note", midi: [55], frets: [], highlighted: true });
const cues = [0, 3, 4, 5, 7.5, 8, 12].map(cue);
const t = (repeats?: number): Timeline => ({ bpm: 80, bars: 4, events: [], ...(repeats ? { repeats } : {}) });

test("barEvents of bar 1 holds only cues with 4 <= at < 8", () => {
  assert.deepEqual(barEvents(cues, 1, 4).map((c) => c.at), [4, 5, 7.5]);
});
test("bar 5 of a 4-bar timeline wraps to bar 1", () => {
  assert.deepEqual(barEvents(cues, 5, 4).map((c) => c.at), [4, 5, 7.5]);
});
test("loopsDone counts whole loops", () => {
  assert.equal(loopsDone(33, t()), 2);
});
test("isFinished after repeats, never without", () => {
  assert.equal(isFinished(32, t(2)), true);
  assert.equal(isFinished(31, t(2)), false);
  assert.equal(isFinished(1000, t()), false);
});
