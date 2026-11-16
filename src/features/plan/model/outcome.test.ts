import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS } from "./concepts";
import type { PlanAnswers } from "../intake/answers";
import type { ProgressEntry } from "@/features/progress/log";
import type { AnswersEntry, PlanExercise, StoredPlan } from "./types";
import type { DayTime } from "./planTime";
import { outcome, ratingLevel, startOutcome, type Outcome } from "./outcome";

test("startOutcome: every area in AREAS order, six topics each, unanswered is null", () => {
  const out = startOutcome({});
  assert.deepEqual(out.map((a) => a.area), AREAS.map((a) => a.id));
  assert.ok(out.every((a) => a.topics.length === 6));
  assert.ok(out.every((a) => a.topics.every((t) => t.score === null)));
});

test("startOutcome: a rung is the topic's score, 0 is kept as 0", () => {
  const out = startOutcome({ "guitar-caged": 2, "voice-pitch": 0 });
  const t = (id: string) => out.flatMap((a) => a.topics).find((x) => x.topic === id)!;
  assert.equal(t("guitar-caged").score, 2);
  assert.equal(t("guitar-caged").label, "CAGED");
  assert.equal(t("voice-pitch").score, 0);
  assert.equal(t("guitar-scales").score, null);
});

test("startOutcome: an unknown topic id in the answers is ignored", () => {
  const out = startOutcome({ nope: 3 } as PlanAnswers["topics"]);
  assert.ok(out.flatMap((a) => a.topics).every((t) => t.score === null));
});

let n = 0;
const entry = (over: Partial<ProgressEntry> = {}): ProgressEntry => ({
  id: `e${++n}`, planId: "p", exerciseId: `x${n}`, day: 0, exercise: 0, title: "x", stars: 3, at: "2026-11-10T12:00:00.000Z", ...over,
});
const asked = (at: string, topics: AnswersEntry["topics"]): AnswersEntry => ({ at, topics });
const topic = (o: Outcome, id: string) => o.areas.flatMap((a) => a.topics).find((t) => t.topic === id)!;
const concept = (o: Outcome, id: string) => o.areas.flatMap((a) => a.topics).flatMap((t) => t.concepts).find((c) => c.id === id)!;
const caged = (o: Outcome) => topic(o, "guitar-caged");
const IN = { plans: [], times: [] };
const storedPlan = (id: string, startedOn: string, exercises: Partial<PlanExercise>[]): StoredPlan => ({
  id, startedOn, done: {},
  config: { title: "W", days: [{ theme: "T", exercises: exercises.map((e) => ({ title: "x", minutes: 10, cells: [], ...e }) as PlanExercise) }] },
});
/** A record made without `on` is one saved before Part B. */
const time = (planId: string, day: number, elapsed: number, spent: Record<string, number>, blocks?: Record<string, string>, on?: Record<string, number>): DayTime => ({
  planId, day, elapsed, spent, ...(blocks ? { blocks } : {}), ...(on ? { on } : {}),
});

