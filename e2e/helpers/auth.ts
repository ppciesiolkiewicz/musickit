import { expect, type Page } from "@playwright/test";

// Signing in for tests (E2E2): the real sign-in, by the emailed code. The test server has no RESEND_API_KEY (.env.e2e),
// so POST /api/auth/email-link answers the code itself (`devCode`, development only), and POST /api/auth/email-code
// spends it. The session cookie lands in the page's browser context, as it would for a person.

export interface TestAccount {
  id: string;
  email: string;
  needsSetup: boolean;
  needsPayment?: boolean;
  subscribed?: boolean;
}

/** An email no other test or run uses, at example.com (never mailed: the test server sends no email). */
export const newEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

/** Signs the page in as `email`, making the account when it has none. */
export async function signIn(page: Page, email: string): Promise<TestAccount> {
  const link = await page.request.post("/api/auth/email-link", { data: { email } });
  expect(link.ok(), `email-link: ${await link.text()}`).toBe(true);
  const { devCode } = (await link.json()) as { devCode?: string };
  expect(devCode, "no devCode: is RESEND_API_KEY empty on the test server?").toMatch(/^\d{6}$/);
  const code = await page.request.post("/api/auth/email-code", { data: { email, code: devCode } });
  expect(code.ok(), `email-code: ${await code.text()}`).toBe(true);
  return account(page);
}

/** The signed-in account, as the app sees it now. */
export async function account(page: Page): Promise<TestAccount> {
  const res = await page.request.get("/api/auth/session");
  const { account } = (await res.json()) as { account: TestAccount | null };
  expect(account, "not signed in").not.toBeNull();
  return account!;
}

/** A new account, signed in, that has chosen `planId` on /account/setup (through its API, not the form). */
export async function asNewPlayer(page: Page, plan: { planId: string; billing: "month" | "year" } = { planId: "student", billing: "year" }, tag = "player") {
  const email = newEmail(tag);
  await signIn(page, email);
  const res = await page.request.post("/api/account/setup", {
    data: { name: "Test Player", planId: plan.planId, billing: plan.billing, emailUpdates: false, acceptTerms: true, reminder: { enabled: false, time: "18:00", zone: "UTC" } },
  });
  expect(res.ok(), `setup: ${await res.text()}`).toBe(true);
  return { email, account: await account(page) };
}
