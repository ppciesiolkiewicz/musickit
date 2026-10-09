import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPitch, hzToNote, nearestString } from "./pitch";

const SR = 44100;
const tone = (hz: number, harmonics = 1, n = 4096) => {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let h = 1; h <= harmonics; h++) b[i] += (0.3 / h) * Math.sin((2 * Math.PI * hz * h * i) / SR);
  return b;
};

test("detects guitar string pitches", () => {
  for (const hz of [82.41, 110, 146.83, 196, 246.94, 329.63]) {
    const p = detectPitch(tone(hz), SR);
    assert.ok(p, String(hz));
    assert.ok(Math.abs(p.freq - hz) < 0.5, `${hz} got ${p.freq}`);
  }
});
test("harmonic-rich tone still gives the fundamental", () => {
  const p = detectPitch(tone(110, 6), SR);
  assert.ok(p && Math.abs(p.freq - 110) < 0.5);
});
test("silence and noise give nothing", () => {
  assert.equal(detectPitch(new Float32Array(4096), SR), null);
});
test("note maths", () => {
  const n = hzToNote(440);
  assert.deepEqual([n.name, n.octave, Math.round(n.cents)], ["A", 4, 0]);
  const s = hzToNote(82.41);
  assert.deepEqual([s.name, s.octave], ["E", 2]);
  assert.ok(hzToNote(446).cents > 20);
  assert.equal(nearestString(112).index, 1);
  assert.ok(nearestString(112).cents > 0);
});
