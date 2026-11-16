import { test } from "node:test";
import assert from "node:assert/strict";
import type { PlanTool } from "@/features/plan/model/tools";
import { conceptSteps, hasLadder, spareSteps, stepOf } from "./steps";

test("a concept's steps are its track's, in order; a ladder step has a key, the others are planned", () => {
  const steps = conceptSteps();
  const notes = steps["notes-on-neck"];
  assert.deepEqual(notes.steps.map((s) => [s.key, s.planned, s.level]), [["0", false, "new"], ["1", false, "beginner"], ["2", false, "intermediate"], ["3", false, "advanced"]]);
  assert.match(notes.from!, /levels\.ts/);
  assert.ok(steps.caged.steps.every((s) => s.planned && s.key === undefined));
  assert.equal(steps.caged.from, undefined);
  assert.deepEqual(steps.caged.steps[0].after, ["barre:3", "pentatonic-positions:1"]);
});

test("stepOf gives the step's key; hasLadder says whether any step can be read", () => {
  assert.equal(stepOf("notes-on-neck", [{ type: "note-finder", level: "beginner" } as unknown as PlanTool]), "1");
  assert.equal(stepOf("caged", [{ type: "note-finder", level: "beginner" } as unknown as PlanTool]), null);
  assert.ok(hasLadder("notes-on-neck"));
  assert.ok(!hasLadder("caged"));
});

test("spare steps are the ladder steps no step of the path stands for", () => {
  const spare = spareSteps();
  assert.ok(!spare.some((s) => s.ladder.id === "note-finder"));
  for (const s of spare) assert.ok(s.steps.length > 0, s.ladder.id);
});
