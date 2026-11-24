import { defineConfig, devices } from "@playwright/test";

import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";

// The test server's settings, passed to it as env vars, which win over .env and .env.local.
const e2eEnv = parseEnv(readFileSync(".env.e2e", "utf8")) as Record<string, string>;
const DATABASE_URL = e2eEnv.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost):/.test(DATABASE_URL)) throw new Error("e2e needs a local DATABASE_URL (see .env.e2e)");

// End-to-end tests (TaskSeries E2E in tasks.txt). Run with `npm run e2e` or `npm run e2e:ui`.
// The test server is its own `next dev` on 127.0.0.1 (never localhost: cookies are per host,
// so a login here would replace the session in the user's real browser profile) and on its
// own port and build folder (.next-e2e), so it runs beside a dev server on :3000. Its database is
// musickit_e2e in the local Docker Postgres (.env.e2e), migrated before the server starts.
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "phone",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: `node scripts/db-migrate.mjs && npx next dev --webpack -H 127.0.0.1 -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ...e2eEnv, NEXT_DIST_DIR: ".next-e2e", E2E: "1" },
  },
});
