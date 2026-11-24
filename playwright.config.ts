import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (TaskSeries E2E in tasks.txt). Run with `npm run e2e` or `npm run e2e:ui`.
// The test server is its own `next dev` on 127.0.0.1 (never localhost: cookies are per host,
// so a login here would replace the session in the user's real browser profile) and on its
// own port, so it runs beside a dev server on :3000. DATABASE_URL is empty: these first
// tests cover the public pages only. Signed-in flows (E2E2-4) need a test database.
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
    command: `npx next dev --webpack -H 127.0.0.1 -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { DATABASE_URL: "" },
  },
});
