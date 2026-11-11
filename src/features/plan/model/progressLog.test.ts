import { test } from "node:test";
import assert from "node:assert/strict";
import { backfill, entryFor } from "./progressLog";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (id: string | undefined, extra: Partial<PlanExercise> = {}): PlanExercise => ({ ...(id ? { id } : {}), title: `Ex ${id}`, minutes: 5, cells: [], ...extra });
const plan = (id: string, rated: StoredPlan["rated"] = {}): StoredPlan => ({
  id, startedOn: "2026-11-01", done: {}, rated,
  config: { title: "W", days: Array.from({ length: 7 }, (_, d) => ({ theme: `T${d}`, exercises: [ex(`${id}-${d}-0`), ex(`${id}-${d}-1`, { area: "guitar", level: "beginner", topic: "guitar-caged", concepts: ["caged"] })] })) },
});
const counter = () => { let n = 0; return () => `row${++n}`; };
const AT = "2026-11-10T10:00:00.000Z";

test("entryFor copies what the row needs to be read without the plan", () => {
  assert.deepEqual(entryFor(plan("p"), 2, 1, { stars: 4, at: AT }, counter()), {
    id: "row1", planId: "p", exerciseId: "p-2-1", day: 2, exercise: 1, title: "Ex p-2-1",
    area: "guitar", level: "beginner", topic: "guitar-caged", concepts: ["caged"], stars: 4, at: AT,
  });
  assert.deepEqual(entryFor(plan("p"), 0, 0, { stars: 1, at: AT }, counter()), { id: "row1", planId: "p", exerciseId: "p-0-0", day: 0, exercise: 0, title: "Ex p-0-0", stars: 1, at: AT });
});

test("entryFor: no such exercise, or one without an id, gives null", () => {
  assert.equal(entryFor(plan("p"), 9, 0, { stars: 3, at: AT }, counter()), null);
  assert.equal(entryFor(plan("p"), 0, 5, { stars: 3, at: AT }, counter()), null);
  const p = plan("p");
  delete p.config.days[0].exercises[0].id;
  assert.equal(entryFor(p, 0, 0, { stars: 3, at: AT }, counter()), null);
});

test("backfill: one row per rated exercise of every plan, with the stored stars and time", () => {
  const rows = backfill([plan("a", { "0:0": { stars: 2, at: AT }, "3:1": { stars: 5, at: "2026-11-11T10:00:00.000Z" } }), plan("b", { "6:0": { stars: 3, at: AT }, "9:9": { stars: 3, at: AT }, "x": { stars: 3, at: AT } }), plan("c")], counter());
  assert.deepEqual(rows.map((r) => [r.planId, r.exerciseId, r.stars, r.at]), [["a", "a-0-0", 2, AT], ["a", "a-3-1", 5, "2026-11-11T10:00:00.000Z"], ["b", "b-6-0", 3, AT]]);
  assert.equal(new Set(rows.map((r) => r.id)).size, 3);
  assert.deepEqual(backfill([{ ...plan("d"), rated: undefined }], counter()), []);
});
