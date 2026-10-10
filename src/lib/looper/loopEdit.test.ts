import { test } from "node:test";
import assert from "node:assert/strict";
import { clampEdit, DEFAULT_EDIT, isDefaultEdit, minMax, normaliseGain, renderLoop, seamFrames, shiftRange, type Take } from "./loopEdit";

const SR = 1000;
/** a take of 10 frames before, a loop of 20, then 5 after; every sample is its own index */
const ramp = (): Take => {
  const l = Float32Array.from({ length: 35 }, (_, i) => i);
  return { l, r: l.slice(), start: 10, length: 20 };
};

test("the default edit plays the loop exactly as recorded", () => {
  const t = ramp();
  const { l, r } = renderLoop(t, DEFAULT_EDIT, SR);
  assert.equal(l.length, 20);
  assert.deepEqual([...l], Array.from({ length: 20 }, (_, i) => i + 10));
  assert.deepEqual([...r], [...l]);
  assert.ok(isDefaultEdit(DEFAULT_EDIT));
});

test("shifting slides the window within the margins and keeps the length", () => {
  const t = ramp();
  assert.deepEqual(shiftRange(t), { min: -10, max: 5 });
  assert.equal(renderLoop(t, { ...DEFAULT_EDIT, shift: -4 }, SR).l[0], 6);
  assert.equal(renderLoop(t, { ...DEFAULT_EDIT, shift: 5 }, SR).l[19], 34);
  // past the margins it is clamped
  assert.equal(clampEdit(t, { shift: 99 }).shift, 5);
  assert.equal(clampEdit(t, { shift: -99 }).shift, -10);
  assert.equal(renderLoop(t, { ...DEFAULT_EDIT, shift: 99 }, SR).l.length, 20);
});

test("clampEdit fills in and limits every field", () => {
  const e = clampEdit(null, { gain: -1, fadeIn: Number.NaN, seam: 9999, shift: 3 });
  assert.deepEqual(e, { shift: 0, gain: 0, reverse: false, fadeIn: 0, fadeOut: 0, seam: 500 });
});

test("reverse, gain and fades", () => {
  const t = ramp();
  const rev = renderLoop(t, { ...DEFAULT_EDIT, reverse: true }, SR).l;
  assert.equal(rev[0], 29);
  assert.equal(rev[19], 10);
  assert.equal(renderLoop(t, { ...DEFAULT_EDIT, gain: 2 }, SR).l[0], 20);
  // 5 ms at 1000 Hz is 5 frames
  const f = renderLoop(t, { ...DEFAULT_EDIT, fadeIn: 5, fadeOut: 5 }, SR).l;
  assert.equal(f[0], 0);
  assert.equal(f[19], 0);
  assert.equal(f[10], 20);
});

test("the seam crossfade ends on the sound just before the start", () => {
  // a loop of constant 1 with constant 0 before it: the end fades from 1 to 0
  const l = new Float32Array(30);
  for (let i = 10; i < 30; i++) l[i] = 1;
  const t: Take = { l, r: l.slice(), start: 10, length: 20 };
  const e = { ...DEFAULT_EDIT, seam: 4 };
  assert.equal(seamFrames(t, e, SR), 4);
  const o = renderLoop(t, e, SR).l;
  assert.equal(o[15], 1);
  assert.ok(o[16] > o[17] && o[17] > o[18] && o[18] > o[19]);
  assert.ok(o[19] < 0.2);
  // no audio before the window: no crossfade
  assert.equal(seamFrames({ ...t, start: 0 }, e, SR), 0);
});

test("normaliseGain brings the peak to the target", () => {
  const t = ramp();
  const g = normaliseGain(t, DEFAULT_EDIT, SR, 0.5);
  assert.ok(Math.abs(g * 29 - 0.5) < 1e-9);
  const silent: Take = { l: new Float32Array(10), r: new Float32Array(10), start: 0, length: 10 };
  assert.equal(normaliseGain(silent, DEFAULT_EDIT, SR), 1);
});

test("minMax keeps the extremes of each slice", () => {
  const d = Float32Array.from([0, -1, 2, 0, 0.5, -0.25]);
  const { min, max } = minMax(d, 0, 6, 2);
  assert.deepEqual([...min], [-1, -0.25]);
  assert.deepEqual([...max], [2, 0.5]);
});
