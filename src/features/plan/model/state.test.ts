import { test } from "node:test";
import assert from "node:assert/strict";
import { fitPlanState, sanitiseState } from "./state";
import { EMPTY_STATE, type PlanConfig, type PlanState, type StoredPlan } from "./types";

const plan = (id: string, extra: Partial<StoredPlan> = {}): StoredPlan => ({ id, startedOn: "2026-11-01", done: {}, config: { title: id, days: [] } as unknown as PlanConfig, ...extra });

test("the empty state has no given plans", () => {
  assert.deepEqual(EMPTY_STATE.given, []);
});

test("sanitiseState gives given: [] to a document without it, and drops a given entry with no from", () => {
  assert.deepEqual(sanitiseState({ current: plan("c") }).given, []);
  assert.deepEqual(sanitiseState({ given: "junk" }).given, []);
  const s = sanitiseState({ given: [plan("g1", { from: "s1" }), plan("g2"), plan("g3", { from: 5 as unknown as string }), "junk", plan("g4", { from: "s4" })] });
  assert.deepEqual(s.given.map((p) => [p.id, p.from]), [["g1", "s1"], ["g4", "s4"]]);
  // a week a teacher made has no invite: its teacher record makes it a given plan
  const t = sanitiseState({ given: [plan("t1", { teacher: { madeAt: "2026-11-18T12:00:00Z", comment: "Hands hurt." } }), plan("t2", { teacher: {} as unknown as StoredPlan["teacher"] })] });
  assert.deepEqual(t.given.map((p) => [p.id, p.teacher]), [["t1", { madeAt: "2026-11-18T12:00:00Z", comment: "Hands hurt." }]]);
});

test("sanitiseState keeps a valid composed record and drops a broken one", () => {
  const ok = { attempt: 2, declined: ["a".repeat(32)], short: true };
  assert.deepEqual(sanitiseState({ current: plan("c", { composed: ok }) }).current?.composed, ok);
  for (const bad of [null, "x", { attempt: -1, declined: [], short: false }, { attempt: 1, declined: "x", short: false }, { attempt: 1, declined: [], short: "no" }]) {
    const p = sanitiseState({ current: plan("c", { composed: bad as unknown as StoredPlan["composed"] }) }).current!;
    assert.equal("composed" in p, false, JSON.stringify(bad));
  }
  // a declined list keeps only text
  assert.deepEqual(sanitiseState({ current: plan("c", { composed: { attempt: 0, declined: ["x", 3, "y"] as unknown as string[], short: false } }) }).current?.composed?.declined, ["x", "y"]);
});

test("sanitiseState keeps 60 earlier plans (was 20)", () => {
  const history = Array.from({ length: 70 }, (_, i) => plan(`h${i}`));
  const s = sanitiseState({ history });
  assert.equal(s.history.length, 60);
  assert.equal(s.history[59].id, "h59");
});

test("fitPlanState drops the oldest earlier plans until it fits, never the given ones", () => {
  const big = (id: string, extra: Partial<StoredPlan> = {}) => plan(id, { feedback: "x".repeat(1000), ...extra });
  const s: PlanState = { ...EMPTY_STATE, current: big("c"), history: Array.from({ length: 60 }, (_, i) => big(`h${i}`)), given: [big("g", { from: "s1" })] };
  const size = JSON.stringify(s).length;
  const fit = fitPlanState(s, size - 5000);
  assert.ok(JSON.stringify(fit).length <= size - 5000);
  assert.ok(fit.history.length < 60);
  assert.equal(fit.history[0].id, "h0");
  assert.equal(fit.history.at(-1)!.id, `h${fit.history.length - 1}`);
  assert.deepEqual(fit.given, s.given);
  assert.equal(fit.current, s.current);
  assert.equal(fitPlanState(s, size), s);
});

test("fitPlanState with no history left drops the oldest given plans, never the newest", () => {
  const big = (id: string) => plan(id, { from: `s-${id}`, feedback: "x".repeat(1000) });
  const s: PlanState = { ...EMPTY_STATE, current: plan("c"), given: Array.from({ length: 10 }, (_, i) => big(`g${i}`)) };
  const cap = JSON.stringify({ ...s, given: s.given.slice(0, 3) }).length;
  const fit = fitPlanState(s, cap);
  assert.ok(JSON.stringify(fit).length <= cap);
  assert.deepEqual(fit.given.map((p) => p.id), ["g0", "g1", "g2"]);
  // even when one given plan alone is over the cap, the newest is kept
  assert.deepEqual(fitPlanState(s, 10).given.map((p) => p.id), ["g0"]);
});

test("fitPlanState drops all of the history before any given plan", () => {
  const big = (id: string, extra: Partial<StoredPlan> = {}) => plan(id, { feedback: "x".repeat(1000), ...extra });
  const s: PlanState = { ...EMPTY_STATE, history: Array.from({ length: 5 }, (_, i) => big(`h${i}`)), given: Array.from({ length: 5 }, (_, i) => big(`g${i}`, { from: "s" })) };
  const cap = JSON.stringify({ ...s, history: [], given: s.given.slice(0, 4) }).length;
  const fit = fitPlanState(s, cap);
  assert.deepEqual(fit.history, []);
  assert.deepEqual(fit.given.map((p) => p.id), ["g0", "g1", "g2", "g3"]);
  const cap2 = JSON.stringify({ ...s, history: s.history.slice(0, 1) }).length;
  const fit2 = fitPlanState(s, cap2);
  assert.deepEqual(fit2.history.map((p) => p.id), ["h0"]);
  assert.equal(fit2.given.length, 5);
});

test("the empty state has no teacher scores; a document without the field reads as []", () => {
  assert.deepEqual(EMPTY_STATE.teacherScores, []);
  assert.deepEqual(sanitiseState({}).teacherScores, []);
  assert.deepEqual(sanitiseState({ teacherScores: "x" }).teacherScores, []);
});

test("sanitiseState round-trips teacherScores and cleans them", () => {
  const list = [{ topic: "guitar-basic-chords", score: 2.4, at: "2026-11-10T10:00:00.000Z" }];
  assert.deepEqual(sanitiseState({ teacherScores: list }).teacherScores, list);
  assert.deepEqual(sanitiseState({ teacherScores: [...list, { topic: "nope", score: 1, at: "2026-11-10T10:00:00.000Z" }] }).teacherScores, list);
});

test("sanitiseState keeps a plan's teacher record, caps the comment at 2000, and drops a broken one", () => {
  const ok = { madeAt: "2026-11-10T10:00:00.000Z", comment: "hi" };
  assert.deepEqual(sanitiseState({ current: plan("c", { teacher: ok }) }).current?.teacher, ok);
  assert.equal(sanitiseState({ current: plan("c", { teacher: { madeAt: "2026-11-10T10:00:00.000Z", comment: "x".repeat(2500) } }) }).current?.teacher?.comment?.length, 2000);
  assert.deepEqual(sanitiseState({ current: plan("c", { teacher: { madeAt: "2026-11-10T10:00:00.000Z" } }) }).current?.teacher, { madeAt: "2026-11-10T10:00:00.000Z" });
  for (const bad of [null, "x", {}, { madeAt: 5 }, { madeAt: "" }]) {
    assert.equal("teacher" in sanitiseState({ current: plan("c", { teacher: bad as unknown as StoredPlan["teacher"] }) }).current!, false, JSON.stringify(bad));
  }
});
