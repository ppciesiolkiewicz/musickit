import { test } from "node:test";
import assert from "node:assert/strict";
import { CONCEPTS } from "@/features/plan/model/concepts";
import { LADDERS, LINKS, PLANNED, conceptSteps, spareSteps } from "./steps";

const ids = new Set(CONCEPTS.map((c) => c.id));

test("every link and planned list names a real concept, a real ladder and real step keys", () => {
  for (const id of [...Object.keys(LINKS), ...Object.keys(PLANNED)]) assert.ok(ids.has(id), id);
  for (const [id, link] of Object.entries(LINKS)) {
    const ladder = LADDERS.find((l) => l.id === link.ladder);
    assert.ok(ladder, `${id}: ${link.ladder}`);
    for (const key of link.only ?? []) assert.ok(ladder.steps.some((s) => s.key === key), `${id}: ${key}`);
  }
});

test("a concept's steps are its ladder's in ladder order, then the planned ones marked so", () => {
  const steps = conceptSteps();
  assert.deepEqual(steps["singing-intervals"].steps.map((s) => [s.name, s.planned]), [["new", false], ["beginner", false], ["intermediate", false], ["advanced", false]]);
  assert.equal(steps["singing-intervals"].steps[0].holds, "major 3rd, perfect 5th; up");
  assert.match(steps["singing-intervals"].from!, /levels\.ts/);
  assert.deepEqual(steps["notes-e-a-strings"].steps.map((s) => s.name), ["new", "beginner"]);
  assert.ok(steps.caged.steps.every((s) => s.planned));
  assert.equal(steps.caged.from, undefined);
});

test("spare steps are the ladder steps no concept takes; a ladder shared out whole is not listed", () => {
  const spare = spareSteps();
  assert.ok(!spare.some((s) => s.ladder.id === "note-finder" || s.ladder.id === "interval-singer"));
  assert.equal(spare.find((s) => s.ladder.id === "picking-drill")!.steps.length, 4);
  const melody = spare.find((s) => s.ladder.id === "melody-stages")!.steps.map((s) => s.name);
  assert.ok(melody.includes("Sol La Sol") && !melody.includes("Do Mi Sol"));
});
