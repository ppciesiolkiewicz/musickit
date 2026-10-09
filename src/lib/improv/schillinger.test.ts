import { test } from "node:test";
import assert from "node:assert/strict";
import { SCALES, degreeMidi, interference, invert, lcm, makeChallenge, mulberry32, permutations, retrograde, rotations } from "./schillinger";

test("3:2 interference gives 2+1+1+2", () => {
  const r = interference(3, 2);
  assert.equal(r.length, 6);
  assert.deepEqual(r.r, [0, 2, 3, 4]);
  assert.deepEqual(r.durations, [2, 1, 1, 2]);
});

test("the durations always fill the cycle", () => {
  for (const [a, b] of [[4, 3], [5, 2], [5, 4], [7, 4], [6, 4], [2, 2]]) {
    const r = interference(a, b);
    assert.equal(r.durations.reduce((x, y) => x + y, 0), r.length);
    assert.equal(r.length, lcm(a, b));
  }
  assert.deepEqual(interference(2, 2).durations, [1, 1]);
});

test("permutations, rotations, retrograde and inversion", () => {
  assert.equal(permutations([1, 2, 3, 4]).length, 24);
  assert.equal(new Set(permutations([1, 2, 3, 4]).map((p) => p.join())).size, 24);
  assert.deepEqual(rotations([1, 2, 3, 4]), [[1, 2, 3, 4], [2, 3, 4, 1], [3, 4, 1, 2], [4, 1, 2, 3]]);
  assert.deepEqual(retrograde([1, 2, 3]), [3, 2, 1]);
  assert.deepEqual(invert([2, 4, 3, 6]), [2, 0, 1, -2]);
});

test("degrees map onto the scale across octaves", () => {
  const major = SCALES[0];
  assert.equal(degreeMidi(0, major, 0, 4), 60);
  assert.equal(degreeMidi(0, major, 7, 4), 72);
  assert.equal(degreeMidi(0, major, -1, 4), 59);
  assert.equal(degreeMidi(9, SCALES[5], 2, 3), 12 * 4 + 9 + 5);
});

test("challenges repeat for the same seed and use distinct motive notes", () => {
  assert.deepEqual(makeChallenge(42), makeChallenge(42));
  for (let s = 0; s < 50; s++) {
    const c = makeChallenge(s);
    assert.equal(new Set(c.motive).size, c.motive.length);
    assert.ok(c.motive.every((d) => d >= 0 && d < c.scale.steps.length));
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});
