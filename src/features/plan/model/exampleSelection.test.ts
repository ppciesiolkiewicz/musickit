import { test } from "node:test";
import assert from "node:assert/strict";
import { selectExamples } from "./exampleSelection";
import { EXERCISE_EXAMPLES } from "../examples";
import { topicsFor } from "../intake/topics";
import type { Area } from "./concepts";
import type { Level, PlanAnswers } from "./types";

const base: PlanAnswers = { areas: [], topics: {}, minutes: 20, styles: "", notes: "" };
const ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];
/** Answers that come out at these levels: every topic of each area on the matching line. */
const lv = (levels: Partial<Record<Area, Level>>): PlanAnswers => ({
  ...base,
  areas: (["guitar", "voice", "theory"] as Area[]).filter((a) => levels[a]),
  topics: Object.fromEntries(Object.entries(levels).flatMap(([a, l]) => topicsFor(a as Area).map((t) => [t.id, ORDER.indexOf(l)]))) as PlanAnswers["topics"],
});
const ids = (a: PlanAnswers) => selectExamples(a).exercises.map((e) => e.id);

test("every exercise example is shown, whatever the answers", () => {
  const all = EXERCISE_EXAMPLES.map((e) => e.id);
  assert.deepEqual(ids(lv({ guitar: "intermediate" })), all);
  assert.deepEqual(ids(lv({ voice: "new" })), all);
  assert.deepEqual(ids(base), all);
});

test("guitar intermediate only: the guitar intermediate plan", () => {
  assert.equal(selectExamples(lv({ guitar: "intermediate" })).plan.id, "guitar-intermediate");
});

test("guitar beginner: the guitar beginner plan, in the new teaching style", () => {
  assert.equal(selectExamples(lv({ guitar: "beginner" })).plan.id, "guitar-beginner-new");
});

test("voice advanced only: the beginner voice plan, in the new teaching style", () => {
  assert.equal(selectExamples(lv({ voice: "advanced" })).plan.id, "voice-beginner-new");
});

test("guitar and theory pick the plan covering both", () => {
  assert.equal(selectExamples(lv({ guitar: "intermediate", theory: "intermediate" })).plan.id, "guitar-theory-intermediate");
});
