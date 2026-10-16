import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKey } from "./key";
import { TRAIL_LENGTH, emptyTrail, press, release, type TrailState } from "./trail";

const C = makeKey(0, "major");
const D = makeKey(2, "major");
type Ev = [kind: "p" | "r", midi: number, at?: number];
const run = (key = C, evs: Ev[]): TrailState =>
  evs.reduce((s, [k, m, at]) => (k === "p" ? press(s, key, m, at ?? 0) : release(s, m)), emptyTrail);
const midis = (s: TrailState) => s.steps.map((st) => st.sounding.notes.map((n) => n.midi));
const intervals = (s: TrailState) => s.steps.map((st) => st.interval);

test("single notes", () => {
  const s = run(D, [["p", 62, 0], ["r", 62], ["p", 66, 500], ["r", 66], ["p", 69, 1000]]);
  assert.equal(s.steps.length, 3);
  assert.deepEqual(intervals(s), [null, "M3", "m3"]);
});

test("struck chord merges", () => {
  const s = run(C, [["p", 60, 0], ["p", 64, 10], ["p", 67, 25]]);
  assert.equal(s.steps.length, 1);
  assert.equal(s.steps[0].sounding.chord?.symbol, "C");
});

test("chord built slowly", () => {
  const s = run(C, [["p", 60, 0], ["p", 64, 500], ["p", 67, 1000]]);
  assert.deepEqual(s.steps.map((st) => st.sounding.notes.length), [1, 2, 3]);
  assert.deepEqual(intervals(s), [null, "M3", "m3"]);
});

test("drone with melody", () => {
  const s = run(C, [["p", 48, 0], ["p", 64, 500], ["r", 64], ["p", 65, 1000], ["r", 65], ["p", 67, 1500]]);
  assert.deepEqual(midis(s), [[48], [48, 64], [48, 65], [48, 67]]);
  assert.deepEqual(intervals(s), [null, "M10", "m2", "M2"]);
});

test("fresh press after release", () => {
  const s = run(C, [["p", 60, 0], ["p", 64, 10], ["p", 67, 20], ["r", 60], ["r", 64], ["r", 67], ["p", 62, 1000]]);
  assert.equal(s.steps.length, 2);
  assert.equal(s.steps[1].interval, "M2");
});

test("release never adds a step", () => {
  const before = run(C, [["p", 60, 0], ["p", 64, 500]]);
  const after = release(release(before, 64), 60);
  assert.deepEqual(after.steps, before.steps);
  assert.deepEqual(after.held, []);
});

test("trims to TRAIL_LENGTH", () => {
  const evs: Ev[] = [];
  [60, 62, 64, 65, 67, 69].forEach((m, i) => evs.push(["p", m, i * 500], ["r", m]));
  const s = run(C, evs);
  assert.equal(s.steps.length, TRAIL_LENGTH);
  const ids = s.steps.map((st) => st.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  assert.equal(s.steps[TRAIL_LENGTH - 1].sounding.notes[0].midi, 69);
});

test("duplicate press", () => {
  const s = run(C, [["p", 60, 0], ["p", 60, 5]]);
  assert.equal(s.steps.length, 1);
  assert.deepEqual(s.held, [60]);
});

test("key change clears (caller resets to emptyTrail)", () => {
  assert.equal(emptyTrail.steps.length, 0);
  assert.deepEqual(emptyTrail.held, []);
});
