import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, anotherDay, dayBeforeWeek, giveWeek, givenPlan, givenToday, ownDay, ratePlan, startDay, storedPlans, teacherWeek, teacherWeekOn, upcomingTeacherWeek, updateGiven } from "./schedule";
import { HISTORY_CAP } from "./state";
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

// --- a teacher's week for a student (teachers and students, Task 5)

const sevenDays = (prefix: string): ComposedDay[] => Array.from({ length: 7 }, (_, i) => dayOf(`${prefix}${i}a`, `${prefix}${i}b`));

test("giveWeek puts a seven-day plan first in given, made by the teacher; current and history are left as they are", () => {
  const s: PlanState = { ...EMPTY_STATE, current: week("own", { from: undefined }), history: [week("old")], given: [week("g1")] };
  const out = giveWeek(s, sevenDays("W"), { start: "2026-11-18", madeAt: "2026-11-18T12:00:00.000Z", title: "" }, ids("w"));
  const p = out.given[0];
  assert.equal(out.given.length, 2);
  assert.equal(out.given[1], s.given[0]);
  assert.equal(out.current, s.current);
  assert.equal(out.history, s.history);
  assert.equal(p.id, "w1");
  assert.equal(p.startedOn, "2026-11-18");
  assert.deepEqual(p.teacher, { madeAt: "2026-11-18T12:00:00.000Z" });
  assert.deepEqual(p.done, {});
  assert.equal(p.composed, undefined);
  assert.equal(planDays(p), 7);
  assert.deepEqual(p.config.days.map((d) => d.theme), ["", "", "", "", "", "", ""]);
  // exercises stored as startDay stores them: new ids, block ids computed from the content
  const e = p.config.days[2].exercises[1];
  assert.equal(e.title, "W2b");
  assert.match(e.id!, /^w\d+$/);
  assert.equal(e.blockId, bid("W2b"));
  assert.equal(new Set(p.config.days.flatMap((d) => d.exercises.map((x) => x.id))).size, 14);
});

test("giveWeek keeps empty composed days, so day numbers match dates", () => {
  const days = sevenDays("W");
  days[5] = { exercises: [], steps: [], short: true };
  const p = giveWeek(EMPTY_STATE, days, { start: "2026-11-18", madeAt: "x", title: "" }, ids()).given[0];
  assert.equal(planDays(p), 7);
  assert.deepEqual(p.config.days[5].exercises, []);
});

test("giveWeek with replace: the old week leaves given and goes first in history with its ratings; a block id from the client is never trusted", () => {
  const rated = { "0:0": { stars: 4 as const, at: "2026-11-18T10:00:00Z" } };
  const old = week("t1", { from: undefined, teacher: { madeAt: "2026-11-17T09:00:00Z", comment: "Slow down." }, startedOn: "2026-11-17", rated, done: { "0:0": true } });
  const s: PlanState = { ...EMPTY_STATE, history: Array.from({ length: HISTORY_CAP }, (_, i) => week(`h${i}`)), given: [week("g1"), old] };
  const days = sevenDays("R");
  days[0] = { ...days[0], exercises: [{ ...days[0].exercises[0], blockId: "forged" }] };
  const out = giveWeek(s, days, { start: "2026-11-17", madeAt: "2026-11-18T12:00:00Z", title: "", replace: "t1" }, ids("r"));
  assert.deepEqual(out.given.map((p) => p.id), ["r1", "g1"]);
  assert.equal(out.history.length, HISTORY_CAP);
  assert.equal(out.history[0], old);
  assert.deepEqual(out.history[0].rated, rated);
  assert.equal(out.history[1].id, "h0");
  assert.equal(out.given[0].config.days[0].exercises[0].blockId, bid("R0a"));
  // an id not in given replaces nothing
  const none = giveWeek(s, days, { start: "2026-11-17", madeAt: "x", title: "", replace: "gone" }, ids("q"));
  assert.deepEqual(none.given.map((p) => p.id), ["q1", "g1", "t1"]);
  assert.equal(none.history, s.history);
});

