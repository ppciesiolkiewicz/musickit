import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, anotherDay, givenPlan, givenToday, ownDay, ratePlan, startDay, storedPlans, updateGiven } from "./schedule";
import { blockIdOf, blockKeyOf } from "./blockId";
import type { ComposedDay } from "./compose";
import { EMPTY_STATE, planDays, type PlanConfig, type PlanExercise, type PlanState, type StoredPlan } from "./types";

test("addDays: a local date plus n days, across month, year and leap day", () => {
  assert.equal(addDays("2026-11-10", 1), "2026-11-11");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-11-10", 0), "2026-11-10");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

// --- one-day plans (NEW7 plan composer, Task 6)


const exOf = (title: string): PlanExercise => ({ title, minutes: 10, cells: [{ type: "text", id: "t", text: `Play ${title}.` }] } as PlanExercise);
const dayOf = (...titles: string[]): ComposedDay => ({ exercises: titles.map(exOf), steps: [], short: false });
const ids = (prefix = "n") => {
  let n = 0;
  return () => `${prefix}${++n}`;
};
const bid = (title: string) => blockIdOf(blockKeyOf(exOf(title)));

test("startDay puts a composed one-day plan in as current", () => {
  const s = startDay(EMPTY_STATE, { ...dayOf("A", "B"), short: true }, { date: "2026-11-18", attempt: 0, title: "Tuesday", theme: "Scales" }, ids());
  const p = s.current!;
  assert.equal(p.startedOn, "2026-11-18");
  assert.equal(planDays(p), 1);
  assert.equal(p.config.title, "Tuesday");
  assert.equal(p.config.days[0].theme, "Scales");
  assert.deepEqual(p.config.days[0].exercises.map((e) => e.blockId), [bid("A"), bid("B")]);
  assert.ok(p.config.days[0].exercises.every((e) => e.id));
  assert.deepEqual(p.composed, { attempt: 0, declined: [], short: true });
  assert.equal(ownDay(s, "2026-11-18"), p);
  assert.equal(ownDay(s, "2026-11-19"), null);
  const untitled = startDay(EMPTY_STATE, dayOf("A"), { date: "2026-11-18", attempt: 0 }, ids()).current!;
  assert.deepEqual([untitled.config.title, untitled.config.days[0].theme], ["", ""]);
});

test("startDay twice for the same date and attempt leaves one plan and the history as it was; a new date moves the day before to history[0]", () => {
  const old: StoredPlan = { id: "old", startedOn: "2026-11-10", done: {}, config: { title: "x", days: [] } as unknown as PlanConfig };
  const s1 = startDay({ ...EMPTY_STATE, history: [old] }, dayOf("A"), { date: "2026-11-17", attempt: 0 }, ids("a"));
  const again = startDay(s1, dayOf("B"), { date: "2026-11-17", attempt: 0 }, ids("b"));
  assert.equal(again, s1);
  // another attempt on the same date is anotherDay's job
  assert.equal(startDay(s1, dayOf("B"), { date: "2026-11-17", attempt: 1 }, ids("b")), s1);
  const s2 = startDay(s1, dayOf("C"), { date: "2026-11-18", attempt: 0 }, ids("c"));
  assert.equal(s2.history[0], s1.current);
  assert.equal(s2.history[1], old);
  assert.equal(s2.history.length, 2);
  assert.equal(s2.current?.startedOn, "2026-11-18");
});

test("the history keeps 60 plans (was 20)", () => {
  const many: StoredPlan[] = Array.from({ length: 70 }, (_, i) => ({ id: `h${i}`, startedOn: "2026-01-01", done: {}, config: { title: "x", days: [] } as unknown as PlanConfig }));
  let s: PlanState = { ...EMPTY_STATE, history: many.slice(0, 59) };
  s = startDay(s, dayOf("A"), { date: "2026-11-17", attempt: 0 }, ids("a"));
  s = startDay(s, dayOf("B"), { date: "2026-11-18", attempt: 0 }, ids("b"));
  assert.equal(s.history.length, 60);
  assert.equal(s.history[0].startedOn, "2026-11-17");
});

test("anotherDay keeps the rated exercise with its slot id and rating at its new place, and declines the rest", () => {
  let s = startDay(EMPTY_STATE, dayOf("A", "B", "C"), { date: "2026-11-18", attempt: 0 }, ids("a"));
  const [a] = s.current!.config.days[0].exercises;
  s = { ...s, current: ratePlan(s.current!, 0, 0, 4, "2026-11-18T10:00:00Z") };
  const before = s.current!;
  const next = anotherDay(s, dayOf("D", "A", "E"), { date: "2026-11-18", attempt: 1 }, ids("b"));
  const p = next.current!;
  assert.equal(p.id, before.id);
  assert.equal(p.startedOn, "2026-11-18");
  assert.deepEqual(p.config.days[0].exercises.map((e) => e.blockId), [bid("D"), bid("A"), bid("E")]);
  assert.equal(p.config.days[0].exercises[1].id, a.id);
  assert.notEqual(p.config.days[0].exercises[0].id, a.id);
  assert.deepEqual(p.rated, { "0:1": before.rated!["0:0"] });
  assert.deepEqual(p.done, { "0:1": true });
  assert.deepEqual(p.composed, { attempt: 1, declined: [bid("B"), bid("C")], short: false });
  assert.deepEqual(next.history, s.history);
  // the answer arriving twice changes nothing
  assert.equal(anotherDay(next, dayOf("F"), { date: "2026-11-18", attempt: 1 }, ids("c")), next);
  // a third try adds its own declined blocks to the ones already there, once each
  const third = anotherDay(next, dayOf("A", "B"), { date: "2026-11-18", attempt: 2 }, ids("d")).current!;
  assert.deepEqual(third.composed?.declined, [bid("B"), bid("C"), bid("D"), bid("E")]);
  assert.deepEqual(third.rated, { "0:0": before.rated!["0:0"] });
});

test("the spec's case: A (rated 4), B, C, then [A, D, E]", () => {
  let s = startDay(EMPTY_STATE, dayOf("A", "B", "C"), { date: "2026-11-18", attempt: 0 }, ids("a"));
  const aId = s.current!.config.days[0].exercises[0].id;
  s = { ...s, current: ratePlan(s.current!, 0, 0, 4, "2026-11-18T10:00:00Z") };
  const p = anotherDay(s, dayOf("A", "D", "E"), { date: "2026-11-18", attempt: 1 }, ids("b")).current!;
  assert.deepEqual(Object.keys(p.rated ?? {}), ["0:0"]);
  assert.equal(p.rated!["0:0"].stars, 4);
  assert.equal(p.config.days[0].exercises[0].id, aId);
  assert.deepEqual(p.composed?.declined, [bid("B"), bid("C")]);
  assert.equal(p.composed?.attempt, 1);
});

test("anotherDay keeps a rating given while the request was out: A (rated 4), B (rated 5 after the request), C; answer [A, D, E]", () => {
  let s = startDay(EMPTY_STATE, dayOf("A", "B", "C"), { date: "2026-11-18", attempt: 0 }, ids("a"));
  const [a, b] = s.current!.config.days[0].exercises;
  s = { ...s, current: ratePlan(s.current!, 0, 0, 4, "2026-11-18T10:00:00Z") };
  // the request goes out here; B is rated before the answer lands
  s = { ...s, current: ratePlan(s.current!, 0, 1, 5, "2026-11-18T10:01:00Z") };
  const p = anotherDay(s, dayOf("A", "D", "E"), { date: "2026-11-18", attempt: 1 }, ids("b")).current!;
  assert.deepEqual(p.config.days[0].exercises.map((e) => e.blockId), [bid("A"), bid("B"), bid("D"), bid("E")]);
  assert.equal(p.config.days[0].exercises[0].id, a.id);
  assert.equal(p.config.days[0].exercises[1].id, b.id);
  assert.deepEqual(Object.fromEntries(Object.entries(p.rated ?? {}).map(([k, r]) => [k, r.stars])), { "0:0": 4, "0:1": 5 });
  assert.deepEqual(p.done, { "0:0": true, "0:1": true });
  assert.deepEqual(p.composed?.declined, [bid("C")]);
});

test("anotherDay without today's own plan changes nothing", () => {
  const s = startDay(EMPTY_STATE, dayOf("A"), { date: "2026-11-17", attempt: 0 }, ids());
  assert.equal(anotherDay(s, dayOf("B"), { date: "2026-11-18", attempt: 1 }, ids()), s);
  assert.equal(anotherDay(EMPTY_STATE, dayOf("B"), { date: "2026-11-18", attempt: 1 }, ids()), EMPTY_STATE);
});

test("givenPlan finds a plan in the given list only", () => {
  const g: StoredPlan = { id: "g", startedOn: "2026-11-10", done: {}, from: "s1", config: { title: "w", days: [] } as unknown as PlanConfig };
  const s: PlanState = { ...EMPTY_STATE, current: { ...g, id: "c" }, given: [g] };
  assert.equal(givenPlan(s, "g"), g);
  assert.equal(givenPlan(s, "c"), undefined);
});

const week = (id: string, extra: Partial<StoredPlan> = {}): StoredPlan => ({
  id, startedOn: "2026-11-10", done: {}, from: "s1",
  config: { title: id, days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [{ id: `${id}-e${i}`, title: "Ex", minutes: 5, cells: [] }] })) } as unknown as PlanConfig,
  ...extra,
});

