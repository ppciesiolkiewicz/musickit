import { test } from "node:test";
import assert from "node:assert/strict";
import { BREATH_DRILLS, READY_SECONDS, breathPlan, farinelliCounts, fullness, phaseAt, totalSeconds } from "./breaths";

test("farinelli: in, hold and out for the same count, one count more each cycle", () => {
  const plan = breathPlan("farinelli", { from: 3, to: 5 });
  assert.equal(plan[0].kind, "ready");
  assert.deepEqual(plan.slice(1).map((b) => `${b.kind}${b.seconds}`), ["in3", "hold3", "out3", "in4", "hold4", "out4", "in5", "hold5", "out5"]);
  assert.equal(totalSeconds(plan), READY_SECONDS + 3 * (3 + 4 + 5));
  assert.deepEqual(plan.map((b) => b.round), [0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
});

test("farinelli counts: defaults 4 to 8, clamped, never down", () => {
  assert.deepEqual(farinelliCounts(), [4, 5, 6, 7, 8]);
  assert.deepEqual(farinelliCounts({ from: 10 }), [10]);
  assert.deepEqual(farinelliCounts({ from: 6, to: 3 }), [6]);
  assert.deepEqual(farinelliCounts({ from: 0, to: 99 }).at(-1), 20);
});

test("cue drills repeat their round", () => {
  const sz = breathPlan("sss-zzz", { seconds: 5, rounds: 2 });
  assert.deepEqual(sz.slice(1).map((b) => b.kind), ["sss", "zzz", "sss", "in", "sss", "zzz", "sss", "in"]);
  assert.equal(sz[1].seconds, 5);
  assert.deepEqual(breathPlan("zzz-sss", { rounds: 1 }).slice(1).map((b) => b.kind), ["zzz", "sss", "zzz", "in"]);
  const le = breathPlan("long-exhale", { seconds: 10, rounds: 1 }).slice(1);
  assert.deepEqual(le.map((b) => `${b.kind}${b.seconds}`), ["in4", "out10"]);
  assert.equal(breathPlan("body-scan").filter((b) => b.kind === "body").length, 8);
});

test("phases are laid end to end and found by time", () => {
  for (const d of BREATH_DRILLS) {
    const plan = breathPlan(d);
    plan.forEach((b, i) => i && assert.equal(b.at, plan[i - 1].at + plan[i - 1].seconds));
    assert.equal(phaseAt(plan, totalSeconds(plan)), null);
    assert.equal(phaseAt(plan, -1), null);
  }
  const plan = breathPlan("farinelli", { from: 2, to: 2 });
  assert.deepEqual(phaseAt(plan, READY_SECONDS + 1), { index: 1, progress: 0.5 });
});

test("the circle fills breathing in, stays holding, empties breathing out", () => {
  const plan = breathPlan("farinelli", { from: 2, to: 2 });
  assert.equal(fullness(plan, 1, 1), 1);
  assert.equal(fullness(plan, 2, 0.5), 1);
  assert.ok(Math.abs(fullness(plan, 3, 1) - 0.15) < 1e-9);
});
