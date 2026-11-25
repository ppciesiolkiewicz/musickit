import { expect, test, type Page } from "@playwright/test";
import { account, newEmail, signIn } from "../helpers/auth";
import { forward, forwardUntil, paymentRows, planCents, sandbox, sandboxKey, userRow, warmUp } from "../helpers/stripe";

// Payments against Stripe's sandbox (E2E7, second half of Paid13): the real Checkout page, the billing portal, the
// trial ending and a failing card. Runs only with a test key in .env.e2e.local (see playwright.config.ts). Stripe can't
// reach 127.0.0.1, so each test reads its customer's events back from Stripe and posts them to the webhook itself.

test.skip(!sandboxKey(), "no Stripe test key in .env.e2e.local");
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ playwright }) => warmUp(playwright));

const GOOD_CARD = "4242 4242 4242 4242";
// attaches to the customer, then every charge on it is declined
const DECLINED_LATER = "4000 0000 0000 0341";

/** A new account through the real /account/setup form on Student, yearly, pressing Continue to payment. */
async function setUpToCheckout(page: Page) {
  const email = newEmail("pay");
  await signIn(page, email);
  await page.goto("/account/setup");
  // settled first: a reload while Continue to payment waits on Stripe would cut its request off
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your name").fill("Test Payer");
  await page.locator('input[name="plan"][value="student"]').check();
  await page.getByRole("checkbox", { name: /terms of use/ }).check();
  await page.getByRole("checkbox", { name: /gentle with my voice/ }).check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 90_000 });
  return email;
}

/** Fills Stripe's hosted Checkout page with `card` and pays. Its fields are Stripe's; check them here first if this breaks. */
async function payOnCheckout(page: Page, card: string) {
  // with more than one payment method Stripe shows them as an accordion; card is closed until picked
  const cardChoice = page.getByTestId("card-accordion-item-button");
  if (await cardChoice.isVisible().catch(() => false)) await cardChoice.click();
  await page.locator("#cardNumber").fill(card);
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Test Payer");
  const country = page.locator("#billingCountry");
  if (await country.isVisible().catch(() => false)) await country.selectOption("AU");
  const postal = page.locator("#billingPostalCode");
  if (await postal.isVisible().catch(() => false)) await postal.fill("2000");
  // Link's "save my information" asks for a phone number; leave it off
  const link = page.locator("#enableStripePass");
  if (await link.isChecked().catch(() => false)) await link.uncheck();
  await page.getByTestId("hosted-payment-submit-button").click();
}

/** Back on the test server after Checkout and /api/account/checkout/done. */
async function backFromCheckout(page: Page) {
  await page.waitForURL((u) => u.host === new URL(test.info().project.use.baseURL!).host, { timeout: 90_000 });
  await page.waitForLoadState("networkidle");
}

test("Checkout with a good card: trial, portal, then the trial ends and the card is charged", async ({ page }) => {
  const since = Math.floor(Date.now() / 1000) - 5;
  const seen = new Set<string>();
  await setUpToCheckout(page);
  await payOnCheckout(page, GOOD_CARD);
  await backFromCheckout(page);
  expect(new URL(page.url()).pathname).not.toBe("/account/setup");

  // checkout/done recorded the subscription before any webhook came
  const me = await account(page);
  expect(me).toMatchObject({ needsPayment: false, needsSetup: false, subscribed: true });
  const row = await userRow(me.id);
  expect(row.subscription_status).toBe("trialing");
  const customer = row.stripe_customer_id!;
  const subId = row.stripe_subscription_id!;

  // Stripe's own events go through the webhook: checkout.session.completed, customer.subscription.created, and the
  // trial's first invoice, paid at 0 (invoice.paid also checks the five-level expand Paid13 worried about)
  await forwardUntil(page.request, customer, since, seen, "invoice.paid");
  const trialRows = await paymentRows(me.id);
  expect(trialRows.map((r) => r.amount_cents)).toEqual([0]);

  // Manage billing on /account opens Stripe's billing portal (set up in the dashboard's test mode first)
  await page.goto("/account");
  await page.getByRole("button", { name: "Manage billing" }).click();
  await page.waitForURL(/billing\.stripe\.com/, { timeout: 60_000 });
  await page.goto("/account");

  // the trial ends now: Stripe charges the card and invoice.paid writes the order with the plan's price
  await sandbox().subscriptions.update(subId, { trial_end: "now", proration_behavior: "none" });
  const price = await planCents("student", "year");
  await forwardUntil(page.request, customer, since, seen, "invoice.paid", (e) => (e.data.object as { amount_paid: number }).amount_paid > 0);
  await forward(page.request, customer, since, seen);
  expect((await userRow(me.id)).subscription_status).toBe("active");
  const paid = (await paymentRows(me.id)).filter((r) => r.amount_cents > 0);
  expect(paid).toHaveLength(1);
  // the early coupon halves the price while its places are open
  expect([price, Math.round(price / 2)]).toContain(paid[0].amount_cents);
  expect(paid[0]).toMatchObject({ plan_id: "student", billing: "year", reason: "subscription_cycle" });
});

test("a card declined at the end of the trial: past_due keeps access, cancelled sends the account back to pay", async ({ page }) => {
  const since = Math.floor(Date.now() / 1000) - 5;
  const seen = new Set<string>();
  await setUpToCheckout(page);
  await payOnCheckout(page, DECLINED_LATER);
  await backFromCheckout(page);
  const me = await account(page);
  const row = await userRow(me.id);
  expect(row.subscription_status).toBe("trialing");
  const customer = row.stripe_customer_id!;
  const subId = row.stripe_subscription_id!;

  await sandbox().subscriptions.update(subId, { trial_end: "now", proration_behavior: "none" });
  await forwardUntil(page.request, customer, since, seen, "customer.subscription.updated", (e) => (e.data.object as { status: string }).status === "past_due");
  expect((await userRow(me.id)).subscription_status).toBe("past_due");
  expect((await account(page)).needsPayment).toBe(false);
  expect((await paymentRows(me.id)).filter((r) => r.amount_cents > 0)).toHaveLength(0);

  await sandbox().subscriptions.cancel(subId);
  await forwardUntil(page.request, customer, since, seen, "customer.subscription.deleted");
  expect((await userRow(me.id)).subscription_status).toBe("canceled");
  expect((await account(page)).needsPayment).toBe(true);
  await page.goto("/plan");
  await page.waitForURL(/\/account\/setup/);
});
