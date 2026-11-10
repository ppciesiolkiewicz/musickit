import { test } from "node:test";
import assert from "node:assert/strict";
import { judgePair, looksOneInput, UNSURE, type PairState } from "./inputKind";

const run = (frames: number[][], from: PairState = UNSURE) => frames.reduce(judgePair, from);
const times = (n: number, levels: number[]) => Array.from({ length: n }, () => levels);

test("built-in mics, webcams and headsets are one input; interfaces are not", () => {
  for (const name of ["MacBook Pro Microphone", "Built-in Microphone", "Microphone Array (Realtek(R) Audio)", "FaceTime HD Camera", "AirPods Pro", "Jabra Headset"]) assert.ok(looksOneInput(name), name);
  for (const name of ["Scarlett 2i2 USB", "Audient iD4", "Steinberg UR22C", "Yeti Stereo Microphone"]) assert.ok(!looksOneInput(name), name);
});

test("one sound copied to both channels becomes one input after a while", () => {
  assert.equal(run(times(5, [0.1, 0.1])).verdict, "unsure");
  assert.equal(run(times(20, [0.1, 0.1])).verdict, "one");
});

test("silence says nothing", () => {
  assert.deepEqual(run(times(50, [0.001, 0.0011])), UNSURE);
});

test("a loud input next to a quiet one is two inputs, for good", () => {
  const two = run([[0.2, 0.01]]);
  assert.equal(two.verdict, "two");
  assert.equal(run(times(40, [0.1, 0.1]), two).verdict, "two");
});

test("a difference overrules an earlier one", () => {
  assert.equal(run([[0.2, 0.01]], run(times(20, [0.1, 0.1]))).verdict, "two");
});

test("a frame in between restarts the count", () => {
  assert.equal(run([...times(15, [0.1, 0.1]), [0.1, 0.13], ...times(15, [0.1, 0.1])]).verdict, "unsure");
});
