import { test } from "@playwright/test";
test("probe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo"); await page.waitForLoadState("networkidle");
  const r = await page.evaluate(() => [...document.querySelectorAll("*")].filter(e => e.getBoundingClientRect().right > 390.5).map(e => `${e.tagName}.${(e.className+"").slice(0,120)} r=${e.getBoundingClientRect().right} t=${(e.textContent||"").slice(0,50)}`).slice(0,25));
  console.log(r.join("\n"));
});
