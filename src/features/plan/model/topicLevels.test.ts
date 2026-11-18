import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProgressEntry } from "@/features/progress/log";
import { conceptsOf } from "./concepts";
import { daySteps } from "./daySteps";
import { LEVEL_ORDER } from "./outcome";
import { stepAt } from "./path";
import { raisedAnswers } from "./topicLevels";
import type { PlanAnswers } from "./types";

const T = "guitar-basic-chords";
const OTHER = "guitar-scales";

/** One rating per concept of the topic at its last step at or under `level`: every concept there rated `stars`. */
function ratingsAt(topic: string, level: string, stars: 1 | 2 | 3 | 4 | 5, at: string): ProgressEntry[] {
  const max = LEVEL_ORDER.indexOf(level as never);
  return conceptsOf(topic).flatMap((c) => {
    const i = c.steps.findLastIndex((s) => LEVEL_ORDER.indexOf(s.level) <= max);
    if (i < 0) return [];
    return [{ id: `${c.id}-${at}`, planId: "p", exerciseId: `${c.id}-${at}`, day: 0, exercise: 0, title: c.id, topic, concepts: [c.id], steps: [`${c.id}:${i + 1}`], stars, at } as ProgressEntry];
  });
}

const answers = (topics: PlanAnswers["topics"]): PlanAnswers => ({ areas: ["guitar"], topics, minutes: 20, styles: "", notes: "" });
const freshOf = (a: PlanAnswers, topic: string) =>
  daySteps({ answers: a, solid: new Map(), date: "2026-11-19" }).fresh.filter((r) => stepAt(r)?.track.topic === topic);

test("raisedAnswers: no entries leaves the answers as they are", () => {
  const a = answers({ [T]: 0 });
  assert.equal(raisedAnswers(a, [], "2026-11-19"), a);
});

test("raisedAnswers: answered new, ratings reach beginner in a topic: that topic is beginner, the others stay", () => {
  const a = answers({ [T]: 0, [OTHER]: 0 });
  const raised = raisedAnswers(a, ratingsAt(T, "beginner", 5, "2026-11-18T10:00:00Z"), "2026-11-19");
  assert.equal(raised.topics[T], 1);
  assert.equal(raised.topics[OTHER], 0);
  assert.deepEqual(a.topics, { [T]: 0, [OTHER]: 0 }, "the answers given are not changed");
});

test("raisedAnswers: the raised topic gets beginner's cap the next day (two steps), the others keep new's", () => {
  const a = answers({ [T]: 0, [OTHER]: 0 });
  const raised = raisedAnswers(a, ratingsAt(T, "beginner", 5, "2026-11-18T10:00:00Z"), "2026-11-19");
  assert.ok(freshOf(raised, T).length > freshOf(a, T).length, `${freshOf(raised, T)} vs ${freshOf(a, T)}`);
  assert.deepEqual(freshOf(raised, OTHER), freshOf(a, OTHER));
});

test("raisedAnswers: a later low rating never takes a topic below the answer", () => {
  const solid = ratingsAt(T, "beginner", 5, "2026-11-10T10:00:00Z");
  const low = ratingsAt(T, "beginner", 2, "2026-11-18T10:00:00Z");
  assert.equal(raisedAnswers(answers({ [T]: 0 }), [...solid, ...low], "2026-11-19").topics[T], 0);
  assert.equal(raisedAnswers(answers({ [T]: 2 }), solid, "2026-11-19").topics[T], 2);
});

test("raisedAnswers: a topic never answered and never rated stays unanswered; one never answered but rated up is raised", () => {
  const raised = raisedAnswers(answers({}), ratingsAt(T, "beginner", 5, "2026-11-18T10:00:00Z"), "2026-11-19");
  assert.equal(raised.topics[T], 1);
  assert.equal(OTHER in raised.topics, false);
});

test("raisedAnswers: a rating after the day doesn't count", () => {
  assert.equal(raisedAnswers(answers({ [T]: 0 }), ratingsAt(T, "beginner", 5, "2026-11-20T10:00:00Z"), "2026-11-19").topics[T], 0);
});
