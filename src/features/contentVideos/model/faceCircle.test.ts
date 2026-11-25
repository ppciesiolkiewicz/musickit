import { test } from "node:test";
import assert from "node:assert/strict";
import { FACE_ZOOM, circleAt, cropFor, ease, readFaceLook, DEFAULT_FACE_LOOK } from "./faceCircle";

test("circleAt puts the circle in its corner, clear of the edges", () => {
  const bl = circleAt({ corner: "bottom-left", size: "medium" }, 1280, 720);
  assert.ok(bl.cx - bl.r > 0 && bl.cy + bl.r < 720);
  assert.ok(bl.cx < 640 && bl.cy > 360);
  const tr = circleAt({ corner: "top-right", size: "large" }, 1280, 720);
  assert.ok(tr.cx + tr.r < 1280 && tr.cy - tr.r > 0);
  assert.ok(tr.r > bl.r);
});

test("cropFor centres a square on the face, zoomed out, inside the picture", () => {
  const c = cropFor({ x: 600, y: 300, w: 100, h: 120 }, 1280, 720);
  assert.equal(c.side, 120 * FACE_ZOOM);
  assert.equal(c.x + c.side / 2, 650);
  assert.equal(c.y + c.side / 2, 360);
  // a face at the edge: the square stays in the picture
  const edge = cropFor({ x: 0, y: 0, w: 100, h: 100 }, 1280, 720);
  assert.deepEqual([edge.x, edge.y], [0, 0]);
  // a face larger than the picture allows: the whole height
  assert.equal(cropFor({ x: 400, y: 0, w: 600, h: 700 }, 1280, 720).side, 720);
});

test("cropFor with no face takes the middle", () => {
  assert.deepEqual(cropFor(null, 1280, 720), { x: 280, y: 0, side: 720 });
});

test("ease moves part of the way", () => {
  assert.deepEqual(ease({ x: 0, y: 0, side: 100 }, { x: 10, y: 20, side: 200 }, 0.5), { x: 5, y: 10, side: 150 });
});

test("readFaceLook falls back per part", () => {
  assert.deepEqual(readFaceLook(null), DEFAULT_FACE_LOOK);
  assert.deepEqual(readFaceLook({ corner: "top-right", size: "huge" }), { corner: "top-right", size: DEFAULT_FACE_LOOK.size });
});
