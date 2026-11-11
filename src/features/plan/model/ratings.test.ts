import { test } from "node:test";
import assert from "node:assert/strict";
import { ratePlan } from "./schedule";
import { weekReport } from "./prompt";
import { sanitiseState } from "../store/localPlanStore";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (title: string, extra: Partial<PlanExercise> = {}): PlanExercise => ({ title, minutes: 5, cells: [{ type: "text", text: "x" }], ...extra });
const plan = (done: Record<string, true> = {}): StoredPlan => ({
  id: "p", startedOn: "2026-11-01", done,
  config: { title: "Week", days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [ex("Ex A"), ex("Ex B"), ex("Ex C")] })) },
});
const T1 = "2026-11-10T10:00:00.000Z", T2 = "2026-11-10T11:00:00.000Z", T3 = "2026-11-10T12:00:00.000Z";

test("ratePlan rates, re-rates and clears an exercise without touching its input", () => {
  const p = plan();
  const a = ratePlan(p, 0, 1, 3, T1);
  assert.deepEqual(a.rated?.["0:1"], { stars: 3, at: T1 });
  assert.equal(a.done["0:1"], true);
  assert.deepEqual(p.done, {});
  assert.equal(p.rated, undefined);
  const b = ratePlan(a, 0, 1, 5, T2);
  assert.deepEqual(b.rated?.["0:1"], { stars: 5, at: T2 });
  assert.equal(b.done["0:1"], true);
  assert.deepEqual(a.rated?.["0:1"], { stars: 3, at: T1 });
  const c = ratePlan(b, 0, 1, null, T3);
  assert.equal(c.rated?.["0:1"], undefined);
  assert.equal(c.done["0:1"], undefined);
});

test("sanitiseState keeps a legacy plan with only done ticks", () => {
  const s = sanitiseState({ current: plan({ "0:0": true }) });
  assert.ok(s.current);
  assert.equal(s.current.done["0:0"], true);
  assert.deepEqual(s.current.rated ?? {}, {});
});

test("sanitiseState drops broken ratings one by one", () => {
  const p = { ...plan(), rated: { "0:0": { stars: 4, at: T1 }, "0:1": { stars: 0, at: T1 }, "0:2": { stars: "3", at: T1 }, "0:3": { stars: 2 } } };
  const s = sanitiseState({ current: p, history: [p] });
  assert.deepEqual(s.current?.rated, { "0:0": { stars: 4, at: T1 } });
  assert.deepEqual(s.history[0].rated, { "0:0": { stars: 4, at: T1 } });
});

test("weekReport shows stars and level per exercise", () => {
  const p = plan({ "0:1": true });
  p.config.days[0].exercises[0] = ex("Ex A", { level: "beginner" });
  const r = weekReport({ ...p, done: { ...p.done, "0:0": true }, rated: { "0:0": { stars: 2, at: T1 } } });
  assert.match(r, /\[2★ Struggling\] Ex A \(beginner\)/);
  assert.match(r, /\[done\] Ex B(;|$)/m);
  assert.match(r, /\[skipped\] Ex C(;|$)/m);
});
