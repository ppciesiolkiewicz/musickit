import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dayTime, elapsedOn, parseDayTime, spentOn, withDayTime } from "./planTime";
import type { PlanExercise } from "./types";

const ex = (id: string) => ({ id, title: id, minutes: 5, cells: [] }) as unknown as PlanExercise;

describe("parseDayTime", () => {
  const time = { planId: "p1", day: 2, elapsed: 90, spent: { a: 60, b: 30 } };
  it("keeps a good time, whole seconds, zeros dropped", () => {
    assert.deepEqual(parseDayTime({ ...time, elapsed: 90.7, spent: { a: 60.2, b: 30, c: 0 }, extra: 1 }), time);
  });
  it("refuses a broken one", () => {
    const many = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`e${i}`, 1]));
    for (const bad of [null, "x", { ...time, planId: "" }, { ...time, day: 7 }, { ...time, day: 1.5 }, { ...time, elapsed: -1 }, { ...time, spent: [1] }, { ...time, spent: { a: "x" } }, { ...time, spent: many }])
      assert.equal(parseDayTime(bad), null, JSON.stringify(bad));
  });
});

describe("a day's time by exercise id", () => {
  it("reads and writes seconds by id, in the day's order", () => {
    const t = dayTime("p", 1, [ex("a"), ex("b"), ex("c")], 125.6, [100, 0, 25]);
    assert.deepEqual(t, { planId: "p", day: 1, elapsed: 125, spent: { a: 100, c: 25 } });
    assert.deepEqual(spentOn([t], 1, [ex("c"), ex("new"), ex("a")]), [25, 0, 100], "a moved exercise keeps its seconds, a new one starts at 0");
    assert.equal(elapsedOn([t], 1), 125);
    assert.equal(elapsedOn([t], 2), 0);
  });
  it("withDayTime replaces the day's record, and gives the same array when nothing changed", () => {
    const a = { planId: "p", day: 0, elapsed: 10, spent: { x: 10 } };
    const times = withDayTime([], a);
    assert.equal(withDayTime(times, { ...a, spent: { x: 10 } }), times);
    const next = withDayTime(times, { ...a, elapsed: 20 });
    assert.deepEqual(next, [{ ...a, elapsed: 20 }]);
  });
});
