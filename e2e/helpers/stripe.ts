import { expect, test, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";

// Payments in the tests (E2E7). The test server's webhook secret and the optional sandbox key come from
// playwright.config.ts. Stripe can't reach 127.0.0.1, so a test posts the events to /api/stripe/webhook itself, signed
// with the test server's secret: events it makes up (webhook spec) or real ones read back from the sandbox (`forward`).

const secret = () => process.env.E2E_STRIPE_WEBHOOK_SECRET ?? "";
export const sandboxKey = () => process.env.E2E_STRIPE_SANDBOX_KEY ?? "";

// signing needs no key and makes no call
const offline = new Stripe("sk_test_e2e_offline");

/** Posts `event` to the webhook as Stripe would, signed with `signWith` (the test server's secret unless given). */
export async function postEvent(request: APIRequestContext, event: object, signWith = secret()) {
  const payload = JSON.stringify(event);
  const header = offline.webhooks.generateTestHeaderString({ payload, secret: signWith });
  return request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": header } });
}

/** A made-up Stripe event around `object`, shaped as the webhook reads it. */
export function event(type: string, object: object): object {
  return {
    id: `evt_e2e_${Math.random().toString(36).slice(2)}`,
    object: "event",
    api_version: "2026-11-18.endive",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  };
}

/** A made-up subscription to plan `planId` paid by `billing`, for the account `userId`, named in its metadata as Checkout does. */
export function subscription(o: { id: string; customer: string; status: string; userId: string; planId?: string; billing?: "month" | "year" }): object {
  return {
    id: o.id,
    object: "subscription",
    customer: o.customer,
    status: o.status,
    metadata: { userId: o.userId },
    items: {
      object: "list",
      data: [{ id: `si_${o.id}`, object: "subscription_item", price: { id: `price_${o.id}`, object: "price", metadata: { planId: o.planId ?? "student", billing: o.billing ?? "year" } } }],
    },
  };
}

/**
 * Has `next dev` compile the payment pages and routes before a test needs them. A first compile mid-test reloads the
 * page, which can cut off Continue to payment's request before it answers.
 */
export async function warmUp(playwright: PlaywrightWorkerArgs["playwright"]) {
  test.setTimeout(300_000);
  const request = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
  for (const path of ["/account/setup", "/account", "/plan"]) await request.get(path, { timeout: 120_000 });
  for (const path of ["/api/account/checkout", "/api/account/portal", "/api/stripe/webhook", "/api/account/setup", "/api/auth/email-link", "/api/auth/email-code"]) {
    await request.post(path, { data: "{}", timeout: 120_000 });
  }
  await request.get("/api/account/checkout/done", { maxRedirects: 0, timeout: 120_000 });
  await request.get("/api/account/plan", { timeout: 120_000 });
  await request.get("/api/auth/session", { timeout: 120_000 });
  await request.dispose();
}

/** The sandbox client (only when .env.e2e.local has a test key). */
export const sandbox = () => new Stripe(sandboxKey(), { timeout: 20_000, maxNetworkRetries: 2 });

/** The customer an event is about, whatever its object. */
function customerOf(e: Stripe.Event): string | null {
  const o = e.data.object as { customer?: string | { id: string } | null };
  if (!o.customer) return null;
  return typeof o.customer === "string" ? o.customer : o.customer.id;
}

/** The events a test has sent the webhook so far, by id. */
export type Forwarded = Map<string, Stripe.Event>;

/**
 * Sends the test server every sandbox event about `customer` since `since` (unix seconds) that it hasn't had yet,
 * oldest first, as Stripe would if it could reach the test server. Each must answer 200. Returns the events sent.
 */
export async function forward(request: APIRequestContext, customer: string, since: number, seen: Forwarded): Promise<Stripe.Event[]> {
  const s = sandbox();
  const found: Stripe.Event[] = [];
  for await (const e of s.events.list({ created: { gte: since }, limit: 100 })) {
    if (!seen.has(e.id) && customerOf(e) === customer) found.push(e);
  }
  found.sort((a, b) => a.created - b.created);
  for (const e of found) {
    seen.set(e.id, e);
    const res = await postEvent(request, e);
    expect(res.status(), `webhook on ${e.type} (${e.id}): ${await res.text()}`).toBe(200);
  }
  return found;
}

/** Waits until an event of `type` about `customer` that `where` accepts has been forwarded (now or earlier). */
export async function forwardUntil(
  request: APIRequestContext,
  customer: string,
  since: number,
  seen: Forwarded,
  type: string,
  where: (e: Stripe.Event) => boolean = () => true,
): Promise<Stripe.Event> {
  let hit: Stripe.Event | undefined;
  await expect
    .poll(
      async () => {
        await forward(request, customer, since, seen);
        hit ??= [...seen.values()].find((e) => e.type === type && where(e));
        return !!hit;
      },
      { message: `no ${type} event for ${customer}`, timeout: 90_000, intervals: [2_000, 3_000, 5_000] },
    )
    .toBe(true);
  return hit!;
}

/** The test database (musickit_e2e), to read what the webhook stored. */
export const db = () => postgres(process.env.E2E_DATABASE_URL ?? "", { max: 1, connect_timeout: 10 });

export async function userRow(userId: string) {
  const sql = db();
  try {
    const [row] = await sql<{ stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string | null; plan_id: string | null }[]>`
      select stripe_customer_id, stripe_subscription_id, subscription_status, plan_id from users where id = ${userId}`;
    return row;
  } finally {
    await sql.end();
  }
}

export async function paymentRows(userId: string) {
  const sql = db();
  try {
    return await sql<{ id: string; amount_cents: number; plan_id: string | null; billing: string | null; reason: string | null }[]>`
      select id, amount_cents, plan_id, billing, reason from payments where user_id = ${userId} order by paid_at`;
  } finally {
    await sql.end();
  }
}

export async function planCents(planId: string, billing: "month" | "year"): Promise<number> {
  const sql = db();
  try {
    const [row] = await sql<{ month_cents: number; year_cents: number }[]>`select month_cents, year_cents from plans where id = ${planId}`;
    return billing === "month" ? row.month_cents : row.year_cents;
  } finally {
    await sql.end();
  }
}

export async function trialDays(planId: string): Promise<number> {
  const sql = db();
  try {
    const [row] = await sql<{ trial_days: number }[]>`select trial_days from plans where id = ${planId}`;
    return row.trial_days;
  } finally {
    await sql.end();
  }
}
