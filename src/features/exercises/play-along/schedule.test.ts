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

import { beatIndexAt } from "@/features/instruments";
import { gridAnchor, nextBarAt } from "./schedule";

test("bar starts stay on the click grid across a tempo change", () => {
  let barAt = 10, bpm = 60;
  let anchor = gridAnchor(barAt, 0, bpm);
  for (let bar = 0; bar < 6; bar++) {
    if (bar === 3) { bpm = 90; anchor = gridAnchor(barAt, bar, bpm); }
    assert.equal(beatIndexAt(barAt + 1e-6, anchor, bpm), bar * 4);
    barAt = nextBarAt(barAt, bpm);
  }
  assert.ok(Math.abs(barAt - 30) < 1e-9);
});

import { cuesOf } from "../cues/cues";
import { expandShape } from "../shapes";
import { withBackingSound } from "./schedule";

const guideTones = () => expandShape({ shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2, steps: ["3", "b7"], bpm: 70 })!;

test("single notes over bare chords get the chords held under them by default", () => {
  const t = withBackingSound(guideTones());
  assert.equal(t.pad, true);
  const pads = cuesOf(t).filter((c) => c.kind === "backing");
  assert.deepEqual(pads.map((c) => [c.chord, c.at, c.beats]), [["A7", 0, 4], ["D7", 4, 4]]);
  assert.ok(pads.every((c) => c.midi.length >= 3));
});

test("under: none and drone; strums and comped chords get no pad", () => {
  assert.equal(withBackingSound(guideTones(), "none").pad, undefined);
  const d = withBackingSound(guideTones(), "drone");
  assert.equal(d.drone, 9);
  assert.equal(d.pad, undefined);
  const strums = expandShape({ shape: "progression", key: "g", chords: ["G", "C"], bars: 2, steps: ["strum"], bpm: 70 })!;
  assert.equal(withBackingSound(strums).pad, undefined);
  const comped = expandShape({ shape: "progression", key: "g", chords: ["G", "C"], bars: 2, steps: ["1"], backing: ["block"], bpm: 70 })!;
  assert.equal(withBackingSound(comped).pad, undefined);
});
