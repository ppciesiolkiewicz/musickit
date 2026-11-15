import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_STATE, type PlanConfig, type StoredPlan } from "./types";
import { addedPlan, takeAdded } from "./added";

const plan = (id: string): StoredPlan => ({ id, startedOn: "2026-11-15", done: {}, config: { title: id, days: [] } as unknown as PlanConfig });

test("a claimed plan that became the current one needs no notice; one in the history is named; an unknown id is nothing", () => {
  const s = { ...EMPTY_STATE, current: plan("mine"), history: [plan("invited"), plan("old")] };
  assert.equal(addedPlan(s, "invited"), s.history[0]);
  assert.equal(addedPlan(s, "mine"), null);
  assert.equal(addedPlan(s, "gone"), null);
  assert.equal(addedPlan(s, null), null);
});

test("takeAdded reads ?added= and gives the address without it, keeping the rest", () => {
  assert.deepEqual(takeAdded("/plan?added=abc"), { id: "abc", rest: "/plan" });
  assert.deepEqual(takeAdded("/plan?day=2&added=abc#x"), { id: "abc", rest: "/plan?day=2#x" });
  assert.deepEqual(takeAdded("/plan?day=2"), { id: null, rest: "/plan?day=2" });
});
