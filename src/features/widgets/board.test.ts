import { test } from "node:test";
import assert from "node:assert/strict";
import { bandLayout, clampWidget, findSpot, fitView, moveWidget, raise, resizeFromCorner, resizeWidget, sanitiseLayout, splitLayout, tileLayout } from "./board";

const B = { w: 1000, h: 600 };

test("a widget never leaves the board", () => {
  assert.deepEqual(moveWidget({ x: 10, y: 10, w: 300, h: 200 }, -50, -50, B), { x: 0, y: 0, w: 300, h: 200 });
  assert.deepEqual(moveWidget({ x: 600, y: 300, w: 300, h: 200 }, 500, 500, B), { x: 700, y: 400, w: 300, h: 200 });
});

test("resizing is bounded by the board and the minimum", () => {
  assert.deepEqual(resizeWidget({ x: 800, y: 100, w: 150, h: 200 }, 400, 0, B), { x: 740, y: 100, w: 260, h: 200 });
  const r = resizeWidget({ x: 0, y: 0, w: 300, h: 200 }, -999, -999, B);
  assert.deepEqual([r.w, r.h], [260, 140]);
  const big = resizeWidget({ x: 0, y: 0, w: 300, h: 200 }, 5000, 5000, B);
  assert.deepEqual([big.w, big.h], [1000, 600]);
});

test("a board smaller than the minimum still holds the widget", () => {
  assert.deepEqual(clampWidget({ x: 50, y: 50, w: 500, h: 500 }, { w: 200, h: 100 }), { x: 0, y: 0, w: 200, h: 100 });
});

test("split puts two widgets side by side across the board", () => {
  const d = splitLayout(0.42)(["a", "b"], B);
  assert.equal(d.a.x, 0);
  assert.equal(d.b.x + d.b.w, 1000);
  assert.ok(d.a.x + d.a.w <= d.b.x);
});

test("tiling fills the board without overlap or leaving it", () => {
  for (const n of [1, 2, 3, 5, 7]) {
    const ids = Array.from({ length: n }, (_, i) => `w${i}`);
    const t = tileLayout(ids, B);
    ids.forEach((id) => {
      const r = t[id];
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= B.w && r.y + r.h <= B.h, `${n}:${id} inside`);
    });
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = t[ids[i]], b = t[ids[j]];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!overlap, `${n}: ${i} and ${j} apart`);
      }
  }
});

test("saved layouts are repaired, new widgets get a place, removed ones are dropped", () => {
  const s = sanitiseLayout({ a: { x: -5, y: 0, w: 5000, h: 100 }, b: "junk", gone: { x: 0, y: 0, w: 300, h: 300 } }, ["a", "b", "c"], B);
  assert.deepEqual(s.a, { x: 0, y: 0, w: 1000, h: 140 });
  assert.deepEqual(Object.keys(s), ["a", "b", "c"]);
  assert.deepEqual(s.b, tileLayout(["a", "b", "c"], B).b);
  assert.deepEqual(sanitiseLayout(null, ["a", "b"], B), tileLayout(["a", "b"], B));
});

test("raise puts a widget on top", () => {
  assert.deepEqual(raise(["a", "b"], "a"), ["b", "a"]);
});

test("resizing from a corner keeps the opposite corner fixed and respects the minimum", () => {
  const r = { x: 100, y: 100, w: 400, h: 300 };
  assert.deepEqual(resizeFromCorner(r, "se", 50, 20), { x: 100, y: 100, w: 450, h: 320 });
  assert.deepEqual(resizeFromCorner(r, "nw", -40, -30), { x: 60, y: 70, w: 440, h: 330 });
  assert.deepEqual(resizeFromCorner(r, "ne", 10, -10), { x: 100, y: 90, w: 410, h: 310 });
  assert.deepEqual(resizeFromCorner(r, "sw", -10, 10), { x: 90, y: 100, w: 410, h: 310 });
  // shrinking past the minimum stops at it, and the fixed corner stays where it was
  const small = resizeFromCorner(r, "nw", 1000, 1000);
  assert.equal(small.w, 260);
  assert.equal(small.x + small.w, 500);
  assert.equal(small.y + small.h, 400);
});

test("findSpot finds the first free place clear of the others", () => {
  {
    const area = { x: 0, y: 0, w: 700, h: 400 };
    assert.deepEqual(findSpot([], { w: 300, h: 150 }, area), { x: 0, y: 0 });
    const spot = findSpot([{ x: 0, y: 0, w: 300, h: 150 }], { w: 300, h: 150 }, area);
    assert.ok(spot && (spot.x >= 312 || spot.y >= 162));
    assert.equal(findSpot([{ x: 0, y: 0, w: 700, h: 400 }], { w: 300, h: 150 }, area), null);
  }
});

test("vertical bands stack top to bottom, each row centred on the widest", () => {
  const s = { a: { w: 300, h: 200 }, b: { w: 300, h: 100 }, stage: { w: 800, h: 400 }, m: { w: 200, h: 100 } };
  const l = bandLayout([["a", "b"], ["stage"], ["m"]], s, { direction: "vertical", gap: 20, bandGap: 50 });
  assert.deepEqual(l.stage, { x: 0, y: 250, w: 800, h: 400 });
  assert.deepEqual(l.a, { x: 90, y: 0, w: 300, h: 200 });
  assert.deepEqual(l.b, { x: 410, y: 0, w: 300, h: 100 });
  assert.deepEqual(l.m, { x: 300, y: 700, w: 200, h: 100 });
});

test("a band longer than the wrap breaks into lines with the small gap", () => {
  const s = { a: { w: 300, h: 100 }, b: { w: 300, h: 100 }, c: { w: 300, h: 100 } };
  const l = bandLayout([["a", "b", "c"]], s, { direction: "vertical", gap: 10, bandGap: 99, wrap: 700 });
  assert.deepEqual([l.a.y, l.b.y, l.c.y], [0, 0, 110]);
  assert.equal(l.c.x, 155);
});

test("horizontal bands go left to right", () => {
  const s = { a: { w: 300, h: 200 }, b: { w: 300, h: 200 }, m: { w: 200, h: 100 } };
  const l = bandLayout([["a", "b"], ["m"]], s, { direction: "horizontal", gap: 20, bandGap: 50 });
  assert.deepEqual([l.a.x, l.a.y, l.b.x, l.b.y], [0, 0, 0, 220]);
  assert.deepEqual([l.m.x, l.m.y], [350, 160]);
});

test("fit shows every rectangle centred", () => {
  const v = fitView([{ x: 0, y: 0, w: 1000, h: 500 }], { w: 532, h: 532 }, { min: 0.1, max: 2 });
  assert.ok(v);
  assert.equal(v.zoom, 0.5);
  assert.deepEqual([v.x, v.y], [16, 141]);
  assert.equal(fitView([], B, { min: 0.1, max: 2 }), null);
});