test("a rating on a given plan is stored on that plan in given; current, history and the other given plans are untouched", () => {
  const own: StoredPlan = { ...week("own"), from: undefined };
  const s: PlanState = { ...EMPTY_STATE, current: own, history: [week("old")], given: [week("g1"), week("g2")] };
  const next = updateGiven(s, "g2", (p) => ratePlan(p, 2, 0, 4, "2026-11-12T10:00:00Z"));
  assert.equal(next.current, own);
  assert.equal(next.history, s.history);
  assert.equal(next.given[0], s.given[0]);
  assert.deepEqual(next.given[1].rated, { "2:0": { stars: 4, at: "2026-11-12T10:00:00Z" } });
  assert.deepEqual(next.given[1].done, { "2:0": true });
  assert.equal(next.current?.rated, undefined);
});

test("updateGiven with an id not in given (the plan's own id, or gone) changes nothing", () => {
  const s: PlanState = { ...EMPTY_STATE, current: week("own"), given: [week("g1")] };
  assert.equal(updateGiven(s, "own", (p) => ratePlan(p, 0, 0, 5, "x")), s);
  assert.equal(updateGiven(s, "gone", (p) => ratePlan(p, 0, 0, 5, "x")), s);
});

test("storedPlans lists every plan the player has: current, then history, then given", () => {
  const s: PlanState = { ...EMPTY_STATE, current: week("own"), history: [week("old")], given: [week("g1")] };
  assert.deepEqual(storedPlans(s).map((p) => p.id), ["own", "old", "g1"]);
  assert.deepEqual(storedPlans({ ...s, current: null }).map((p) => p.id), ["old", "g1"]);
});

