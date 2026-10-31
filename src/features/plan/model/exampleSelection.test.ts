import { test } from "node:test";
import assert from "node:assert/strict";
import { selectExamples } from "./exampleSelection";
import { conceptsFor } from "./concepts";
import type { PlanAnswers } from "./types";

const base: PlanAnswers = { levels: {}, ratings: {}, focus: [], minutes: 20, styles: "", notes: "" };
const ids = (a: PlanAnswers) => selectExamples(a).exercises.map((e) => e.id);
const showcases = (a: PlanAnswers) => selectExamples(a).exercises.flatMap((e) => (e.showcase ? [e.showcase] : []));

test("guitar intermediate only: its exercise, blocks and progression showcases, no pick, its plan", () => {
  const s = selectExamples({ ...base, levels: { guitar: "intermediate" } });
  assert.ok(s.exercises.some((e) => e.id === "guitar-intermediate-joining-boxes"));
  assert.deepEqual(showcases({ ...base, levels: { guitar: "intermediate" } }).sort(), ["blocks", "progression"]);
  assert.equal(s.plan.id, "guitar-intermediate");
  assert.ok(!s.exercises.some((e) => e.id.startsWith("voice") || e.id.startsWith("theory")));
});

test("voice advanced only: its exercise and pick, the beginner voice plan", () => {
  const a: PlanAnswers = { ...base, levels: { voice: "advanced" } };
  assert.ok(ids(a).includes("voice-advanced-guide-tones"));
  assert.ok(showcases(a).includes("pick"));
  assert.equal(selectExamples(a).plan.id, "voice-beginner");
});

test("guitar and theory pick the plan covering both", () => {
  assert.equal(selectExamples({ ...base, levels: { guitar: "intermediate", theory: "intermediate" } }).plan.id, "guitar-theory-intermediate");
});

test("rating the level's concepts high adds the level above", () => {
  const ratings = Object.fromEntries(conceptsFor("guitar", "intermediate").map((c) => [c.id, 5 as const]));
  assert.ok(ids({ ...base, levels: { guitar: "intermediate" }, ratings }).includes("guitar-advanced-dorian-on-the-neck"));
  assert.ok(!ids({ ...base, levels: { guitar: "intermediate" } }).includes("guitar-advanced-dorian-on-the-neck"));
});

test("no repeated exercises", () => {
  const e = ids({ ...base, levels: { guitar: "beginner", voice: "beginner", theory: "beginner" } });
  assert.equal(new Set(e).size, e.length);
});

test("only the level's own concepts count toward the level above", () => {
  const own = conceptsFor("guitar", "beginner").filter((c) => c.level === "beginner").slice(0, 2);
  const below = conceptsFor("guitar", "beginner").filter((c) => c.level === "new");
  const ratings = Object.fromEntries([...below, ...own].map((c) => [c.id, 5 as const]));
  const a = { ...base, levels: { guitar: "beginner" as const } };
  assert.deepEqual(ids({ ...a, ratings }), ids(a));
});
