import { test } from "node:test";
import assert from "node:assert/strict";
import type { Plan } from "../plans";
import { authDeps, choosePlan, toAccount } from "./auth";
import { memoryRepo } from "./repo.memory";
import type Stripe from "stripe";
import { recordInvoice } from "./stripe";

const plan = (id: string, role: Plan["role"] = "student"): Plan => ({
  id, name: id, role, monthCents: 599, yearCents: 3600, trialDays: 30, students: role === "teacher" ? 15 : 0, extraStudents: 0,
  autoplansPerMonth: 0, batch: false, enabled: true, sort: 0,
});
const PLANS = [plan("student"), plan("teacher-basic", "teacher")];

async function userOn(planId: string, exempt: boolean) {
  const store = memoryRepo(PLANS);
  const deps = authDeps(store.repo);
  const u = (await store.repo.createUser({ email: "a@example.com", name: "A", role: "student" }, new Date()))!;
  await store.repo.setUserPlan(u.id, planId, "year", "student", new Date());
  if (exempt) store.users.find((x) => x.id === u.id)!.paymentExempt = true;
  return { store, deps, id: u.id };
}

test("payments on: an unpaid account is held on setup; an exempt one isn't; a live subscription lets it in", async () => {
  const { store, id } = await userOn("student", false);
  const row = () => store.users.find((x) => x.id === id)!;
  assert.equal(toAccount(row(), false).needsSetup, false, "payments off: as before");
  assert.deepEqual([toAccount(row(), true).needsSetup, toAccount(row(), true).needsPayment], [true, true]);
  await store.repo.setSubscription(id, "sub_1", "trialing", true, new Date());
  assert.deepEqual([toAccount(row(), true).needsSetup, toAccount(row(), true).subscribed], [false, true]);
  row().paymentExempt = true;
  row().subscriptionStatus = "canceled";
  assert.equal(toAccount(row(), true).needsSetup, false, "exempt keeps the plan free");
});

test("an exempt account moving to another paid plan has to pay; a subscriber is sent to the billing portal", async () => {
  const { store, deps, id } = await userOn("student", true);
  const moved = await choosePlan(deps, toAccount(store.users[0], true), "teacher-basic", "year", true);
  assert.ok(moved, "the move goes through; the gate then sends it to Checkout");
  assert.equal(store.users.find((x) => x.id === id)!.paymentExempt, false);
  await store.repo.setSubscription(id, "sub_1", "active", true, new Date());
  assert.equal(await choosePlan(deps, toAccount(store.users[0], true), "student", "month", true), null);
});

test("a paid invoice is kept once as an order, with the plan its price names", async () => {
  const { store, deps, id } = await userOn("student", false);
  await store.repo.setStripeCustomer(id, "cus_1", new Date());
  const invoice = {
    id: "in_1", customer: "cus_1", amount_paid: 299, currency: "usd", billing_reason: "subscription_cycle", number: "A-1",
    hosted_invoice_url: "https://invoice.stripe.com/i/1", status_transitions: { paid_at: 1_790_000_000 },
    parent: { subscription_details: { subscription: "sub_1" } },
    lines: { data: [{ pricing: { price_details: { price: { metadata: { planId: "teacher-basic", billing: "month" } } } } }] },
  } as unknown as Stripe.Invoice;
  await recordInvoice(deps, invoice);
  await recordInvoice(deps, invoice);
  const rows = await store.repo.paymentsOf(id);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].planId, rows[0].billing, rows[0].amountCents, rows[0].stripeSubscriptionId], ["teacher-basic", "month", 299, "sub_1"]);
  assert.equal(rows[0].paidAt.getTime(), 1_790_000_000_000);
});