test("teacherWeek: the newest given week a teacher made that has started by the date; teacherWeekOn: the one whose days cover it", () => {
  const t = (id: string, startedOn: string, madeAt = `${startedOn}T08:00:00Z`) => week(id, { from: undefined, startedOn, teacher: { madeAt } });
  const s: PlanState = { ...EMPTY_STATE, current: t("own", "2026-11-18"), given: [week("shared", { startedOn: "2026-11-20" }), t("next", "2026-11-17"), t("first", "2026-11-03")] };
  assert.equal(teacherWeek(s, "2026-11-18")?.id, "next");
  assert.equal(teacherWeek(s, "2026-11-10")?.id, "first");
  assert.equal(teacherWeek(s, "2026-11-01"), null);
  assert.equal(teacherWeekOn(s, "2026-11-17")?.id, "next");
  assert.equal(teacherWeekOn(s, "2026-11-23")?.id, "next");
  assert.equal(teacherWeekOn(s, "2026-11-24"), null, "its seven days are over");
  assert.equal(teacherWeekOn(s, "2026-11-09")?.id, "first");
  assert.equal(teacherWeekOn(s, "2026-11-12"), null, "between two weeks");
  assert.equal(teacherWeek(EMPTY_STATE, "2026-11-18"), null);
  // two weeks on the same start: the one made later
  const twice: PlanState = { ...EMPTY_STATE, given: [t("a", "2026-11-17", "2026-11-17T08:00:00Z"), t("b", "2026-11-17", "2026-11-17T09:00:00Z")] };
  assert.equal(teacherWeek(twice, "2026-11-18")?.id, "b");
  assert.equal(teacherWeekOn(twice, "2026-11-18")?.id, "b");
});

test("giveWeek with dropUntouched: a replaced week nobody touched is dropped; a ticked, rated or commented one goes to history", () => {
  const up = week("up", { from: undefined, startedOn: "2026-11-22", teacher: { madeAt: "2026-11-18T09:00:00Z" } });
  const s: PlanState = { ...EMPTY_STATE, history: [week("h0")], given: [up] };
  const meta = { start: "2026-11-22", madeAt: "2026-11-18T12:00:00Z", title: "", replace: "up", dropUntouched: true };
  const dropped = giveWeek(s, sevenDays("N"), meta, ids("n"));
  assert.deepEqual(dropped.given.map((p) => p.id), ["n1"]);
  assert.equal(dropped.history, s.history);
  for (const extra of [{ done: { "0:0": true as const } }, { rated: { "0:0": { stars: 3 as const, at: "x" } } }, { teacher: { madeAt: "x", comment: "Hi" } }]) {
    const kept = giveWeek({ ...s, given: [{ ...up, ...extra }] }, sevenDays("N"), meta, ids("n"));
    assert.deepEqual(kept.history.map((p) => p.id), ["up", "h0"], JSON.stringify(extra));
  }
  // without the flag an untouched replaced week still goes to history (a rotated week)
  assert.deepEqual(giveWeek(s, sevenDays("N"), { ...meta, dropUntouched: undefined }, ids("n")).history.map((p) => p.id), ["up", "h0"]);
});

test("upcomingTeacherWeek: a teacher's week that starts after the date; dayBeforeWeek: the last day of the teacher week ending before a start", () => {
  const t = (id: string, startedOn: string) => week(id, { from: undefined, startedOn, teacher: { madeAt: `${startedOn}T08:00:00Z` } });
  const s: PlanState = { ...EMPTY_STATE, history: [t("old", "2026-11-03")], given: [week("shared", { startedOn: "2026-11-30" }), t("next", "2026-11-17"), t("run", "2026-11-10")] };
  assert.equal(upcomingTeacherWeek(s, "2026-11-12")?.id, "next");
  assert.equal(upcomingTeacherWeek(s, "2026-11-17"), null, "started today is not upcoming");
  assert.equal(upcomingTeacherWeek(s, "2026-11-20"), null, "a shared plan is not a teacher's week");
  assert.deepEqual(dayBeforeWeek(s, "2026-11-17"), [], "exercises without block ids give none");
  const withIds: PlanState = { ...s, given: s.given.map((p) => p.id === "run" ? { ...p, config: { ...p.config, days: p.config.days.map((d, i) => ({ ...d, exercises: [{ ...d.exercises[0], blockId: `b${i}` }] })) } } : p) };
  assert.deepEqual(dayBeforeWeek(withIds, "2026-11-17"), ["b6"]);
  assert.deepEqual(dayBeforeWeek(withIds, "2026-11-18"), []);
  const hist: PlanState = { ...EMPTY_STATE, history: [{ ...t("old", "2026-11-03"), config: withIds.given[2].config }] };
  assert.deepEqual(dayBeforeWeek(hist, "2026-11-10"), ["b6"], "read from the history too");
});
