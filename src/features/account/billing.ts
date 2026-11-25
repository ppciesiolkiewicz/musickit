import { INDIEAPPCIRCLE_PLAN_ID, PERSONAL_DEMO_PLAN_ID, TAUGHT_PLAN_ID, TEACHER_DEMO_PLAN_ID, pricedWithYou, priceCents, type Billing, type Plan } from "./plans";

/**
 * Who pays, as rules with no Stripe in them (`server/stripe.ts` talks to Stripe). Payments are on only when the
 * server's `STRIPE_ENABLED` is "true"; off, nobody is asked to pay, as in the beta.
 *
 * An account on a paid plan must have a live subscription, unless it is `paymentExempt`: every account that had a plan
 * before payments came (migration 0040). An exempt account keeps its plan free and may still pay, for that plan or
 * another, from /account.
 */

/** Plans that never take a payment: a teacher's student, the two demos, a join code's. A plan priced with the person is paid by arrangement, not Checkout. */
const FREE_PLAN_IDS = new Set([TAUGHT_PLAN_ID, TEACHER_DEMO_PLAN_ID, PERSONAL_DEMO_PLAN_ID, INDIEAPPCIRCLE_PLAN_ID]);

/** The plan has stopped (`plan_ends_at`, set by a join code): the account chooses again, as if it had no plan. */
export const planEnded = (u: { planEndsAt: Date | null }, now: Date): boolean => u.planEndsAt !== null && u.planEndsAt.getTime() <= now.getTime();

/** The user as the plan rules see them now: with no plan once theirs has ended. */
export const onPlanNow = <U extends { planId: string | null; planEndsAt: Date | null }>(u: U, now: Date): U => (planEnded(u, now) ? { ...u, planId: null } : u);

/** The plan ids that never go through Checkout, for code that has only the id (the account's `toAccount`). */
export const isFreePlanId = (planId: string): boolean => FREE_PLAN_IDS.has(planId) || planId === "teacher-unlimited";

/** Whether this plan, paid by `billing`, is bought through Checkout. */
export const paidThroughCheckout = (plan: Plan, billing: Billing): boolean =>
  !isFreePlanId(plan.id) && !pricedWithYou(plan) && priceCents(plan, billing) > 0;

/** Stripe statuses that give access: paying, in the trial, or a failed payment Stripe is still retrying. */
const LIVE = new Set(["trialing", "active", "past_due"]);
export const isLive = (status: string | null): boolean => status !== null && LIVE.has(status);

/** What the gate needs to know about a user. */
export interface PayerState {
  planId: string | null;
  paymentExempt: boolean;
  subscriptionStatus: string | null;
}

/** Must pay before using the app: payments on, a paid plan, not exempt, and no live subscription. */
export const mustPay = (u: PayerState, paymentsOn: boolean): boolean =>
  paymentsOn && u.planId !== null && !isFreePlanId(u.planId) && !u.paymentExempt && !isLive(u.subscriptionStatus);
