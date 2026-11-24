import { expect, test } from "@playwright/test";

// Public pages load, draw a heading, log no errors and don't scroll sideways (E2E5).
const PAGES = ["/", "/players", "/faq", "/terms", "/privacy", "/demo", "/login"];

// Known: NoControlFocus sets tabindex="-1" on buttons before streamed parts of the page
// hydrate, so React reports a mismatch whose only server-only attribute is tabindex.
// Any other mismatch still fails the test.
function isKnownTabindexMismatch(text: string): boolean {
  if (!text.includes("hydrated but some attributes")) return false;
  const serverOnly = text.split("\n").filter((l) => /^\s*-\s+[\w-]+=/.test(l));
  return serverOnly.length > 0 && serverOnly.every((l) => /^\s*-\s+tabindex="-1"\s*$/.test(l));
}

for (const path of PAGES) {
  test(`${path} loads cleanly`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !isKnownTabindexMismatch(m.text())) errors.push(m.text());
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
