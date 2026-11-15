import { test } from "node:test";
import assert from "node:assert/strict";
import { BASELINE_ID, OPENROUTER_MODELS, estimateOpenRouter, openRouterCost } from "./openRouter";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("each model is costed on the same tokens, cheapest first, against Haiku 5.5", () => {
  const rows = estimateOpenRouter({ input: 90_000, output: 20_000 }, 8);
  assert.equal(rows.length, OPENROUTER_MODELS.length);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].perPlan <= rows[i].perPlan);
  const haiku = rows.find((r) => r.model.id === BASELINE_ID)!;
  close(haiku.perPlan, (90_000 * 0.1 + 20_000 * 0.5) / 1e6);
  close(haiku.aiYear, haiku.perPlan * 8 * 12);
  close(haiku.vsBaseline, 1);
});

test("every model has a unique id and a price", () => {
  assert.equal(new Set(OPENROUTER_MODELS.map((m) => m.id)).size, OPENROUTER_MODELS.length);
  for (const m of OPENROUTER_MODELS) assert.ok(m.input > 0 && m.output > 0, m.id);
});

test("a prompt over the long-prompt line is billed at the dearer price, all of it", () => {
  const haiku = OPENROUTER_MODELS.find((m) => m.id === BASELINE_ID)!;
  close(openRouterCost(haiku, 99_999, 10_000), (99_999 * 0.1 + 10_000 * 0.5) / 1e6);
  close(openRouterCost(haiku, 108_000, 56_000), (108_000 * 0.5 + 56_000 * 2.5) / 1e6);
  const glm = OPENROUTER_MODELS.find((m) => m.id === "z-ai/glm-5.3-flash")!;
  close(openRouterCost(glm, 108_000, 56_000), (108_000 * 0.04 + 56_000 * 0.078) / 1e6);
});
