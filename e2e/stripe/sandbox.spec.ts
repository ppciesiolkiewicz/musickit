import { expect, test, type Page } from "@playwright/test";
import { account, newEmail, signIn } from "../helpers/auth";
import { forward, forwardUntil, paymentRows, planCents, sandbox, sandboxKey, trialDays, userRow, warmUp } from "../helpers/stripe";

// Payments against Stripe's sandbox (E2E7, second half of Paid13): our setup page up to Stripe's Checkout, the billing
// portal, the trial ending and a failing card. Runs only with a test key in .env.e2e.local (see playwright.config.ts).
// Stripe can't reach 127.0.0.1, so each test reads its customer's events back from Stripe and posts them to the webhook
// itself.
//
// Stripe's hosted Checkout ignores a Start trial pressed by a script (its bot protection), so by default the test checks
// that Checkout opened, then starts the subscription through Stripe's API as Checkout would: same customer, same price,
// the plan's trial, a test card. To walk the real Checkout page, run headed with E2E_CHECKOUT_BY_HAND=1: the test fills
// the card and waits for you to press Start trial.

test.skip(!sandboxKey(), "no Stripe test key in .env.e2e.local");
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ playwright }) => warmUp(playwright));

const BY_HAND = process.env.E2E_CHECKOUT_BY_HAND === "1";

/** A test card: its number for the Checkout page, and Stripe's ready-made payment method for the API. */
const GOOD_CARD = { number: "4242 4242 4242 4242", method: "pm_card_visa" };
// attaches to the customer, then every charge on it is declined
const DECLINED_LATER = { number: "4000 0000 0000 0341", method: "pm_card_chargeCustomerFail" };
type Card = typeof GOOD_CARD;

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
  await page.getByRole("checkbox", { name: /look after my voice/ }).check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 90_000 });
  return email;
}

/** Fills Stripe's hosted Checkout page with `card`, for a person to press Start trial (E2E_CHECKOUT_BY_HAND). */
async function fillCheckout(page: Page, card: Card) {
  // with more than one payment method Stripe shows them as an accordion; card is closed until picked
  const cardChoice = page.getByTestId("card-accordion-item-button");
  if (await cardChoice.isVisible().catch(() => false)) await cardChoice.click();
  await page.locator("#cardNumber").fill(card.number);
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
}

/**
 * Starts the trial with `card`: on the Checkout page by hand (then back through /api/account/checkout/done), or through
 * the API with the price the Checkout session was for, then the events forwarded so the app hears of it.
 */
async function startTrial(page: Page, card: Card, since: number, seen: Set<string>) {
  const me = await account(page);
  const customer = (await userRow(me.id)).stripe_customer_id;
  expect(customer, "Continue to payment made no Stripe customer").toBeTruthy();
  if (BY_HAND) {
    await fillCheckout(page, card);
    console.log("Press Start trial on the Stripe page (3 minutes).");
    await page.waitForURL((u) => u.host === new URL(test.info().project.use.baseURL!).host, { timeout: 180_000 });
    await page.waitForLoadState("networkidle");
    // checkout/done recorded the subscription before any webhook came
    expect((await userRow(me.id)).subscription_status).toBe("trialing");
  } else {
    const s = sandbox();
    const [session] = (await s.checkout.sessions.list({ customer: customer!, limit: 1 })).data;
    const [line] = (await s.checkout.sessions.listLineItems(session.id, { limit: 1 })).data;
    const pm = await s.paymentMethods.attach(card.method, { customer: customer! });
    await s.subscriptions.create({
      customer: customer!,
      items: [{ price: line.price!.id }],
      trial_period_days: await trialDays("student"),
      default_payment_method: pm.id,
      metadata: { userId: me.id },
    });
    await forwardUntil(page.request, customer!, since, seen, "customer.subscription.created");
    await page.goto("/plan");
  }
  return { me, customer: customer! };
}

test("Checkout with a good card: trial, portal, then the trial ends and the card is charged", async ({ page }) => {
  const since = Math.floor(Date.now() / 1000) - 5;
  const seen = new Set<string>();
  await setUpToCheckout(page);
  const { me, customer } = await startTrial(page, GOOD_CARD, since, seen);
  expect(await account(page)).toMatchObject({ needsPayment: false, needsSetup: false, subscribed: true });
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/account\/setup/);
  const row = await userRow(me.id);
  expect(row.subscription_status).toBe("trialing");
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
  const { me, customer } = await startTrial(page, DECLINED_LATER, since, seen);
  const row = await userRow(me.id);
  expect(row.subscription_status).toBe("trialing");
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
