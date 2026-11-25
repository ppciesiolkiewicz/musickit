import { test } from "node:test";
import assert from "node:assert/strict";
import { fretAt, parsePlaced } from "./grid";
import { A3_BUTTONS, A3_LAYOUT, A3_MARKERS, coveredNow, easeGrid, filtersOn, frettingTips, gridThrough, midiOfHz, noteName, parseButtons, pxPerMm, readFx, spaceAt, wireAt, DEFAULT_FX } from "./fx";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const g = gridThrough({ x: 0.1, y: 0.5 }, { x: 0.7, y: 0.5 });

test("a wire's place reads back as its fret", () => {
  for (const f of [0, 1, 5, 12, 17]) near(fretAt(g, wireAt(g, f)), f);
  near(wireAt(g, 12).x, 0.7);
});
test("a fret space's middle sits between its wires", () => {
  const p = spaceAt(g, 5);
  assert.ok(p.x > wireAt(g, 4).x && p.x < wireAt(g, 5).x);
});
test("easing moves part of the way and keeps the direction", () => {
  const moved = gridThrough({ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 });
  near(wireAt(easeGrid(g, moved, 0.5), 0).x, 0.15);
  near(wireAt(easeGrid(null, moved), 0).x, 0.2);
  // the same neck read the other way round
  const back = { ...moved, dir: { x: -1, y: 0 }, a: -moved.a, origin: moved.origin };
  near(wireAt(easeGrid(g, back, 1), 12).x, 0.8);
});
test("reads buttons, skipping what it can't read", () => {
  assert.deepEqual(parseButtons("56=mono, 57=Neon 58=sparkle x"), [{ id: 56, filter: "mono" }, { id: 57, filter: "neon" }]);
});
test("a marker is covered after it goes missing while others stay seen", () => {
  const last = new Map<number, number>();
  assert.deepEqual(coveredNow(last, [1, 56], 0, [56]), []);
  assert.deepEqual(coveredNow(last, [1], 0.1, [56]), []);
  assert.deepEqual(coveredNow(last, [1], 0.25, [56]), [56]);
  // the camera lost everything: not a cover
  assert.deepEqual(coveredNow(last, [], 0.3, [56]), []);
  // never seen, never covered
  assert.deepEqual(coveredNow(last, [1], 1, [57]), []);
});
test("hold keeps a filter on while covered; toggle flips on each new cover", () => {
  const b = parseButtons("56=mono");
  const on = new Set<"mono">();
  assert.deepEqual(filtersOn(b, [56], [], "hold", new Set()), ["mono"]);
  assert.deepEqual(filtersOn(b, [], [56], "hold", new Set()), []);
  assert.deepEqual(filtersOn(b, [56], [], "toggle", on), ["mono"]);
  assert.deepEqual(filtersOn(b, [56], [56], "toggle", on), ["mono"]);
  assert.deepEqual(filtersOn(b, [], [56], "toggle", on), ["mono"]);
  assert.deepEqual(filtersOn(b, [56], [], "toggle", on), []);
});
test("the fretting hand is the one with most tips on the neck", () => {
  const off = Array.from({ length: 5 }, () => ({ x: 2, y: 0.5 }));
  const onNeck = [{ x: 0, y: 0 }, wireAt(g, 3), wireAt(g, 4), wireAt(g, 5), { x: 5, y: 0.5 }];
  const r = frettingTips(g, [off, onNeck])!;
  assert.equal(r.frets.length, 3);
  near(r.frets[0], 3);
  assert.equal(frettingTips(g, [off]), null);
});
test("names notes and reads pitches", () => {
  assert.equal(midiOfHz(440), 69);
  assert.equal(noteName(69), "A");
  assert.equal(midiOfHz(82.41), 40);
});
test("stored settings fall back to the default", () => {
  assert.deepEqual(readFx(null), DEFAULT_FX);
  assert.deepEqual(readFx({ markers: "3@0", effects: ["frets", "nope"], mode: "toggle" }).effects, ["frets"]);
});

// the fret sheet as printed by scripts/neck-markers-frets.mjs: ids by size
const SHEET: [number, number, number][] = [[40, 51, 55], [30, 56, 61], [24, 62, 77], [22, 78, 86], [20, 87, 96], [18, 97, 106], [16, 107, 110], [14, 111, 114], [12, 115, 118]];
const width = (f: number) => 648 * (2 ** (-(f - 1) / 12) - 2 ** (-f / 12));
test("the A3 layout uses each fret sheet marker once, at its printed size, inside its fret space", () => {
  const ids = A3_LAYOUT.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of A3_LAYOUT) {
    const row = SHEET.find(([, lo, hi]) => m.id >= lo && m.id <= hi);
    assert.equal(row?.[0], m.mm, `marker ${m.id}`);
    if (m.fret && m.fret < 17) assert.ok(m.mm * 1.25 <= width(m.fret), `marker ${m.id} is too wide for fret ${m.fret}`);
  }
  assert.equal(parsePlaced(A3_MARKERS).length, 7);
  assert.deepEqual(parsePlaced(A3_MARKERS)[0], { id: 56, fret: 0, mm: 30, gap: 8 });
  assert.equal(parseButtons(A3_BUTTONS).length, 2);
});
test("strength and beat read back clamped, missing ones from the default", () => {
  const f = readFx({ strength: { mood: 5, heat: -1, sparks: "x" }, beat: { heat: 0.5 } });
  assert.deepEqual(f.strength, { mood: 2, heat: 0, sparks: 1, bump: 1 });
  assert.deepEqual(f.beat, { mood: 1, heat: 0.5 });
});
test("a millimetre on screen from the grid", () => {
  // the nut to wire 12 is half the scale, 324 mm, here 0.6 units
  near(pxPerMm(g) * 324, 0.6);
});
