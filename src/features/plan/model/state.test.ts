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