test("givenToday: the day of a given plan to open, and whether its days are over (then every day stays open)", () => {
  const p = week("g", { startedOn: "2026-11-10" });
  assert.deepEqual(givenToday(p, "2026-11-10"), { today: 0, over: false });
  assert.deepEqual(givenToday(p, "2026-11-13"), { today: 3, over: false });
  assert.deepEqual(givenToday(p, "2026-11-16"), { today: 6, over: false });
  assert.deepEqual(givenToday(p, "2026-11-17"), { today: 6, over: true });
  assert.deepEqual(givenToday(p, "2026-12-30"), { today: 6, over: true });
  assert.deepEqual(givenToday(p, "2026-11-01"), { today: 0, over: false }, "a device date before the start opens day 1");
});

test("givenToday: a fully rated last day stays the open day until its date has passed", () => {
  const rated = Object.fromEntries(Array.from({ length: 7 }, (_, d) => [`${d}:0`, { stars: 4 as const, at: "2026-11-16T10:00:00Z" }]));
  const done = Object.fromEntries(Object.keys(rated).map((k) => [k, true as const]));
  const p = week("g", { startedOn: "2026-11-10", rated, done });
  assert.deepEqual(givenToday(p, "2026-11-16"), { today: 6, over: false });
  assert.deepEqual(givenToday(p, "2026-11-17"), { today: 6, over: true });
});

test("givenToday: a shared plan of one day runs on its date, rated or not, and is over the day after", () => {
  const one: StoredPlan = { ...week("one", { startedOn: "2026-11-18" }), config: { title: "Wednesday 18 November", days: [week("x").config.days[0]] } as unknown as PlanConfig };
  assert.deepEqual(givenToday(one, "2026-11-18"), { today: 0, over: false });
  assert.deepEqual(givenToday({ ...one, done: { "0:0": true }, rated: { "0:0": { stars: 5, at: "2026-11-18T10:00:00Z" } } }, "2026-11-18"), { today: 0, over: false });
  assert.deepEqual(givenToday(one, "2026-11-19"), { today: 0, over: true });
});

test("anotherDay with an attempt lower than today's changes nothing (a late answer)", () => {
  let s = startDay(EMPTY_STATE, dayOf("A"), { date: "2026-11-18", attempt: 0 }, ids("a"));
  s = anotherDay(s, dayOf("B"), { date: "2026-11-18", attempt: 2 }, ids("b"));
  assert.equal(anotherDay(s, dayOf("C"), { date: "2026-11-18", attempt: 1 }, ids("c")), s);
});

test("startDay for a date before today's own plan changes nothing (a stale answer)", () => {
  const s = startDay(EMPTY_STATE, dayOf("A"), { date: "2026-11-18", attempt: 0 }, ids("a"));
  assert.equal(startDay(s, dayOf("B"), { date: "2026-11-17", attempt: 0 }, ids("b")), s);
});
