import { test } from "node:test";
import assert from "node:assert/strict";
import { FACE_ZOOM, circleAt, cropFor, ease, median, steady, readFaceLook, DEFAULT_FACE_LOOK } from "./faceCircle";

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

test("ease can zoom slower than it moves", () => {
  assert.deepEqual(ease({ x: 0, y: 0, side: 100 }, { x: 10, y: 20, side: 200 }, 0.5, 0.1), { x: 5, y: 10, side: 110 });
});

test("steady holds the zoom and place through small changes", () => {
  const held = { x: 400, y: 100, side: 300 };
  // the face 10% bigger and 10 px over: nothing moves
  assert.deepEqual(steady(held, { x: 395, y: 85, side: 330 }, 1280, 720), held);
  // leaning in: the face 30% bigger zooms, round the same place
  const near = steady(held, { x: 355, y: 55, side: 390 }, 1280, 720);
  assert.equal(near.side, 390);
  assert.deepEqual([near.x + near.side / 2, near.y + near.side / 2], [550, 250]);
  // moved well over: the crop follows, at its held size
  const over = steady(held, { x: 500, y: 100, side: 310 }, 1280, 720);
  assert.equal(over.side, 300);
  assert.equal(over.x + over.side / 2, 655);
  // no target yet: the goal
  assert.deepEqual(steady(null, held, 1280, 720), held);
});

test("median takes the middle look", () => {
  assert.equal(median([5, 1, 100, 3, 4]), 4);
  assert.equal(median([]), 0);
});
