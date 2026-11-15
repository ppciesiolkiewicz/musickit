import { test } from "node:test";
import assert from "node:assert/strict";
import { lifetimeValue, project, startShares, type GrowthInputs, type GrowthPlan } from "./growth";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const plan: GrowthPlan = { id: "a", month: 9, year: 27, trialDays: 0, share: 1, costPerMonth: 0 };
const g: GrowthInputs = { months: 25, trialsStart: 100, growth: 0, conversion: 0.5, yearlyShare: 0, monthlyChurn: 0, yearlyRenewal: 1, fee: { percent: 0, fixed: 0 }, fixedMonthly: 0 };

test("monthly payers add up, pay every month and leave at the churn", () => {
  const m = project([plan], g);
  close(m[0].monthly, 50);
  close(m[2].monthly, 150);
  close(m[2].cashIn, 150 * 9);
  close(m[2].mrr, 150 * 9);
  const churned = project([plan], { ...g, monthlyChurn: 0.1 });
  close(churned[1].monthly, 50 * 0.9 + 50);
});

test("yearly payers pay once a year, and only those who renew pay again", () => {
  const m = project([plan], { ...g, trialsStart: 0, yearlyShare: 1, yearlyRenewal: 0.5 }).map((x) => x);
  assert.equal(m[0].cashIn, 0);
  const one = project([plan], { ...g, months: 14, trialsStart: 2, growth: -1, yearlyShare: 1, yearlyRenewal: 0.5 });
  close(one[0].cashIn, 27);
  close(one[1].cashIn, 0);
  close(one[0].mrr, 27 / 12);
  close(one[12].cashIn, 27 * 0.5);
  close(one[12].yearly, 0.5);
});

test("costs: trials that don't pay for their days, accounts, fees and fixed; the profit adds up", () => {
  const p = { ...plan, trialDays: 15, costPerMonth: 2 };
  const m = project([p], { ...g, months: 2, fee: { percent: 10, fixed: 0.5 }, fixedMonthly: 100 });
  close(m[0].costs, 100 + 50 * 2 * 0.5 + 50 * 2 + 50 * (0.9 + 0.5));
  close(m[0].profit, m[0].cashIn - m[0].costs);
  close(m[1].cumulative, m[0].profit + m[1].profit);
});

test("the plan mix splits new payers by share", () => {
  const m = project([{ ...plan, share: 3 }, { ...plan, id: "b", month: 29, share: 1 }], { ...g, months: 1 });
  close(m[0].cashIn, 50 * 0.75 * 9 + 50 * 0.25 * 29);
});

test("a lifetime is the margin over the share that leaves", () => {
  const v = lifetimeValue({ month: 10, year: 80, costPerMonth: 1 }, { monthlyChurn: 0.1, yearlyRenewal: 0.6, fee: { percent: 0, fixed: 0 } });
  close(v.monthly, 90);
  close(v.yearly, 68 / 0.4);
  assert.equal(lifetimeValue(plan, { monthlyChurn: 0, yearlyRenewal: 1, fee: g.fee }).monthly, Infinity);
});

test("the starting plan mix puts 70 on the first plan and fewer on each dearer one", () => {
  assert.deepEqual(startShares(1), [100]);
  assert.deepEqual(startShares(2), [70, 30]);
  assert.deepEqual(startShares(3), [70, 20, 10]);
});
