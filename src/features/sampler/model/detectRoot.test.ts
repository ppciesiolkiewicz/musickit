import assert from "node:assert/strict";
import { test } from "node:test";
import { detectRoot } from "./detectRoot";

const SR = 44100;
const sine = (hz: number, seconds = 1) => Float32Array.from({ length: Math.floor(SR * seconds) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / SR));

test("sines land on their notes", () => {
  assert.equal(detectRoot(sine(440), SR), 69);
  assert.equal(detectRoot(sine(261.63), SR), 60);
  assert.equal(detectRoot(sine(110), SR), 45);
  assert.equal(detectRoot(sine(452), SR), 69); // 47 cents sharp still rounds to A4
});

test("silence, noise and a too-short sound give no root", () => {
  assert.equal(detectRoot(new Float32Array(SR), SR), null);
  let seed = 1;
  const noise = Float32Array.from({ length: SR }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5));
  assert.equal(detectRoot(noise, SR), null);
  assert.equal(detectRoot(sine(440, 0.05), SR), null);
});
