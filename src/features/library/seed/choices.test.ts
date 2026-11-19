import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandPlan, exerciseOf } from "./choices";
import type { SeedBlockFile, SeedPlanFile } from "./index";

const versions = { prompt: 1, agents: 1, teaching: 1 };
const block = (id: string, names: [string, number][]): SeedBlockFile => ({
  id,
  model: "m",
  versions,
  note: "n",
  exercise: { title: "T", area: "guitar", cells: [] },
  choices: names.map(([name, minutes]) => ({ name, level: "new", steps: ["barre:2"], moves: { key: "any" }, minutes })),
});
const plan = (exercises: { block: string; choice: string; minutes?: number }[]): SeedPlanFile =>
  ({ id: "p", answers: {}, model: "m", versions, note: "n", plan: { title: "P", days: [{ theme: "d", exercises }] } }) as unknown as SeedPlanFile;

describe("exerciseOf", () => {
  it("merges the choice and carries both ids", () => {
    const b = block("guitar-new-barre", [["new", 8]]);
    const e = exerciseOf(b, b.choices[0]);
    assert.deepEqual(e, { title: "T", area: "guitar", cells: [], level: "new", steps: ["barre:2"], moves: { key: "any" }, minutes: 8, blockId: "guitar-new-barre", choiceId: "guitar-new-barre/new" });
  });
});

describe("expandPlan", () => {
  const blocks = [block("guitar-new-barre", [["new", 8]])];
  const days = (r: { plan: Record<string, unknown> }) => (r.plan.days as { exercises: Record<string, unknown>[] }[])[0].exercises;
  it("uses the ref's minutes, else the choice's", () => {
    const r = expandPlan(plan([{ block: "guitar-new-barre", choice: "new", minutes: 5 }, { block: "guitar-new-barre", choice: "new" }]), blocks);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(days(r).map((e) => e.minutes), [5, 8]);
    assert.equal(days(r)[0].choiceId, "guitar-new-barre/new");
  });
  it("names a missing block and a missing choice", () => {
    const r = expandPlan(plan([{ block: "nope-block", choice: "new" }, { block: "guitar-new-barre", choice: "old" }]), blocks);
    assert.equal(r.errors.length, 2);
    assert.match(r.errors[0], /nope-block/);
    assert.match(r.errors[1], /guitar-new-barre.*old|old.*guitar-new-barre/);
  });
});
