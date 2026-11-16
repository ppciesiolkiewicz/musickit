import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_PLANS } from "@/features/plan/demos";
import { PLAN_EXAMPLES } from "@/features/plan/examples";
import { exampleAnswers, exampleLibraryRows, seedLibraryRows } from "./library";

test("every plan example is a library row under its own id, enabled, with its model and document versions", () => {
  const rows = exampleLibraryRows();
  assert.deepEqual(rows.map((r) => r.id), PLAN_EXAMPLES.map((e) => e.id));
  for (const r of rows) {
    const e = PLAN_EXAMPLES.find((x) => x.id === r.id)!;
    assert.equal(r.source, "example");
    assert.equal(r.enabledForReuse, true);
    assert.equal(r.model, e.model);
    assert.deepEqual([r.docsAgents, r.docsTeaching, r.promptVersion], [e.docs.agents, e.docs.teaching, null]);
    assert.deepEqual(JSON.parse(r.reply), e.plan);
    assert.deepEqual(r.answers.areas, e.areas);
    assert.equal(r.answers.minutes, e.minutes);
    assert.ok(Object.keys(r.answers.topics).length > 0);
  }
});

test("every demo's plan is a library plan with the same id", () => {
  const ids = new Set(exampleLibraryRows().map((r) => r.id));
  for (const d of Object.values(DEMO_PLANS)) assert.ok(ids.has(d.example), d.example);
});

test("no library id is used twice", () => {
  const ids = [...exampleLibraryRows(), ...seedLibraryRows()].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("an example's answers: its areas' topics at the rung of their highest exercise level", () => {
  const e = { ...PLAN_EXAMPLES[0], areas: ["guitar" as const], minutes: 20 };
  const days = [
    { exercises: [{ topic: "guitar-scales", level: "beginner" as const }, { topic: "guitar-scales", level: "intermediate" as const }] },
    { exercises: [{ topic: "guitar-basic-chords", level: "new" as const }, { topic: "theory-ear", level: "advanced" as const }, { level: "advanced" as const }] },
  ];
  assert.deepEqual(exampleAnswers(e, days), { areas: ["guitar"], topics: { "guitar-scales": 2, "guitar-basic-chords": 0 }, minutes: 20, styles: "", notes: "" });
});

test("a seed plan file is a library row with its own answers, model and versions; one that doesn't parse is left out", () => {
  const plan = JSON.parse(exampleLibraryRows()[0].reply);
  const answers = { areas: ["guitar" as const], topics: {}, minutes: 20, styles: "", notes: "" };
  const file = { id: "guitar-new-test", answers, model: "claude-fable-5-2", versions: { prompt: 1, agents: 2, teaching: 5 }, note: "a gap", plan };
  const [r] = seedLibraryRows([file, { ...file, id: "broken", plan: {} }]);
  assert.equal(seedLibraryRows([file, { ...file, id: "broken", plan: {} }]).length, 1);
  assert.deepEqual([r.id, r.source, r.model, r.promptVersion, r.docsAgents, r.docsTeaching, r.enabledForReuse], ["guitar-new-test", "seed", "claude-fable-5-2", 1, 2, 5, true]);
  assert.deepEqual(r.answers, answers);
});
