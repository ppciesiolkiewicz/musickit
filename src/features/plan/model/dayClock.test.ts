import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dayClock, elapsedOf, spentOf, withSpent } from "./dayClock";

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
