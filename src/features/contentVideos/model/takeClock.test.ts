import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, type PlanTool } from "@/features/plan/model/tools";
import { takeOverlay } from "./takeClock";

const riff = TOOLS["guitar-play-along"].parse({ type: "guitar-play-along", shape: { shape: "riff", key: "e", scale: "Mixolydian", notes: [{ string: 6, fret: 0, beats: 1 }, { string: 5, fret: 5, beats: 1 }] }, bpm: 60, view: "tab" })!;
const click = { downbeat: 1, bpm: 60, bars: 2 };

test("a take to the click with the tool never started saves the click's clock", () => {
  const out = takeOverlay(riff, click, [{ t: 0, beat: null }, { t: 0.05, beat: null }, { t: 0.1, beat: null }]);
  assert.deepEqual(out, { tool: riff, clock: [[0, -1, 1]] });
});

test("the click's clock wins over the tool's beat", () => {
  const out = takeOverlay(riff, click, [{ t: 0, beat: 3 }, { t: 1, beat: 4 }]);
  assert.deepEqual(out?.clock, [[0, -1, 1]]);
});

test("no click and the tool never started: no overlay", () => {
  assert.equal(takeOverlay(riff, undefined, [{ t: 0, beat: null }]), null);
});

test("no click: the tool's own beat, squeezed", () => {
  const out = takeOverlay(riff, undefined, [{ t: 0, beat: 0 }, { t: 1, beat: 1 }, { t: 2, beat: 2 }]);
  assert.deepEqual(out, { tool: riff, clock: [[0, 0, 1]] });
});

test("a tool with no overlay gets none, click or not", () => {
  const metronome = { type: "metronome", bpm: 60 } as unknown as PlanTool;
  assert.equal(takeOverlay(metronome, click, []), null);
  assert.equal(takeOverlay(null, click, []), null);
});
