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
    const t = dayTime("p", 1, [ex("a"), ex("b"), ex("c")], 125.6, [100, 0, 25], undefined, "2026-11-15");
    assert.deepEqual(t, { planId: "p", day: 1, elapsed: 125, spent: { a: 100, c: 25 }, on: { "2026-11-15": 125 } });
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

describe("blocks and dates of a day's time", () => {
  const B1 = "a".repeat(32);
  const B2 = "b".repeat(32);
  const good = { planId: "p1", day: 2, elapsed: 90, spent: { s1: 60 } };
  const a = ex("s1");
  const b = ex("s2");
  it("dayTime records each timed slot's block, only for slots with seconds", () => {
    const t = dayTime("p", 0, [{ ...a, id: "s1", blockId: B1 }, { ...b, id: "s2", blockId: B2 }], 90, [60, 0]);
    assert.deepEqual(t.blocks, { s1: B1 });
    assert.equal("blocks" in dayTime("p", 0, [a], 60, [60]), false);
  });
  it("parseDayTime keeps blocks leniently", () => {
    assert.deepEqual(parseDayTime({ ...good, blocks: null }), good);
    assert.deepEqual(parseDayTime({ ...good, blocks: { s1: B1, ghost: B2, s3: 5 } })?.blocks, { s1: B1 });
    assert.equal(parseDayTime({ ...good, blocks: "x" })?.planId, good.planId);
    assert.equal("blocks" in parseDayTime({ ...good, blocks: { ghost: B2 } })!, false);
  });
  it("withDayTime sees a change in blocks alone", () => {
    const t = { ...good, blocks: { s1: B1 } };
    const ts = [t];
    assert.equal(withDayTime(ts, { ...t, blocks: { s1: B1 } }), ts);
    assert.notEqual(withDayTime(ts, { ...t, blocks: { s1: B2 } }), ts);
  });
  it("dayTime adds the new seconds to today's date, keeping earlier dates", () => {
    const first = dayTime("p", 2, [{ ...a, id: "s1" }], 120, [120], undefined, "2026-11-14");
    assert.deepEqual(first.on, { "2026-11-14": 120 });
    const next = dayTime("p", 2, [{ ...a, id: "s1" }], 300, [300], first, "2026-11-15");
    assert.deepEqual(next.on, { "2026-11-14": 120, "2026-11-15": 180 });
    assert.deepEqual(dayTime("p", 2, [{ ...a, id: "s1" }], 310, [310], next, "2026-11-15").on, { "2026-11-14": 120, "2026-11-15": 190 });
    assert.equal("on" in dayTime("p", 2, [], 0, [], undefined, "2026-11-15"), false);
  });
  it("dayTime puts a legacy record's earlier seconds on its plan date, never today", () => {
    const prev = { planId: "p", day: 1, elapsed: 600, spent: { s1: 600 } };
    const ex1 = [{ ...a, id: "s1" }];
    assert.deepEqual(dayTime("p", 1, ex1, 900, [900], prev, "2026-11-15", "2026-11-10").on, { "2026-11-11": 600, "2026-11-15": 300 });
    assert.deepEqual(dayTime("p", 1, ex1, 900, [900], prev, "2026-11-15").on, { "2026-11-15": 300 });
  });
  it("dayTime keeps the 31 latest dates", () => {
    const on = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`2026-10-${String(i + 1).padStart(2, "0")}`, 1]));
    const t = dayTime("p", 0, [{ ...a, id: "s1" }], 10, [10], { planId: "p", day: 0, elapsed: 5, spent: {}, on }, "2026-11-15");
    assert.equal(Object.keys(t.on!).length, 31);
    assert.equal("2026-10-01" in t.on!, false);
    assert.equal(t.on!["2026-11-15"], 5);
  });
  it("parseDayTime keeps on leniently: bad dates, non-numbers and negatives dropped, not the record", () => {
    assert.deepEqual(parseDayTime({ ...good, on: { "2026-11-14": 60.7, "nope": 5, "2026-11-15": -3, "2026-11-16": "9", "2026-11-17": 0 } })?.on, { "2026-11-14": 60 });
    assert.deepEqual(parseDayTime({ ...good, on: null }), good);
    assert.equal(parseDayTime({ ...good, on: [1] })?.planId, good.planId);
    assert.equal("on" in parseDayTime({ ...good, on: {} })!, false);
  });
  it("parseDayTime keeps at most the 31 latest dates", () => {
    const on = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`2026-${i < 20 ? "09" : "10"}-${String((i % 20) + 1).padStart(2, "0")}`, 1]));
    assert.equal(Object.keys(parseDayTime({ ...good, on })!.on!).length, 31);
  });
  it("withDayTime sees a change in on alone", () => {
    const t = { ...good, on: { "2026-11-14": 60 } };
    const ts = [t];
    assert.equal(withDayTime(ts, { ...t, on: { "2026-11-14": 60 } }), ts);
    assert.notEqual(withDayTime(ts, { ...t, on: { "2026-11-14": 61 } }), ts);
  });
});
