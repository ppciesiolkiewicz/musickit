import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, anotherDay, givenPlan, ownDay, ratePlan, startDay, startPlan, weekOver } from "./schedule";
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
  const started = startPlan({ ...EMPTY_STATE, current: many[0], history: many.slice(1) }, { title: "w", days: [] }, ids(), "2026-11-18");
  assert.equal(started.history.length, 60);
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

test("weekOver follows planDays: a one-day plan is over the day after; a seven-day plan as before", () => {
  const one = startDay(EMPTY_STATE, dayOf("A", "B"), { date: "2026-11-18", attempt: 0 }, ids()).current!;
  assert.equal(weekOver(one, "2026-11-18"), false);
  assert.equal(weekOver(one, "2026-11-19"), true);
  const week: StoredPlan = { id: "w", startedOn: "2026-11-10", done: {}, from: "s1", config: { title: "w", days: Array.from({ length: 7 }, () => ({ theme: "t", exercises: [exOf("A")] })) } };
  assert.equal(planDays(week), 7);
  assert.equal(weekOver(week, "2026-11-16"), false);
  assert.equal(weekOver(week, "2026-11-17"), true);
});

test("givenPlan finds a plan in the given list only", () => {
  const g: StoredPlan = { id: "g", startedOn: "2026-11-10", done: {}, from: "s1", config: { title: "w", days: [] } as unknown as PlanConfig };
  const s: PlanState = { ...EMPTY_STATE, current: { ...g, id: "c" }, given: [g] };
  assert.equal(givenPlan(s, "g"), g);
  assert.equal(givenPlan(s, "c"), undefined);
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
