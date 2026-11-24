import { expect, test } from "@playwright/test";

// Public pages load, draw a heading, log no errors and don't scroll sideways (E2E5).
const PAGES = ["/", "/players", "/faq", "/terms", "/privacy", "/demo", "/login"];

for (const path of PAGES) {
  test(`${path} loads cleanly`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    const res = await page.goto(path);
    expect(res?.status(), "HTTP status").toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal scroll in px").toBeLessThanOrEqual(0);
    expect(errors, "console errors").toEqual([]);
  });
}
