import { test } from "node:test";
import assert from "node:assert/strict";
import { CONCEPTS } from "@/features/plan/model/concepts";
import type { PlanTool } from "@/features/plan/model/tools";
import type { StoredPlan } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";
import { conceptSteps, stepOf } from "./steps";
import { EXAMPLE_STUDENTS, exampleRatings, stepProgress, stepRatings, weeksBetween, type StepRating } from "./stepProgress";

const tool = (t: Record<string, unknown>) => t as unknown as PlanTool;
const r = (concept: string, step: string | null, stars: 1 | 2 | 3 | 4 | 5, on: string): StepRating => ({ concept, step, stars, on });

test("an exercise's step is read from its tools: the level kept on a tool, the stage of a tune, the hardest of several", () => {
  assert.equal(stepOf("spider", [tool({ type: "finger-pattern", level: "intermediate" })]), "2");
  assert.equal(stepOf("spider", [tool({ type: "finger-pattern", level: "new" }), tool({ type: "finger-pattern", level: "beginner" })]), "1");
  assert.equal(stepOf("spider", [tool({ type: "finger-pattern", fingers: "1234" }), tool({ type: "legato-trill", level: "new" })]), null);
  assert.equal(stepOf("breath", [tool({ type: "breathwork", drill: "box", level: "new" })]), null);
  assert.equal(stepOf("intervals", [tool({ type: "interval-ears", query: "", level: "advanced" })]), "4");
  assert.equal(stepOf("steps-to-leaps", [tool({ type: "melody-singer", tune: 1, key: 0 })]), "0");
  assert.equal(stepOf("caged", [tool({ type: "finger-pattern", level: "new" })]), null);
});

test("a log's ratings take their step from the plan slot they rated, one rating per concept; an old id counts for its track", () => {
  const plan = { id: "p", config: { days: [{ exercises: [{ id: "s1", title: "x", minutes: 5, cells: [{ type: "tool", tool: tool({ type: "legato-trill", level: "beginner" }) }] }] }] } } as unknown as StoredPlan;
  const entry = { id: "e", planId: "p", exerciseId: "s1", day: 0, exercise: 0, title: "x", concepts: ["hammer-pull", "spider"], stars: 4, at: "2026-11-01" } as ProgressEntry;
  assert.deepEqual(stepRatings([entry], [plan]), [r("legato", "1", 4, "2026-11-01"), r("spider", null, 4, "2026-11-01")]);
  assert.deepEqual(stepRatings([{ ...entry, planId: "gone" }], [plan]).map((x) => x.step), [null, null]);
});

test("a step is solid on a newest rating of 4 or 5, a solid step carries the easier ones, and the player is on the hardest rated step", () => {
  const p = stepProgress([
    r("spider", "0", 2, "2026-10-01"), r("spider", "1", 3, "2026-10-08"), r("spider", "1", 4, "2026-10-20"),
    r("spider", "2", 3, "2026-11-01"), r("spider", null, 5, "2026-11-02"), r("spider", "3", 5, "2026-12-01"),
  ], "2026-11-10").spider;
  assert.deepEqual(p.steps.map((s) => s.state), ["solid", "solid", "working", "none"]);
  assert.deepEqual([p.at, p.noStep, p.ratings, p.state, p.lastOn], [2, 1, 5, "solid", "2026-11-02"]);
  assert.deepEqual([p.steps[1].ratings, p.steps[1].stars, p.steps[1].firstOn, p.steps[1].lastOn], [2, 4, "2026-10-08", "2026-10-20"]);
});

test("a concept whose steps are all planned keeps its own state and tracks no step", () => {
  const p = stepProgress([r("caged", null, 3, "2026-11-01")], "2026-11-10");
  assert.deepEqual([p.caged.state, p.caged.at, p.caged.noStep, p.caged.steps.every((s) => s.state === "none")], ["working", null, 1, true]);
  assert.equal(p["open-chords"].state, "not-yet");
});

test("weeks are whole weeks", () => {
  assert.deepEqual([weeksBetween("2026-11-01", "2026-11-07"), weeksBetween("2026-11-01", "2026-11-22"), weeksBetween("2026-11-09", "2026-11-01")], [0, 3, 0]);
});

test("the example students name real concepts and real steps of them", () => {
  const ids = new Set(CONCEPTS.map((c) => c.id)), steps = conceptSteps();
  for (const s of EXAMPLE_STUDENTS) {
    for (const x of exampleRatings(s, "2026-11-15")) {
      assert.ok(ids.has(x.concept), `${s.id}: ${x.concept}`);
      if (x.step) assert.ok(steps[x.concept]?.steps.some((st) => st.key === x.step), `${s.id}: ${x.concept} ${x.step}`);
    }
  }
});
