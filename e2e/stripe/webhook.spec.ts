import { expect, test, type Page } from "@playwright/test";
import { account, asNewPlayer } from "../helpers/auth";
import { event, postEvent, subscription, userRow, warmUp } from "../helpers/stripe";

// Payments with no Stripe key (E2E7, first half of Paid13): the test signs its own webhook events and posts them, so
// this runs on every release. Run with `npm run e2e:stripe`.

test.beforeAll(async ({ playwright }) => warmUp(playwright));

const ids = () => {
  const r = Math.random().toString(36).slice(2, 10);
  return { customer: `cus_e2e_${r}`, sub: `sub_e2e_${r}` };
};

/** The login guard sends /plan on to /account/setup (it does so in the browser, after reading the session). */
async function heldOnSetup(page: Page) {
  await page.goto("/plan");
  // a dev server's first load of a page can take a while
  await expect(page).toHaveURL(/\/account\/setup/, { timeout: 30_000 });
}

/** /plan opens and stays open once the page has read the session. */
async function letIn(page: Page) {
  await page.goto("/plan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_000);
  await expect(page).not.toHaveURL(/\/account\/setup/);
}

test("a new account on Student must pay: /plan sends it to setup, with Continue to payment", async ({ page }) => {
  const { account: a } = await asNewPlayer(page);
  expect(a.needsPayment).toBe(true);
  expect(a.needsSetup).toBe(true);
  await heldOnSetup(page);
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeVisible();
});

test("a trialing subscription lets it in; a deleted one sends it back to pay", async ({ page }) => {
  const { account: a } = await asNewPlayer(page);
  const { customer, sub } = ids();

  const created = await postEvent(page.request, event("customer.subscription.created", subscription({ id: sub, customer, status: "trialing", userId: a.id })));
  expect(created.status()).toBe(200);
  const row = await userRow(a.id);
  expect(row).toMatchObject({ stripe_customer_id: customer, stripe_subscription_id: sub, subscription_status: "trialing", plan_id: "student" });
  const inTrial = await account(page);
  expect(inTrial.needsPayment).toBe(false);
  expect(inTrial.needsSetup).toBe(false);
  expect(inTrial.subscribed).toBe(true);
  await letIn(page);

  const deleted = await postEvent(page.request, event("customer.subscription.deleted", subscription({ id: sub, customer, status: "canceled", userId: a.id })));
  expect(deleted.status()).toBe(200);
  expect((await userRow(a.id)).subscription_status).toBe("canceled");
  const after = await account(page);
  expect(after).toMatchObject({ needsPayment: true, needsSetup: true });
  await heldOnSetup(page);
});

test("past_due still gives access while Stripe retries the card", async ({ page }) => {
  const { account: a } = await asNewPlayer(page);
  const { customer, sub } = ids();
  await postEvent(page.request, event("customer.subscription.created", subscription({ id: sub, customer, status: "active", userId: a.id })));
  const res = await postEvent(page.request, event("customer.subscription.updated", subscription({ id: sub, customer, status: "past_due", userId: a.id })));
  expect(res.status()).toBe(200);
  expect((await userRow(a.id)).subscription_status).toBe("past_due");
  expect((await account(page)).needsPayment).toBe(false);
});

test("a plan changed in the billing portal moves the account's plan and billing", async ({ page }) => {
  const { account: a } = await asNewPlayer(page);
  const { customer, sub } = ids();
  await postEvent(page.request, event("customer.subscription.created", subscription({ id: sub, customer, status: "active", userId: a.id, billing: "year" })));
  await postEvent(page.request, event("customer.subscription.updated", subscription({ id: sub, customer, status: "active", userId: a.id, billing: "month" })));
  const plan = await page.request.get("/api/account/plan");
  expect(((await plan.json()) as { billing: string }).billing).toBe("month");
});

test("an older cancelled subscription doesn't undo a newer live one", async ({ page }) => {
  const { account: a } = await asNewPlayer(page);
  const { customer } = ids();
  const older = `sub_e2e_old_${Math.random().toString(36).slice(2, 8)}`;
  const newer = `sub_e2e_new_${Math.random().toString(36).slice(2, 8)}`;
  await postEvent(page.request, event("customer.subscription.created", subscription({ id: older, customer, status: "trialing", userId: a.id })));
  await postEvent(page.request, event("customer.subscription.created", subscription({ id: newer, customer, status: "active", userId: a.id })));
  const late = await postEvent(page.request, event("customer.subscription.deleted", subscription({ id: older, customer, status: "canceled", userId: a.id })));
  expect(late.status()).toBe(200);
  expect(await userRow(a.id)).toMatchObject({ stripe_subscription_id: newer, subscription_status: "active" });
  expect((await account(page)).needsPayment).toBe(false);
});

test("an event with a bad signature is refused and changes nothing", async ({ page }) => {
  const { account: a } = await asNewPlayer(page);
  const { customer, sub } = ids();
  const res = await postEvent(page.request, event("customer.subscription.created", subscription({ id: sub, customer, status: "active", userId: a.id })), "whsec_not_the_servers");
  expect(res.status()).toBe(400);
  expect((await userRow(a.id)).subscription_status).toBeNull();
  expect((await account(page)).needsPayment).toBe(true);
});

test("an event with no signature is refused", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", { data: "{}" });
  expect(res.status()).toBe(400);
});

// Paid11: with payments on, setup should drop its open-beta lines. Today SetupForm hides only the No charge line and
// keeps the "Open beta: free while we build it with you" box above Continue to payment. Expected to fail until fixed;
// Playwright reports it when it starts passing, so remove test.fail then.
test("setup shows no open-beta box when payments are on", async ({ page }) => {
  test.fail(true, "Paid11: SetupForm still shows the open-beta box with payments on");
  await asNewPlayer(page);
  await page.goto("/account/setup");
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  await expect(page.getByText("Open beta: free while we build it with you")).toHaveCount(0);
});
