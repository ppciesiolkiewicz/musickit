import { test } from "node:test";
import assert from "node:assert/strict";
import { isFreePlanId, isLive, mustPay, paidThroughCheckout } from "./billing";
import type { Plan } from "./plans";

const plan = (id: string, over: Partial<Plan> = {}): Plan => ({
  id, name: id, role: "student", monthCents: 599, yearCents: 3600, trialDays: 30, students: 0, extraStudents: 0,
  autoplansPerMonth: 0, batch: false, enabled: true, sort: 0, ...over,
});

test("payments off: nobody must pay", () => {
  assert.equal(mustPay({ planId: "student", paymentExempt: false, subscriptionStatus: null }, false), false);
});

test("payments on: a paid plan with no live subscription must pay; exempt, live or free plans don't", () => {
  const u = { planId: "student", paymentExempt: false, subscriptionStatus: null };
  assert.equal(mustPay(u, true), true);
  assert.equal(mustPay({ ...u, paymentExempt: true }, true), false, "had a plan before payments");
  assert.equal(mustPay({ ...u, subscriptionStatus: "trialing" }, true), false);
  assert.equal(mustPay({ ...u, subscriptionStatus: "past_due" }, true), false, "Stripe is still retrying");
  assert.equal(mustPay({ ...u, subscriptionStatus: "canceled" }, true), true);
  assert.equal(mustPay({ ...u, planId: "taught" }, true), false);
  assert.equal(mustPay({ ...u, planId: null }, true), false, "no plan yet is setup, not payment");
});

test("which plans go through Checkout", () => {
  assert.equal(paidThroughCheckout(plan("student"), "month"), true);
  assert.equal(paidThroughCheckout(plan("teacher-unlimited", { students: null, monthCents: 0, yearCents: 0 }), "year"), false);
  assert.equal(paidThroughCheckout(plan("personal-demo"), "year"), false);
  assert.equal(paidThroughCheckout(plan("x", { monthCents: 0 }), "month"), false);
  assert.ok(isFreePlanId("teacher-demo"));
  assert.ok(!isLive(null) && isLive("active") && !isLive("incomplete"));
});
