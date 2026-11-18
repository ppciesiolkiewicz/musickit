import { test } from "node:test";
import assert from "node:assert/strict";
import { PAST_DAYS, applyAnother, applyFirst, dayWords, hasNewPicks, pastDays, shouldAsk, todayView } from "./today";
import { ratePlan, startDay } from "./schedule";
import { EMPTY_STATE, type PlanState } from "./types";
import type { ComposedDay } from "./compose";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (title: string, more: Partial<PlanExercise> = {}): PlanExercise => ({ title, minutes: 5, cells: [{ type: "text", text: "x" }], ...more });

test("dayWords: the title is the date's weekday, day and month", () => {
  assert.equal(dayWords("2026-11-18", []).title, "Wednesday 18 November");
  assert.equal(dayWords("2027-01-01", []).title, "Friday 1 January");
});

test("dayWords: the theme names the day's topics once each, in the order they come", () => {
  const exercises = [ex("a", { topic: "guitar-scales" }), ex("b", { topic: "guitar-basic-chords" }), ex("c", { topic: "guitar-scales" }), ex("d", { topic: "voice-pitch" })];
  assert.equal(dayWords("2026-11-18", exercises).theme, "Scales, basic chords and pitch");
  assert.equal(dayWords("2026-11-18", exercises.slice(0, 2)).theme, "Scales and basic chords");
  assert.equal(dayWords("2026-11-18", exercises.slice(0, 1)).theme, "Scales");
});

test("dayWords: a topic is found from the steps when the exercise names none; a name in capitals stays so", () => {
  assert.equal(dayWords("2026-11-18", [ex("a", { steps: ["pentatonic-positions:1"] })]).theme, "Scales");
  const caged = dayWords("2026-11-18", [ex("a", { topic: "voice-pitch" }), ex("b", { topic: "guitar-caged" })]).theme;
  assert.equal(caged, "Pitch and CAGED");
});

test("dayWords: no topic at all leaves the theme empty", () => {
  assert.equal(dayWords("2026-11-18", [ex("a")]).theme, "");
  assert.equal(dayWords("2026-11-18", [ex("a", { topic: "nope", steps: ["nope:1"] })]).theme, "");
});

const plan = (blockIds: string[], rated: number[]): StoredPlan => ({
  id: "p",
  startedOn: "2026-11-18",
  done: Object.fromEntries(rated.map((i) => [`0:${i}`, true as const])),
  rated: Object.fromEntries(rated.map((i) => [`0:${i}`, { stars: 3 as const, at: "2026-11-18T10:00:00Z" }])),
  config: { title: "t", days: [{ theme: "", exercises: blockIds.map((b) => ex(b, { blockId: b })) }] },
  composed: { attempt: 0, declined: [], short: false },
});
const answer = (blockIds: string[]): ComposedDay => ({ exercises: blockIds.map((b) => ex(b, { blockId: b })), steps: [], short: false });

test("hasNewPicks: an answer holding only today's rated exercises has none", () => {
  assert.equal(hasNewPicks(plan(["a", "b", "c"], [0, 2]), answer(["a", "c"])), false);
  assert.equal(hasNewPicks(plan(["a", "b"], []), answer([])), false);
});

test("hasNewPicks: any exercise not rated today is a new pick", () => {
  assert.equal(hasNewPicks(plan(["a", "b", "c"], [0]), answer(["a", "d"])), true);
  // an unrated exercise of today's plan coming back is still new to the player's eye: it replaces nothing, but counts
  assert.equal(hasNewPicks(plan(["a", "b"], [0]), answer(["a", "b"])), true);
  assert.equal(hasNewPicks(null, answer(["a"])), true);
});

