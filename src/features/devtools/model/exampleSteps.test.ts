import { test } from "node:test";
import assert from "node:assert/strict";
import type { Cell, PlanTool } from "@/features/plan/model/tools";
import { exerciseSteps, planSteps } from "./exampleSteps";

const tool = (t: Record<string, unknown>): Cell => ({ type: "tool", tool: t as unknown as PlanTool });
const ex = (concepts: string[] | undefined, ...cells: Cell[]) => ({ concepts, cells });

test("each concept of an exercise says the step its tools are on, none when the tools say none, or that it has no ladder", () => {
  assert.deepEqual(exerciseSteps(ex(["spider", "hammer-pull", "caged"], tool({ type: "finger-pattern", level: "beginner" }))), [
    { concept: "spider", label: "The spider", read: "step", step: "Fingers 1 2 3 4 from fret 1" },
    { concept: "hammer-pull", label: "Hammer-ons & pull-offs", read: "no-step" },
    { concept: "caged", label: "CAGED shapes", read: "no-ladder" },
  ]);
  // raw settings, no level: counts for no step
  assert.equal(exerciseSteps(ex(["spider"], tool({ type: "finger-pattern", fingers: "1234" })))[0].read, "no-step");
  assert.deepEqual(exerciseSteps(ex(undefined, tool({ type: "finger-pattern", level: "new" }))), []);
});

test("a plan gathers its concepts over the exercises: the steps read, the exercises that said none, the untagged ones", () => {
  const p = planSteps([
    ex(["spider"], tool({ type: "finger-pattern", level: "new" })),
    ex(["spider"], tool({ type: "finger-pattern", level: "beginner" })),
    ex(["spider"], tool({ type: "finger-pattern", level: "new" })),
    ex(["spider", "caged"], tool({ type: "finger-pattern", fingers: "1234" })),
    ex([]),
    ex(undefined),
  ]);
  assert.equal(p.exercises, 6);
  assert.equal(p.untagged, 2);
  assert.deepEqual(p.concepts, [
    { concept: "spider", label: "The spider", exercises: 4, steps: ["Fingers 1 2 3 4 from fret 5", "Fingers 1 2 3 4 from fret 1"], noStep: 1, ladder: true },
    { concept: "caged", label: "CAGED shapes", exercises: 1, steps: [], noStep: 0, ladder: false },
  ]);
});
