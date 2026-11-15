import { test } from "node:test";
import assert from "node:assert/strict";
import { MODEL_PLANS } from "@/features/plan/modelPlans";
import { libraryRows, SEED_MODEL } from "./library";
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

test("a plan whose player is gone, or by another model, is left out", () => {
  assert.deepEqual(libraryRows(MODEL_PLANS, []), []);
  assert.ok(libraryRows(MODEL_PLANS, PERSONAS, "claude-haiku-5-5").every((r) => r.model === "claude-haiku-5-5"));
});