test("pastDays: composed days only, newest first, the last 14", () => {
  const day = (on: string, composed = true): StoredPlan => ({ ...plan([], []), id: on, startedOn: on, ...(composed ? {} : { composed: undefined }) });
  const days = Array.from({ length: 20 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, "0")}`));
  const shuffled = [days[3], day("2026-11-01", false), ...days.slice(4).reverse(), ...days.slice(0, 3)];
  const got = pastDays(shuffled, null, "2026-11-18");
  assert.equal(got.length, PAST_DAYS);
  assert.deepEqual(got.map((p) => p.startedOn), days.slice(6).reverse().map((p) => p.startedOn));
});

test("pastDays: a composed current from before today (today's plan didn't come) is a past day; today's is not", () => {
  const y = { ...plan([], []), id: "y", startedOn: "2026-11-17" };
  const old = { ...plan([], []), id: "o", startedOn: "2026-11-16" };
  assert.deepEqual(pastDays([old], y, "2026-11-18").map((p) => p.id), ["y", "o"]);
  assert.deepEqual(pastDays([old], { ...y, startedOn: "2026-11-18" }, "2026-11-18").map((p) => p.id), ["o"]);
  assert.deepEqual(pastDays([old], { ...y, composed: undefined }, "2026-11-18").map((p) => p.id), ["o"]);
});

// --- what the page shows for today's plan, and what an answer does

const own = plan(["a"], []);
const base = { loaded: true, answers: true, own: null, asked: false, inFlight: false, failure: null };

test("todayView: loading, intro, the plan, the plan being made", () => {
  assert.deepEqual(todayView({ ...base, loaded: false }), { kind: "loading" });
  assert.deepEqual(todayView({ ...base, answers: false }), { kind: "intro" });
  assert.deepEqual(todayView({ ...base, own }), { kind: "plan", plan: own });
  assert.deepEqual(todayView({ ...base, asked: true, inFlight: true }), { kind: "making" });
  // not asked yet: the request goes out in the same commit
  assert.deepEqual(todayView(base), { kind: "making" });
});

test("todayView: a failure shows; asked with nothing in flight and no failure is a failed request, never the loading line", () => {
  assert.deepEqual(todayView({ ...base, asked: true, failure: "no-blocks" }), { kind: "failed", failure: "no-blocks" });
  assert.deepEqual(todayView({ ...base, asked: true }), { kind: "failed", failure: "failed" });
});

test("shouldAsk: once per date, only with answers and no plan for today", () => {
  assert.equal(shouldAsk(base), true);
  assert.equal(shouldAsk({ ...base, asked: true }), false);
  assert.equal(shouldAsk({ ...base, own }), false);
  assert.equal(shouldAsk({ ...base, answers: false }), false);
  assert.equal(shouldAsk({ ...base, loaded: false }), false);
});

const D = "2026-11-18";
const n = () => { let i = 0; return () => `id${++i}`; };
const composed = (...titles: string[]): ComposedDay => ({ exercises: titles.map((t) => ex(t)), steps: [], short: false });

test("applyFirst: a day is stored with its words; a failed request maps to what the page says", () => {
  const ok = applyFirst(EMPTY_STATE, D, { ok: true, day: composed("x"), date: D, attempt: 0 }, n());
  assert.equal(ok.failure, null);
  assert.equal(ok.state.current?.config.title, "Wednesday 18 November");
  for (const code of ["no-blocks", "bad-date", "offline", "failed"] as const) assert.deepEqual(applyFirst(EMPTY_STATE, D, { ok: false, code }, n()), { state: EMPTY_STATE, failure: code });
  // no-answers can't happen after the flush: said as a failed request
  assert.deepEqual(applyFirst(EMPTY_STATE, D, { ok: false, code: "no-answers" }, n()).failure, "failed");
});

test("applyFirst: a later day already running (another tab) is its own failure, not the device's date", () => {
  const later = startDay(EMPTY_STATE, composed("y"), { date: "2026-11-19", attempt: 0 }, n());
  const r = applyFirst(later, D, { ok: true, day: composed("x"), date: D, attempt: 0 }, n());
  assert.equal(r.state, later);
  assert.equal(r.failure, "later");
});

test("applyAnother: new picks change the plan; none, a 409 no-blocks, a failure and a late answer don't", () => {
  let s: PlanState = startDay(EMPTY_STATE, composed("A", "B"), { date: D, attempt: 0 }, n());
  s = { ...s, current: ratePlan(s.current!, 0, 0, 4, "2026-11-18T10:00:00Z") };
  const kept = s.current!.config.days[0].exercises[0];
  const changed = applyAnother(s, D, { ok: true, day: { exercises: [kept, ex("C")], steps: [], short: false }, date: D, attempt: 1 }, n());
  assert.equal(changed.outcome, "changed");
  assert.notEqual(changed.state, s);
  assert.deepEqual(applyAnother(s, D, { ok: true, day: { exercises: [kept], steps: [], short: false }, date: D, attempt: 1 }, n()), { state: s, outcome: "none" });
  assert.deepEqual(applyAnother(s, D, { ok: false, code: "no-blocks" }, n()), { state: s, outcome: "none" });
  assert.deepEqual(applyAnother(s, D, { ok: false, code: "offline" }, n()), { state: s, outcome: "offline" });
  assert.deepEqual(applyAnother(s, D, { ok: false, code: "no-answers" }, n()), { state: s, outcome: "failed" });
  // an answer for a try already stored (late or twice): nothing changes, said as a failed request
  assert.deepEqual(applyAnother(s, D, { ok: true, day: composed("C"), date: D, attempt: 0 }, n()), { state: s, outcome: "failed" });
});
