import { test } from "node:test";
import assert from "node:assert/strict";
import { fretAt, gridOf, parsePlaced, placeByHand } from "./neckGrid";

const placed = parsePlaced("3@0, 7@17");
const dist = (f: number) => 1 - 2 ** (-f / 12);
const mid17 = (dist(16) + dist(17)) / 2;
// nut at x 0.1, the middle of fret space 17 at x 0.9
const grid = gridOf([{ id: 3, c: { x: 0.1, y: 0.5 } }, { id: 7, c: { x: 0.9, y: 0.5 } }], placed)!;
const xOf = (f: number) => 0.1 + (0.8 * dist(f)) / mid17;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test("reads the marker list", () => assert.deepEqual(placed, [{ id: 3, fret: 0 }, { id: 7, fret: 17 }]));
test("needs two placed markers", () => assert.equal(gridOf([{ id: 3, c: { x: 0, y: 0 } }], placed), null));
test("puts frets where a real scale has them", () => {
  near(fretAt(grid, { x: xOf(5), y: 0.4 }), 5);
  near(fretAt(grid, { x: xOf(12), y: 0.6 }), 12);
});
test("a marker sits in the middle of its fret space", () => {
  const f = fretAt(grid, { x: 0.9, y: 0.5 });
  assert.ok(f > 16 && f < 17, `${f}`);
  near(f, -12 * Math.log2(1 - mid17));
});
test("picks the string from the hand's fret", () => {
  // A3 (57): low E 17, A string 12, D string 7, G string 2
  const d = placeByHand(57, [6.6, 8.4])!;
  assert.equal(d.string, 2);
  assert.equal(d.fret, 7);
  assert.equal(placeByHand(57, [11.4])?.fret, 12);
  assert.equal(placeByHand(57, [11.4])?.string, 1);
});
test("takes the open string when no finger is near", () => {
  // A2 (45): open A, or low E 5
  assert.deepEqual(placeByHand(45, [14]), { string: 1, fret: 0, off: 0 });
  assert.equal(placeByHand(45, [4.5])?.fret, 5);
});
test("a sized marker at the nut sits half its size up the headstock", () => {
  const p = parsePlaced("3@0/25, 7@17");
  assert.deepEqual(p[0], { id: 3, fret: 0, mm: 25 });
  const g = gridOf([{ id: 3, c: { x: 0.1, y: 0.5 } }, { id: 7, c: { x: 0.9, y: 0.5 } }], p)!;
  near(fretAt(g, { x: 0.1, y: 0.5 }), -12 * Math.log2(1 + 12.5 / 648));
  assert.ok(fretAt(g, { x: xOf(5), y: 0.5 }) < 5); // the nut is past the marker, so the same spot is nearer the nut
});
