import { test } from "node:test";
import assert from "node:assert/strict";
import { atScale, planTokens, playerYear, requestCost, type Assumptions } from "./unitEconomics";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const usage = (input: number, output: number) => ({ input, output, cacheRead: 0, cacheWrite: 0 });

test("a request is priced at list price, Haiku's long prompt at its higher rate", () => {
  close(requestCost("claude-opus-5-5", 1_000_000, 1_000_000)!, 24);
  close(requestCost("claude-haiku-5-5", 100_000, 0)!, 0.01);
  close(requestCost("claude-haiku-5-5", 200_000, 100_000)!, 0.1 + 0.25);
  assert.equal(requestCost("pasted" as never, 1, 1), null);
});

test("plan tokens are the median per model, counting cached input, from runs that wrote a plan", () => {
  const t = planTokens([
    { model: "claude-sonnet-5-5", ok: true, usage: { input: 10, output: 100, cacheRead: 50, cacheWrite: 0 } },
    { model: "claude-sonnet-5-5", ok: true, usage: usage(80, 300) },
    { model: "claude-sonnet-5-5", ok: true, usage: usage(70, 200) },
    { model: "claude-sonnet-5-5", ok: false, usage: usage(1e9, 1e9) },
    { model: "claude-opus-5-5", ok: true },
    { model: "pasted", ok: true, usage: usage(1, 1) },
  ]);
  assert.deepEqual(t, [{ model: "claude-sonnet-5-5", label: "Sonnet 5.5", runs: 3, input: 70, output: 200 }]);
});

const A: Assumptions = { price: 27, plansPerMonth: 8, aiShare: 1, batch: false, emailsPerDay: 1, emailPer1000: 0.4, feePercent: 2.9, feeFixed: 0.3, hosting: 0 };

test("a player's year adds the AI, the emails and the fee, and finds the break-even", () => {
  const y = playerYear({ model: "claude-sonnet-5-5", input: 100_000, output: 30_000 }, A);
  close(y.perPlan, 0.5);
  close(y.ai, 48);
  close(y.email, 0.146);
  close(y.fee, 27 * 0.029 + 0.3);
  close(y.total, y.ai + y.email + y.fee);
  close(y.left, 27 - y.total);
  close(y.breakEvenPlansPerMonth, (27 - y.email - y.fee) / 6);
});

test("the Batch API halves the AI and nothing else", () => {
  const t = { model: "claude-opus-5-5" as const, input: 70_000, output: 27_000 };
  const full = playerYear(t, A), half = playerYear(t, { ...A, batch: true });
  close(half.ai, full.ai / 2);
  close(half.email, full.email);
  close(half.fee, full.fee);
});

test("only the players on attunr's AI cost AI; nobody on it means no break-even", () => {
  const t = { model: "claude-sonnet-5-5" as const, input: 100_000, output: 30_000 };
  close(playerYear(t, { ...A, aiShare: 0.25 }).ai, 12);
  assert.equal(playerYear(t, { ...A, aiShare: 0 }).breakEvenPlansPerMonth, Infinity);
});

test("at scale, fixed costs come off the margin, and a losing player never covers them", () => {
  const y = playerYear({ model: "claude-haiku-5-5", input: 50_000, output: 20_000 }, A);
  const s = atScale(y, 27, 1000, 50);
  close(s.revenue, 27_000);
  close(s.fixed, 600);
  close(s.profit, 27_000 - y.total * 1000 - 600);
  assert.equal(s.playersToCoverFixed, Math.ceil(600 / y.left));
  const loss = playerYear({ model: "claude-fable-5-2", input: 80_000, output: 55_000 }, A);
  assert.equal(atScale(loss, 27, 10, 50).playersToCoverFixed, null);
});
