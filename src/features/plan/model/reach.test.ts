import { test } from "node:test";
import assert from "node:assert/strict";
import { PATH, stepAt } from "./path";
import { REACH_CAP, reach, type StepReach } from "./reach";

const m = (r: Map<string, StepReach>, ref: string) => r.get(ref)!;
const marks = (r: Map<string, StepReach>, ref: string) => [m(r, ref).mark, m(r, ref).open];

test("every step gets one mark", () => {
  assert.equal(reach({ topics: {} }).size, PATH.reduce((n, t) => n + t.steps.length, 0));
});

test("a new player: one step per topic, the lowest on the path; the others with nothing to learn first are open", () => {
  const r = reach({ topics: {} });
  assert.deepEqual(marks(r, "open-chords:1"), ["reach", false]);
  assert.deepEqual(marks(r, "strumming:1"), ["ahead", true]);
  assert.deepEqual(marks(r, "power-chords:1"), ["ahead", true]);
  assert.deepEqual(marks(r, "double-stops:1"), ["reach", false]);
  assert.deepEqual(marks(r, "triads:1"), ["ahead", false]);
  assert.deepEqual(marks(r, "open-chords:2"), ["ahead", false]);
  const perTopic = new Map<string, number>();
  for (const x of r.values()) if (x.mark === "reach") { const t = stepAt(x.ref)!.track.topic; perTopic.set(t, (perTopic.get(t) ?? 0) + 1); }
  assert.ok([...perTopic.values()].every((n) => n <= REACH_CAP.new));
});

test("starts are never capped, and the steps under a start are known", () => {
  const r = reach({ topics: { "guitar-basic-chords": 1 } });
  for (const ref of ["open-chords:4", "strumming:3", "power-chords:1"]) assert.deepEqual([m(r, ref).mark, m(r, ref).start], ["reach", true], ref);
  assert.equal(m(r, "open-chords:3").mark, "known");
  assert.equal(m(r, "strumming:2").mark, "known");
});

test("a start carries known back across topics, even unanswered ones", () => {
  const r = reach({ topics: { "theory-modes": 2 } });
  assert.deepEqual([m(r, "modes:1").mark, m(r, "modes:1").start], ["reach", true]);
  for (const ref of ["scales:1", "scales:2", "scales:3"]) assert.equal(m(r, ref).mark, "known", ref);
});

test("solid carries known back, inside a track and across", () => {
  const r = reach({ topics: {}, solid: ["triads:5"] });
  assert.equal(m(r, "triads:3").mark, "known");
  assert.equal(m(r, "double-stops:2").mark, "known");
  assert.equal(m(r, "double-stops:3").mark === "known", false);
});

test("a practised step that isn't solid stays within reach, so it comes back; once solid, the topic's place moves on", () => {
  // practised but rated under Solid: not passed in `solid`
  assert.equal(m(reach({ topics: {} }), "open-chords:1").mark, "reach");
  const r = reach({ topics: {}, solid: ["open-chords:1"] });
  assert.equal(m(r, "open-chords:1").mark, "known");
  // the topic's one place now goes to the lowest step on the path: the first strum, then E, A, D
  assert.equal(m(r, "strumming:1").mark, "reach");
  assert.deepEqual(marks(r, "open-chords:2"), ["ahead", true]);
});

test("a done track opens what follows it", () => {
  const r = reach({ topics: { "guitar-caged": 3 } });
  assert.ok(PATH.find((t) => t.id === "double-stops")!.steps.every((_, i) => m(r, `double-stops:${i + 1}`).mark === "known"));
  assert.equal(m(r, "triads:6").mark, "known");
  assert.deepEqual([m(r, "triads:7").mark, m(r, "triads:7").start], ["reach", true]);
});

test("intermediate and up: no cap, so nothing in that topic is held back", () => {
  const r = reach({ topics: { "guitar-techniques": 2 } });
  const held = [...r.values()].filter((x) => x.open && stepAt(x.ref)!.track.topic === "guitar-techniques");
  assert.deepEqual(held, []);
});
