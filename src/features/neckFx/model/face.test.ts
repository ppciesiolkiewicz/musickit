import { test } from "node:test";
import assert from "node:assert/strict";
import { FACE_OVAL, easeFace, faceFrame, slimAt, slimRow, slimX, toFace } from "./face";
import type { Pt } from "./grid";

/** A face of 478 points: eyes level at y 100 (x 80 and 120), the oval a circle of radius 50 round (100, 120). */
function face(dx = 0, turn = 0): Pt[] {
  const pts: Pt[] = Array.from({ length: 478 }, () => ({ x: 100, y: 120 }));
  FACE_OVAL.forEach((i, k) => { const a = (k / FACE_OVAL.length) * Math.PI * 2; pts[i] = { x: 100 + 50 * Math.sin(a), y: 120 - 50 * Math.cos(a) }; });
  pts[33] = { x: 80, y: 100 }; pts[263] = { x: 120, y: 100 };
  const c = Math.cos(turn), s = Math.sin(turn);
  return pts.map((p) => ({ x: 100 + (p.x - 100) * c - (p.y - 100) * s + dx, y: 100 + (p.x - 100) * s + (p.y - 100) * c }));
}

test("faceFrame: upright face", () => {
  const f = faceFrame(face())!;
  assert.deepEqual(f.c, { x: 100, y: 100 });
  assert.ok(Math.abs(f.u.x - 1) < 1e-9 && Math.abs(f.v.y - 1) < 1e-9);
  assert.ok(Math.abs(f.halfW - 50) < 0.5);
  assert.ok(Math.abs(f.bottom - 70) < 0.5 && Math.abs(f.top + 30) < 0.5);
});

test("faceFrame: a tilted face reads the same in its own frame", () => {
  const f = faceFrame(face(0, 0.4))!;
  assert.ok(Math.abs(f.halfW - 50) < 0.5 && Math.abs(f.bottom - 70) < 0.5);
  const chin = toFace(f, face(0, 0.4)[FACE_OVAL[18]]);
  assert.ok(Math.abs(chin.x) < 0.5 && Math.abs(chin.y - 70) < 0.5);
});

test("faceFrame: too few points", () => assert.equal(faceFrame([{ x: 0, y: 0 }]), null));

test("easeFace: eases a small move, takes a jump as it is", () => {
  const eased = easeFace(face(), face(4));
  assert.equal(eased[33].x, 82);
  assert.equal(easeFace(face(), face(40))[33].x, 120);
  assert.equal(easeFace(null, face())[33].x, 80);
});

test("slimAt: none at the eyes and well below the chin, most toward the jaw, scaled by strength", () => {
  const f = faceFrame(face())!;
  assert.equal(slimAt(f, 0, 1), 0);
  assert.equal(slimAt(f, -20, 1), 0);
  assert.equal(slimAt(f, 90, 1), 0);
  const jaw = slimAt(f, 40, 1);
  assert.ok(jaw > 2 && jaw <= 3);
  assert.ok(Math.abs(slimAt(f, 40, 2) - 2 * jaw) < 1e-9);
  assert.equal(slimAt(f, 40, 0), 0);
});

test("slimRow and slimX: edges and middle stay, the face's edges move in", () => {
  const pieces = slimRow(70, 50, 3);
  assert.deepEqual(pieces[0].to, [-70, -47]);
  assert.equal(slimX(-70, 70, 50, 3), -70);
  assert.equal(slimX(70, 70, 50, 3), 70);
  assert.equal(slimX(0, 70, 50, 3), 0);
  assert.equal(slimX(-50, 70, 50, 3), -47);
  assert.equal(slimX(50, 70, 50, 3), 47);
  assert.equal(slimX(100, 70, 50, 3), 100);
});
