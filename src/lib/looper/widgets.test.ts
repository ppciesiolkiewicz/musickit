import { test } from "node:test";
import assert from "node:assert/strict";
import { clampWidget, defaultWidgets, moveWidget, raise, resizeWidget, sanitiseWidgets } from "./widgets";

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
  const r = clampWidget({ x: 50, y: 50, w: 500, h: 500 }, { w: 200, h: 100 });
  assert.deepEqual(r, { x: 0, y: 0, w: 200, h: 100 });
});

test("defaults fill the board side by side", () => {
  const d = defaultWidgets(B);
  assert.equal(d.mixer.x, 0);
  assert.equal(d.looping.x + d.looping.w, 1000);
  assert.ok(d.mixer.x + d.mixer.w <= d.looping.x);
});

test("saved layouts are repaired", () => {
  const s = sanitiseWidgets({ mixer: { x: -5, y: 0, w: 5000, h: 100 }, looping: "junk" }, B);
  assert.deepEqual(s.mixer, { x: 0, y: 0, w: 1000, h: 140 });
  assert.deepEqual(s.looping, defaultWidgets(B).looping);
  assert.deepEqual(sanitiseWidgets(null, B), defaultWidgets(B));
});

test("raise puts a widget on top", () => {
  assert.deepEqual(raise(["mixer", "looping"], "mixer"), ["looping", "mixer"]);
});
