import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_PLANS } from "@/features/library/seed";
import { DEMO_PLANS } from "@/features/plan/demos";
import { seedLibraryRows } from "./library";

test("every demo's plan is a library plan with the same id", () => {
  const ids = new Set(seedLibraryRows().map((r) => r.id));
  for (const d of Object.values(DEMO_PLANS)) assert.ok(ids.has(d.plan), d.plan);
});

test("a former plan example is a seed row under its own id, enabled", () => {
  const r = seedLibraryRows().find((x) => x.id === "guitar-beginner")!;
  assert.deepEqual([r.source, r.enabledForReuse], ["seed", true]);
  assert.deepEqual(JSON.parse(r.reply), SEED_PLANS.find((f) => f.id === "guitar-beginner")!.plan);
});

test("no library id is used twice", () => {
  const ids = seedLibraryRows().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("a seed plan file is a library row with its own answers, model and versions; one that doesn't parse is left out", () => {
  const plan = SEED_PLANS[0].plan;
  const answers = { areas: ["guitar" as const], topics: {}, minutes: 20, styles: "", notes: "" };
  const file = { id: "guitar-new-test", answers, model: "claude-fable-5-2", versions: { prompt: 1, agents: 2, teaching: 5 }, note: "a gap", plan };
  const rows = seedLibraryRows([file, { ...file, id: "broken", plan: {} }]);
  assert.equal(rows.length, 1);
  const [r] = rows;
  assert.deepEqual([r.id, r.source, r.model, r.promptVersion, r.docsAgents, r.docsTeaching, r.enabledForReuse], ["guitar-new-test", "seed", "claude-fable-5-2", 1, 2, 5, true]);
  assert.deepEqual(r.answers, answers);
});