test("outcome: every area, six topics each, each topic's concepts; nothing rated → not yet, score is the rung", () => {
  const o = outcome({ ...IN, entries: [], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.deepEqual(o.areas.map((a) => a.area), ["guitar", "voice", "theory"]);
  assert.ok(o.areas.every((a) => a.topics.length === 6));
  assert.deepEqual(caged(o).concepts.map((c) => c.id), ["double-stops", "triads", "caged", "arpeggios"]);
  assert.deepEqual(concept(o, "triads").levels, ["beginner", "intermediate", "advanced"]);
  assert.ok(caged(o).concepts.every((c) => c.state === "not-yet" && c.ratings === 0 && c.lastOn === null));
  assert.equal(caged(o).score, 1); assert.equal(caged(o).reached, 1);
  assert.equal(topic(o, "voice-pitch").score, null);
});
test("ratingLevel: the block's level inside the span, else the nearest end; no level is the first", () => {
  const span = ["beginner", "intermediate", "advanced"] as const;
  assert.equal(ratingLevel(span, "intermediate"), "intermediate");
  assert.equal(ratingLevel(span, "new"), "beginner");
  assert.equal(ratingLevel(["new", "beginner"], "advanced"), "beginner");
  assert.equal(ratingLevel(span, undefined), "beginner");
  assert.equal(ratingLevel(span, "nope"), "beginner");
});
test("outcome: one of four concepts a level up solid there adds a quarter of a level", () => {
  // intermediate in CAGED: double stops (its last step), triads (its middle steps), caged, arpeggios
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], topic: "guitar-caged", level: "intermediate", stars: 4 })], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "solid");
  assert.equal(caged(o).score, 1 + 1 / 4);
});
test("outcome: every concept with a step at a level, solid there, reaches it; then the share of the level above is added", () => {
  const rung1 = [asked("2026-11-01", { "guitar-caged": 1 })];
  const e = ["double-stops", "triads", "caged", "arpeggios"].map((c) => entry({ concepts: [c], level: "intermediate", stars: 5 }));
  const o = outcome({ ...IN, entries: e, answersHistory: rung1 }, "2026-11-15");
  assert.equal(caged(o).reached, 2);
  assert.equal(caged(o).score, 2); // none solid at advanced yet
  const two = [...e, entry({ concepts: ["triads"], level: "advanced", stars: 4 }), entry({ concepts: ["caged"], level: "advanced", stars: 4 })];
  assert.equal(caged(outcome({ ...IN, entries: two, answersHistory: rung1 }, "2026-11-15")).score, 2 + 2 / 3);
  const all = [...two, entry({ concepts: ["arpeggios"], level: "advanced", stars: 4 })];
  assert.equal(caged(outcome({ ...IN, entries: all, answersHistory: rung1 }, "2026-11-15")).score, 3); // advanced: no fraction
});
test("outcome: a rating counts at its level and below, never above", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["triads"], level: "beginner", stars: 5 })], answersHistory: [] }, "2026-11-15");
  assert.deepEqual(concept(o, "triads").at, { beginner: "solid", intermediate: "not-yet", advanced: "not-yet" });
  const high = outcome({ ...IN, entries: [entry({ concepts: ["triads"], level: "advanced", stars: 5 })], answersHistory: [] }, "2026-11-15");
  assert.deepEqual(concept(high, "triads").at, { beginner: "solid", intermediate: "solid", advanced: "solid" });
});
test("outcome: one solid concept doesn't reach its level while another there isn't solid", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], stars: 5 })], answersHistory: [] }, "2026-11-15");
  assert.equal(caged(o).reached, 0); // no rung, one rating: floor 0; intermediate isn't all solid
  assert.equal(caged(o).score, 0); // and double stops, the one new concept, isn't solid
});
test("outcome: a level is judged on its own; the levels below need not be reached first", () => {
  const e = ["caged", "arpeggios"].map((c) => entry({ concepts: [c], level: "advanced", stars: 5 }));
  const o = outcome({ ...IN, entries: [...e, entry({ concepts: ["triads"], level: "advanced", stars: 2 })], answersHistory: [] }, "2026-11-15");
  assert.equal(caged(o).reached, 0); // triads is in every level and not solid in any
  assert.equal(caged(outcome({ ...IN, entries: [...e, entry({ concepts: ["triads"], level: "advanced", stars: 4 })], answersHistory: [] }, "2026-11-15")).score, 3);
});
test("outcome: no rung but a solid concept starts from that concept's level", () => {
  // beginner in CAGED is double stops and triads; both solid there reach it
  const e = [entry({ concepts: ["top-string-triads"], stars: 4 }), entry({ concepts: ["double-stops"], level: "beginner", stars: 4 })];
  const o = outcome({ ...IN, entries: e, answersHistory: [] }, "2026-11-15");
  assert.equal(caged(o).reached, 1);
  assert.equal(caged(o).score, 1); // 0 of the 4 intermediate concepts solid there
  // triads alone don't: double stops sit at beginner too and aren't rated
  assert.equal(caged(outcome({ ...IN, entries: e.slice(0, 1), answersHistory: [] }, "2026-11-15")).reached, 0);
});
test("outcome: no rung and one rating starts from new (0) plus the share of beginner", () => {
  // beginner in the scales topic: notes on the neck, pentatonic positions, melodies
  const solid = outcome({ ...IN, entries: [entry({ concepts: ["pentatonic-box-1"], stars: 4 })], answersHistory: [] }, "2026-11-15");
  assert.equal(topic(solid, "guitar-scales").reached, 0);
  assert.equal(topic(solid, "guitar-scales").score, 1 / 3);
  const working = outcome({ ...IN, entries: [entry({ concepts: ["pentatonic-box-1"], stars: 3 })], answersHistory: [] }, "2026-11-15");
  assert.equal(concept(working, "pentatonic-positions").state, "working");
  assert.equal(topic(working, "guitar-scales").score, 0);
});
test("outcome: no rung and nothing rated is null", () => {
  assert.equal(topic(outcome({ ...IN, entries: [], answersHistory: [] }, "2026-11-15"), "guitar-scales").score, null);
});
test("outcome: a level with no concepts doesn't block, and adds no fraction", () => {
  // barre chords start at beginner: nothing at new
  const rung0 = [asked("2026-11-01", { "guitar-barre-chords": 0 })];
  const t = (e: ProgressEntry[]) => topic(outcome({ ...IN, entries: e, answersHistory: rung0 }, "2026-11-15"), "guitar-barre-chords");
  assert.equal(t([]).score, 0);
  assert.equal(t([entry({ concepts: ["bm-f-barre"], level: "advanced", stars: 5 })]).score, 3);
});
test("outcome: solid then rated lower is working on again, and the score falls back to the rung, never below", () => {
  const o = outcome({ ...IN, entries: [
    entry({ concepts: ["caged"], stars: 5, at: "2026-11-05T12:00:00.000Z" }),
    entry({ concepts: ["caged"], stars: 2, at: "2026-11-12T12:00:00.000Z" }),
  ], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "working");
  assert.equal(concept(o, "caged").ratings, 2);
  assert.equal(concept(o, "caged").lastOn, "2026-11-12");
  assert.equal(caged(o).score, 1);
});
test("outcome: two ratings with the same `at`: the later one in the list decides", () => {
  const at = "2026-11-12T12:00:00.000Z";
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], stars: 5, at }), entry({ concepts: ["caged"], stars: 2, at })], answersHistory: [] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "working");
  const flipped = outcome({ ...IN, entries: [entry({ concepts: ["caged"], stars: 2, at }), entry({ concepts: ["caged"], stars: 5, at })], answersHistory: [] }, "2026-11-15");
  assert.equal(concept(flipped, "caged").state, "solid");
});
test("outcome: an old concept id counts for its track", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["top-string-triads", "triads-every-set"], stars: 5 })], answersHistory: [] }, "2026-11-15");
  assert.equal(concept(o, "triads").ratings, 1);
  assert.equal(concept(o, "triads").state, "solid");
});
test("outcome as of a date: later ratings and later answers are left out", () => {
  const input = { ...IN,
    entries: [entry({ concepts: ["caged"], stars: 5, at: "2026-11-12T12:00:00.000Z" })],
    answersHistory: [asked("2026-11-01", { "guitar-caged": 0 }), asked("2026-11-10T12:00:00.000Z", { "guitar-caged": 2 })] };
  assert.equal(caged(outcome(input, "2026-11-05")).score, 0);
  assert.equal(concept(outcome(input, "2026-11-11"), "caged").state, "not-yet");
  assert.equal(caged(outcome(input, "2026-11-11")).score, 2);
  assert.equal(concept(outcome(input, "2026-11-15"), "caged").state, "solid");
  assert.equal(caged(outcome(input, "2026-11-15")).score, 2); // rung 2 already covers caged; none is solid at advanced
});
test("outcome: an entry with no concepts counts toward ratings (floor 0), never toward a level; unknown ids are ignored", () => {
  const o = outcome({ ...IN, entries: [
    entry({ topic: "guitar-caged", stars: 5 }),
    entry({ concepts: ["no-such-concept"], topic: "no-such-topic", area: "guitar", stars: 5 }),
    entry({ stars: 5 }),
  ], answersHistory: [] }, "2026-11-15");
  assert.equal(caged(o).ratings, 1);
  assert.equal(caged(o).score, 0); // rated, so "new"; no concept is solid
  assert.ok(caged(o).concepts.every((c) => c.state === "not-yet"));
  assert.equal(o.areas[0].ratings, 2); // the caged entry and the one naming only its area
});
test("outcome: an `at` that is not a date neither throws nor counts", () => {
  const o = outcome({ ...IN, entries: [entry({ concepts: ["caged"], topic: "guitar-caged", stars: 5, at: "not a date" })],
    answersHistory: [asked("2026-11-01", { "guitar-caged": 1 }), asked("garbage", { "guitar-caged": 3 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").state, "not-yet");
  assert.equal(caged(o).ratings, 0);
  assert.equal(caged(o).score, 1); // the broken answers entry is skipped too
});

test("time: a slot's seconds go to each of its concepts in full and once to its topic and area", () => {
  const p = storedPlan("p", "2026-11-10", [{ id: "s1", topic: "guitar-caged", concepts: ["caged", "arpeggios"] }]);
  const o = outcome({ plans: [p], entries: [], answersHistory: [], times: [time("p", 0, 600, { s1: 600 })] }, "2026-11-15");
  assert.equal(concept(o, "caged").seconds, 600);
  assert.equal(concept(o, "arpeggios").seconds, 600);
  assert.equal(topic(o, "guitar-caged").seconds, 600);
  assert.equal(o.areas[0].seconds, 600);
  assert.deepEqual(o.seconds, { total: 600, sorted: 600 });
});
test("time: a slot whose plan is gone is found through its block id; with neither it counts only in the total", () => {
  const e = entry({ blockId: "b1", topic: "voice-pitch", concepts: ["matching-a-pitch"] });
  const o = outcome({ plans: [], entries: [e], answersHistory: [], times: [time("gone", 0, 900, { s9: 300, s10: 200 }, { s9: "b1" })] }, "2026-11-15");
  assert.equal(topic(o, "voice-pitch").seconds, 300);
  assert.deepEqual(o.seconds, { total: 500, sorted: 300 });
});
test("time as of a date, no on: a day after asOf is left out", () => {
  const p = storedPlan("p", "2026-11-10", [{ id: "s1", topic: "guitar-caged" }]);
  const o = outcome({ plans: [p], entries: [], answersHistory: [], times: [time("p", 5, 600, { s1: 600 })] }, "2026-11-14");
  assert.equal(o.seconds.total, 0);
});
test("time as of a date, with on: the share counted up to asOf, whatever the plan day", () => {
  const p = storedPlan("p", "2026-11-10", [{ id: "s1", topic: "guitar-caged" }]);
  const t = time("p", 0, 600, { s1: 600 }, undefined, { "2026-11-12": 300, "2026-11-14": 300 });
  const at = (asOf: string) => outcome({ plans: [p], entries: [], answersHistory: [], times: [t] }, asOf).seconds.total;
  assert.equal(at("2026-11-11"), 0); // day 0 is 2026-11-10, but nothing was counted until the 12th
  assert.equal(at("2026-11-13"), 300);
  assert.equal(at("2026-11-14"), 600);
});
test("streak: consecutive days ending today", () => {
  const e = ["2026-11-13", "2026-11-14", "2026-11-15"].map((d) => entry({ at: `${d}T12:00:00.000Z` }));
  const o = outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-15");
  assert.deepEqual(o.streak, { days: 3, through: "2026-11-15", practised: ["2026-11-15", "2026-11-14", "2026-11-13"] });
  assert.equal(outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-16").streak.days, 3);
  assert.deepEqual(outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-17").streak.days, 0);
});
test("streak: a gap breaks it; a later rating than asOf doesn't count", () => {
  const e = ["2026-11-12", "2026-11-14", "2026-11-15", "2026-11-16"].map((d) => entry({ at: `${d}T12:00:00.000Z` }));
  assert.equal(outcome({ plans: [], entries: e, answersHistory: [], times: [] }, "2026-11-15").streak.days, 2);
});
test("streak, no on: a timer day is startedOn + day and counts from 300 seconds; without its plan it never does", () => {
  const p = storedPlan("p", "2026-11-10", []);
  const run = (elapsed: number, planId = "p") => outcome({ plans: [p], entries: [], answersHistory: [], times: [time(planId, 2, elapsed, {})] }, "2026-11-12").streak.days;
  assert.equal(run(300), 1);
  assert.equal(run(299), 0);
  assert.equal(run(3000, "gone"), 0);
});
test("streak, with on: each date counts its own seconds, summed over records, plan or no plan", () => {
  const p = storedPlan("p", "2026-11-10", []);
  const times = [
    time("p", 0, 500, {}, undefined, { "2026-11-11": 200, "2026-11-12": 300 }),
    time("gone", 4, 100, {}, undefined, { "2026-11-11": 100 }),
  ];
  const o = outcome({ plans: [p], entries: [], answersHistory: [], times }, "2026-11-12");
  assert.deepEqual(o.streak, { days: 2, through: "2026-11-12", practised: ["2026-11-12", "2026-11-11"] }); // 11th: 200 + 100
  assert.equal(o.streak.practised.includes("2026-11-10"), false); // day 0's date is not used when on is there
});
test("time and streak: a malformed date key in `on` is ignored, never throws", () => {
  const p = storedPlan("p", "2026-11-10", [{ id: "s1", topic: "guitar-caged" }]);
  const o = outcome({ plans: [p], entries: [], answersHistory: [], times: [time("p", 0, 600, { s1: 600 }, undefined, { "garbage": 300, "2026-11-12": 300 })] }, "2026-11-15");
  assert.equal(o.seconds.total, 600);
  assert.deepEqual(o.streak.practised, ["2026-11-12"]);
});
