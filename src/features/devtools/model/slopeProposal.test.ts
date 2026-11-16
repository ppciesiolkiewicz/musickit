import { test } from "node:test";
import assert from "node:assert/strict";
import { levelIndex, predecessorsOf, slopeIndex, stepAt } from "@/features/plan/model/path";
import { ADDED_AFTER, ADDED_TRACKS, proposedPath } from "./slopeProposal";

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

test("added tracks have new ids and sit before a real track", () => {
  for (const { before, track } of ADDED_TRACKS) {
    assert.ok(P.some((t) => t.id === before), before);
    assert.equal(P.filter((t) => t.id === track.id).length, 1, track.id);
  }
});

test("the proposal has no cycle and keeps every step after what it needs", () => {
  const at = slopeIndex(P);
  for (const [ref, i] of at) for (const p of predecessorsOf(ref, P)) assert.ok(at.get(p)! < i, `${p} → ${ref}`);
});
