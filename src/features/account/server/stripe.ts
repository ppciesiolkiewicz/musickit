import Stripe from "stripe";
import { isLive, paidThroughCheckout } from "../billing";
import { earlyOpen } from "../pricing";
import { canChoose, isBilling, priceCents, roleOnPlan, type Billing, type Plan } from "../plans";
import type { AuthDeps } from "./auth";
import { earlyTaken } from "./earlyTaken";

/**
 * Payments through Stripe: Checkout to start paying, the billing portal to change or cancel, and the webhook that keeps
 * `users` in step (`syncSubscription`). Only used while `STRIPE_ENABLED` is "true" (`paymentsEnabled`).
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and optional STRIPE_EARLY_COUPON (a 50% "forever" coupon id, applied
 * while the side's early places are open, `EARLY_OFFER`).
 *
 * Prices aren't set up by hand in Stripe: each plan row, billing and amount gets one Stripe price, found by its lookup
 * key and made the first time it is needed, so a price changed in the `plans` table makes a new Stripe price. The price's
 * metadata names the plan and billing, which is how a subscription changed in the portal finds its plan.
 */

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { timeout: 20_000, maxNetworkRetries: 1 });
  return client;
}

const lookupKey = (plan: Plan, billing: Billing) => `plan_${plan.id}_${billing}_${priceCents(plan, billing)}`;

/** The Stripe price for the plan paid by `billing`, made (with its product) when there is none yet. */
async function priceFor(plan: Plan, billing: Billing): Promise<string> {
  const s = stripe();
  const key = lookupKey(plan, billing);
  const found = await s.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const productId = `plan_${plan.id}`;
  try {
    await s.products.retrieve(productId);
  } catch {
    await s.products.create({ id: productId, name: plan.name, metadata: { planId: plan.id } });
  }
  const price = await s.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: priceCents(plan, billing),
    recurring: { interval: billing },
    lookup_key: key,
    transfer_lookup_key: true,
    metadata: { planId: plan.id, billing },
  });
  return price.id;
}

export type CheckoutResult = { url: string } | { error: "plan" | "user" | "free" | "subscribed" };

/**
 * A Checkout page for the user's plan, or for `planId`/`billing` when given (an account paying for another plan than
 * the one it has, from /account). The plan moves only once Stripe says the subscription started. The trial is given
 * once: an account that subscribed before gets none.
 */
export async function startCheckout(deps: AuthDeps, userId: string, input: { planId?: unknown; billing?: unknown }, base: string, next: string): Promise<CheckoutResult> {
  const user = await deps.repo.userById(userId);
  if (!user) return { error: "user" };
  if (isLive(user.subscriptionStatus)) return { error: "subscribed" };
  const plans = await deps.repo.listPlans();
  const asked = input.planId !== undefined;
  const billing = asked ? input.billing : user.billing;
  if (!isBilling(billing)) return { error: "plan" };
  // another plan must be one they could move to; their own plan, paid either way, is always fine
  const plan = asked && !(input.planId === user.planId)
    ? canChoose(plans, user, input.planId, billing)
    : plans.find((p) => p.id === user.planId) ?? null;
  if (!plan) return { error: "plan" };
  if (!paidThroughCheckout(plan, billing)) return { error: "free" };

  const s = stripe();
  let customer = user.stripeCustomerId;
  if (!customer) {
    customer = (await s.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } })).id;
    await deps.repo.setStripeCustomer(user.id, customer, deps.now());
  }
  const open = earlyOpen(await earlyTaken());
  const coupon = process.env.STRIPE_EARLY_COUPON;
  const early = coupon && (plan.role === "student" ? open.individual : open.teachers);
  const trial = user.stripeSubscriptionId === null && plan.trialDays > 0 ? plan.trialDays : undefined;
  const done = new URL("/api/account/checkout/done", base);
  done.searchParams.set("next", next);
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: await priceFor(plan, billing), quantity: 1 }],
    subscription_data: { trial_period_days: trial, metadata: { userId: user.id } },
    ...(early ? { discounts: [{ coupon }] } : {}),
    // Stripe fills in the session id; URLSearchParams would escape its braces
    success_url: `${done.toString()}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: new URL(next, base).toString(),
  });
  return session.url ? { url: session.url } : { error: "plan" };
}

/** Stripe's billing portal for the user: change plan, card, cancel, invoices. Null with no Stripe customer. */
export async function openPortal(deps: AuthDeps, userId: string, base: string): Promise<string | null> {
  const user = await deps.repo.userById(userId);
  if (!user?.stripeCustomerId) return null;
  const session = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: new URL("/account", base).toString() });
  return session.url;
}

/**
 * Brings the user in line with a subscription from Stripe: its status, and the plan and billing its price names
 * (a change in the portal moves the plan, with the plan's role). A live subscription ends `paymentExempt`. An older
 * subscription than the user's newest one is ignored, so a cancelled old one can't undo a new one.
 */
export async function syncSubscription(deps: AuthDeps, sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = (await deps.repo.userByStripeCustomer(customerId)) ?? (sub.metadata.userId ? await deps.repo.userById(sub.metadata.userId) : null);
  if (!user) return;
  if (user.stripeSubscriptionId && user.stripeSubscriptionId !== sub.id && isLive(user.subscriptionStatus) && !isLive(sub.status)) return;
  if (!user.stripeCustomerId) await deps.repo.setStripeCustomer(user.id, customerId, deps.now());
  const live = isLive(sub.status);
  await deps.repo.setSubscription(user.id, sub.id, sub.status, live, deps.now());
  const meta = sub.items.data[0]?.price.metadata ?? {};
  const plan = (await deps.repo.listPlans()).find((p) => p.id === meta.planId);
  if (live && plan && isBilling(meta.billing) && (plan.id !== user.planId || meta.billing !== user.billing)) {
    const role = plan.id === user.planId ? user.role : roleOnPlan(user.role, plan);
    await deps.repo.setUserPlan(user.id, plan.id, meta.billing, role, deps.now());
  }
}

/**
 * Keeps a paid invoice as a completed order (`payments`), for the account whose Stripe customer it is. The plan and
 * billing come from the invoice's price metadata, so the row says what was bought then. A repeat of the same invoice
 * changes nothing.
 */
export async function recordInvoice(deps: AuthDeps, invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.id || !invoice.customer) return;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id;
  const user = await deps.repo.userByStripeCustomer(customerId);
  const sub = invoice.parent?.subscription_details?.subscription ?? null;
  const price = invoice.lines.data[0]?.pricing?.price_details?.price;
  const meta = (price && typeof price !== "string" ? price.metadata : null) ?? {};
  const paid = invoice.status_transitions.paid_at;
  await deps.repo.recordPayment({
    id: invoice.id,
    userId: user?.id ?? null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: typeof sub === "string" ? sub : sub?.id ?? null,
    planId: meta.planId ?? user?.planId ?? null,
    billing: isBilling(meta.billing) ? meta.billing : user?.billing ?? null,
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
    reason: invoice.billing_reason,
    number: invoice.number,
    invoiceUrl: invoice.hosted_invoice_url ?? null,
    paidAt: paid ? new Date(paid * 1000) : deps.now(),
  }, deps.now());
}

/** After Checkout: the session's subscription, synced at once so the page after it doesn't wait for the webhook. */
export async function finishCheckout(deps: AuthDeps, userId: string, sessionId: string): Promise<boolean> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.client_reference_id !== userId || !session.subscription || typeof session.subscription === "string") return false;
  await syncSubscription(deps, session.subscription);
  return true;
}
