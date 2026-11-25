import { defineConfig, devices } from "@playwright/test";

import { parseEnv } from "node:util";
import { existsSync, readFileSync } from "node:fs";

// The test server's settings, passed to it as env vars, which win over .env and .env.local.
const e2eEnv = parseEnv(readFileSync(".env.e2e", "utf8")) as Record<string, string>;
const DATABASE_URL = e2eEnv.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost):/.test(DATABASE_URL)) throw new Error("e2e needs a local DATABASE_URL (see .env.e2e)");

// End-to-end tests (TaskSeries E2E in tasks.txt). Run with `npm run e2e` or `npm run e2e:ui`.
// The test server is its own `next dev` on 127.0.0.1 (never localhost: cookies are per host,
// so a login here would replace the session in the user's real browser profile) and on its
// own port and build folder (.next-e2e), so it runs beside a dev server on :3000. Its database is
// musickit_e2e in the local Docker Postgres (.env.e2e), migrated before the server starts.
//
// Payments (E2E7, Paid13 in launch-checks.txt): `npm run e2e:stripe` sets E2E_STRIPE=1 and runs only e2e/stripe, on a
// second server with STRIPE_ENABLED=true (its own port and build folder: payments on changes /account/setup for every
// other test, so the two never share a server). The webhook spec signs its own events with STRIPE_WEBHOOK_SECRET below
// and needs no key. The sandbox spec runs only with a Stripe test key in .env.e2e.local (git ignores it):
//   STRIPE_SECRET_KEY=sk_test_…            (or rk_test_…; a live key is refused)
//   STRIPE_EARLY_COUPON=…                  (optional)
const STRIPE = process.env.E2E_STRIPE === "1";
const local = existsSync(".env.e2e.local") ? (parseEnv(readFileSync(".env.e2e.local", "utf8")) as Record<string, string>) : {};
const sandboxKey = local.STRIPE_SECRET_KEY ?? "";
if (sandboxKey && !/^(sk|rk)_test_/.test(sandboxKey)) throw new Error("e2e takes only a Stripe test key (sk_test_ or rk_test_) in .env.e2e.local");

// Only events these tests sign themselves reach the test server, so the secret needn't be Stripe's.
const WEBHOOK_SECRET = "whsec_e2e_signed_by_the_tests";
// The server needs some key to check signatures; with no sandbox key nothing it calls reaches Stripe in the webhook spec.
const OFFLINE_KEY = "sk_test_e2e_offline";

// The spec files read these (the config runs in every worker before the tests).
process.env.E2E_DATABASE_URL = DATABASE_URL;
process.env.E2E_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.E2E_STRIPE_SANDBOX_KEY = sandboxKey;

const PORT = Number(process.env.E2E_PORT ?? (STRIPE ? 3211 : 3210));
const baseURL = `http://127.0.0.1:${PORT}`;
// the payments server's Stripe API: a stand-in that knows the webhook spec's made-up subscriptions and passes the rest
// on to Stripe (e2e/helpers/fake-stripe.mjs)
const FAKE_STRIPE_PORT = PORT + 1;
const FAKE_STRIPE_URL = `http://127.0.0.1:${FAKE_STRIPE_PORT}`;
process.env.E2E_FAKE_STRIPE_URL = FAKE_STRIPE_URL;

const payments = STRIPE
  ? {
      STRIPE_ENABLED: "true",
      STRIPE_SECRET_KEY: sandboxKey || OFFLINE_KEY,
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      STRIPE_EARLY_COUPON: local.STRIPE_EARLY_COUPON ?? "",
      STRIPE_API_URL: FAKE_STRIPE_URL,
    }
  : // payments off, whatever .env.local says
    { STRIPE_ENABLED: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", STRIPE_EARLY_COUPON: "", STRIPE_API_URL: "" };

const appServer = {
  command: `node scripts/db-migrate.mjs && npx next dev --webpack -H 127.0.0.1 -p ${PORT}`,
  url: baseURL,
  reuseExistingServer: false,
  timeout: 180_000,
  // AUTH_URL: the address in mailed links and in Stripe's return address. Without it `next dev` names itself
  // localhost, whose cookies aren't 127.0.0.1's, so a person coming back from Checkout would be signed out.
  env: { ...e2eEnv, ...payments, AUTH_URL: baseURL, NEXT_DIST_DIR: STRIPE ? ".next-e2e-stripe" : ".next-e2e", E2E: "1" },
};
const fakeStripe = {
  command: "node e2e/helpers/fake-stripe.mjs",
  url: `${FAKE_STRIPE_URL}/__e2e/health`,
  reuseExistingServer: false,
  timeout: 30_000,
  env: { FAKE_STRIPE_PORT: String(FAKE_STRIPE_PORT) },
};

export default defineConfig({
  testDir: STRIPE ? "e2e/stripe" : "e2e",
  testIgnore: STRIPE ? [] : ["stripe/**"],
  // the sandbox tests wait on Stripe's pages and events
  timeout: STRIPE ? 180_000 : 60_000,
  fullyParallel: !STRIPE,
  // payments: one at a time, so the dev server isn't compiling for one test while another fills a form
  workers: STRIPE ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: STRIPE ? "playwright-report-stripe" : "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: STRIPE
    ? // one browser: every sandbox run makes customers and subscriptions in Stripe
      [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        {
          name: "phone",
          use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
        },
      ],
  webServer: STRIPE ? [fakeStripe, appServer] : appServer,
});
