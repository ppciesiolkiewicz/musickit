import { test } from "node:test";
import assert from "node:assert/strict";
import { selectExamples } from "./exampleSelection";
import { EXERCISE_EXAMPLES } from "../examples";
import type { PlanAnswers } from "./types";

const base: PlanAnswers = { levels: {}, ratings: {}, focus: [], minutes: 20, styles: "", notes: "" };
const ids = (a: PlanAnswers) => selectExamples(a).exercises.map((e) => e.id);

test("every exercise example is shown, whatever the answers", () => {
  const all = EXERCISE_EXAMPLES.map((e) => e.id);
  assert.deepEqual(ids({ ...base, levels: { guitar: "intermediate" } }), all);
  assert.deepEqual(ids({ ...base, levels: { voice: "new" } }), all);
  assert.deepEqual(ids(base), all);
});

test("guitar intermediate only: the guitar intermediate plan", () => {
  assert.equal(selectExamples({ ...base, levels: { guitar: "intermediate" } }).plan.id, "guitar-intermediate");
});

test("guitar beginner: the guitar beginner plan", () => {
  assert.equal(selectExamples({ ...base, levels: { guitar: "beginner" } }).plan.id, "guitar-beginner");
});

test("voice advanced only: the beginner voice plan", () => {
  assert.equal(selectExamples({ ...base, levels: { voice: "advanced" } }).plan.id, "voice-beginner");
});

test("guitar and theory pick the plan covering both", () => {
  assert.equal(selectExamples({ ...base, levels: { guitar: "intermediate", theory: "intermediate" } }).plan.id, "guitar-theory-intermediate");
});
