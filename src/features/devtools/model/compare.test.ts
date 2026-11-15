import { test } from "node:test";
import assert from "node:assert/strict";
import { cellKey, latestByCell, runCost } from "./compare";
import type { RunSummary } from "./history";

const run = (o: Partial<RunSummary>): RunSummary => ({ id: "x", at: "2026-11-15T10:00:00Z", mode: "first", model: "claude-haiku-5-5", ok: true, durationMs: 1, chars: 1, edited: [], persona: "p", ...o });

test("latestByCell keeps the newest good run, and a failure only where nothing worked", () => {
  const m = latestByCell([
    run({ id: "old", at: "2026-11-15T09:00:00Z" }),
    run({ id: "new", at: "2026-11-15T10:00:00Z" }),
    run({ id: "broke", at: "2026-11-15T11:00:00Z", ok: false }),
    run({ id: "only-fail", model: "claude-opus-5-5", ok: false }),
    run({ id: "no-persona", persona: undefined }),
  ]);
  assert.equal(m.get(cellKey("p", "claude-haiku-5-5"))?.id, "new");
  assert.equal(m.get(cellKey("p", "claude-opus-5-5"))?.id, "only-fail");
  assert.equal(m.size, 2);
});

test("runCost: API prices for Claude, OpenRouter prices for a local model, null without tokens or a price", () => {
  const usage = { input: 1_000_000, output: 100_000, cacheRead: 0, cacheWrite: 0 };
  assert.equal(runCost({ model: "claude-sonnet-5-5", usage }), 2 + 1);
  assert.ok(Math.abs(runCost({ model: "ollama:llama3.1:8b", usage })! - (0.02 + 0.004)) < 1e-9);
  assert.equal(runCost({ model: "ollama:some-other:1b", usage }), null);
  assert.equal(runCost({ model: "claude-sonnet-5-5" }), null);
});
