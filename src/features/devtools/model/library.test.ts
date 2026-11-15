import { test } from "node:test";
import assert from "node:assert/strict";
import { MODEL_PLANS } from "@/features/plan/modelPlans";
import { DEMO_PLANS } from "@/features/plan/demos";
import { PLAN_EXAMPLES } from "@/features/plan/examples";
import { exampleAnswers, exampleLibraryRows, libraryRows, SEED_MODEL } from "./library";
import { PERSONAS } from "./personas";

test("the library seed is every published Fable plan that parses, with its player's answers, enabled for reuse", () => {
  const rows = libraryRows(MODEL_PLANS, PERSONAS);
  const fable = Object.values(MODEL_PLANS).filter((p) => p.model === SEED_MODEL);
  assert.ok(rows.length > 0 && rows.length <= fable.length);
  for (const r of rows) {
    assert.equal(r.model, SEED_MODEL);
    assert.equal(r.enabledForReuse, true);
    assert.ok(r.title.length > 0);
    assert.deepEqual(r.answers, PERSONAS.find((p) => r.id.startsWith(`${p.id}--`))!.answers);
  }
});

test("a published plan's versions go on its row; one from before they were kept has none", () => {
  const [slug, p] = Object.entries(MODEL_PLANS).find(([, x]) => x.model === SEED_MODEL)!;
  const versions = { prompt: 3, agents: 2, teaching: 5 };
  const of = (plan: typeof p) => {
    const r = libraryRows({ [slug]: plan }, PERSONAS)[0];
    return [r.promptVersion, r.docsAgents, r.docsTeaching];
  };
  assert.deepEqual(of({ ...p, versions }), [3, 2, 5]);
  assert.deepEqual(of({ ...p, versions: undefined }), [null, null, null]);
});

test("a plan whose player is gone, or by another model, is left out", () => {
  assert.deepEqual(libraryRows(MODEL_PLANS, []), []);
  assert.ok(libraryRows(MODEL_PLANS, PERSONAS, "claude-haiku-5-5").every((r) => r.model === "claude-haiku-5-5"));
});

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
  const ids = [...exampleLibraryRows(), ...libraryRows(MODEL_PLANS, PERSONAS)].map((r) => r.id);
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
