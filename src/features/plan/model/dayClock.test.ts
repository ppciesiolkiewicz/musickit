import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dayClock, elapsedOf, parseDayTime, spentOf, withDayTime, withSpent } from "./dayClock";
import { EMPTY_STATE, type PlanState } from "./types";

describe("dayClock", () => {
  it("lays the exercises end to end", () => {
    assert.deepEqual(dayClock([5, 10], 0), { total: 900, left: 900, exercise: 0, leftInExercise: 300 });
    assert.deepEqual(dayClock([5, 10], 299), { total: 900, left: 601, exercise: 0, leftInExercise: 1 });
    assert.deepEqual(dayClock([5, 10], 300), { total: 900, left: 600, exercise: 1, leftInExercise: 600 });
  });
  it("stops at zero, past the end too", () => {
    assert.deepEqual(dayClock([5], 300), { total: 300, left: 0, exercise: null, leftInExercise: 0 });
    assert.deepEqual(dayClock([5], 9999), { total: 300, left: 0, exercise: null, leftInExercise: 0 });
  });
  it("reads a negative time as the start", () => assert.equal(dayClock([1], -5).left, 60));
});

describe("elapsedOf", () => {
  it("reads a day's stored seconds, whole and safe", () => {
    assert.equal(elapsedOf({ "2": 61.7 }, 2), 61);
    assert.equal(elapsedOf({ "2": -3 }, 2), 0);
    assert.equal(elapsedOf({ "2": NaN }, 2), 0);
    assert.equal(elapsedOf(undefined, 0), 0);
  });
});

describe("spentOf / withSpent", () => {
  it("reads a day's seconds per exercise, missing ones as 0", () => {
    assert.deepEqual(spentOf({ "1:0": 30, "1:2": 12.9, "0:0": 5 }, 1, 3), [30, 0, 12]);
    assert.deepEqual(spentOf(undefined, 0, 2), [0, 0]);
  });
  it("writes one day, keeps the others, drops zeros", () => {
    assert.deepEqual(withSpent({ "0:0": 5, "1:0": 9, "1:1": 4 }, 1, [20, 0]), { "0:0": 5, "1:0": 20 });
  });
});

describe("parseDayTime / withDayTime", () => {
  const time = { planId: "p1", day: 2, elapsed: 90, spent: [60, 30] };
  it("keeps a good time, whole seconds", () => {
    assert.deepEqual(parseDayTime({ ...time, elapsed: 90.7, extra: 1 }), time);
  });
  it("refuses a broken one", () => {
    for (const bad of [null, "x", { ...time, planId: "" }, { ...time, day: 7 }, { ...time, day: 1.5 }, { ...time, elapsed: -1 }, { ...time, spent: ["a"] }, { ...time, spent: Array(21).fill(1) }])
      assert.equal(parseDayTime(bad), null, JSON.stringify(bad));
  });
  const state: PlanState = { ...EMPTY_STATE, current: { id: "p1", startedOn: "2026-11-01", done: {}, config: { title: "W", days: [] }, elapsed: { "0": 10 }, spent: { "0:0": 10 } } };
  it("writes the day's seconds into the current plan", () => {
    const next = withDayTime(state, time);
    assert.deepEqual(next.current?.elapsed, { "0": 10, "2": 90 });
    assert.deepEqual(next.current?.spent, { "0:0": 10, "2:0": 60, "2:1": 30 });
  });
  it("gives the same state for another plan or the same seconds", () => {
    assert.equal(withDayTime(state, { ...time, planId: "old" }), state);
    const once = withDayTime(state, time);
    assert.equal(withDayTime(once, time), once);
  });
});
