import { test } from "node:test";
import assert from "node:assert/strict";
import { depthOf, levelIndex, predecessorsOf, slopeIndex, stepAt } from "@/features/plan/model/path";
import { ADDED_AFTER, proposedPath } from "./slopeProposal";

const P = proposedPath();

test("every added link points at a real step in another track, no higher than its own", () => {
  for (const [ref, adds] of Object.entries(ADDED_AFTER)) {
    const at = stepAt(ref, P);
    assert.ok(at, ref);
    for (const a of adds) {
      const to = stepAt(a, P);
      assert.ok(to, a);
      assert.notEqual(to.track.id, at.track.id);
      assert.ok(levelIndex(to.step.level) <= levelIndex(at.step.level), `${a} is above ${ref}`);
    }
  }
});

test("the proposal has no cycle and keeps every step after what it needs", () => {
  const at = slopeIndex(P);
  for (const [ref, i] of at) for (const p of predecessorsOf(ref, P)) assert.ok(at.get(p)! < i, `${p} → ${ref}`);
});

test("the orders the user asked for", () => {
  const at = slopeIndex(P);
  assert.ok(at.get("double-stops:2")! < at.get("triads:1")!);
  assert.ok(at.get("triads:1")! < at.get("barre:1")!);
  assert.ok(at.get("pentatonic-positions:1")! < at.get("major-on-neck:1")!);
  assert.ok(depthOf("modes:4", P) > depthOf("scales:1", P));
  assert.ok(depthOf("major-on-neck:6", P) > depthOf("pentatonic-positions:1", P));
});

test("double stops sit in the CAGED topic, right before triads", () => {
  const i = P.findIndex((t) => t.id === "double-stops");
  assert.equal(P[i + 1].id, "triads");
  assert.equal(P[i].topic, "guitar-caged");
});
