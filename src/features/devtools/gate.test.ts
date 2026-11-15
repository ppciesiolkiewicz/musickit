import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { devGate, devOnly, devUi } from "./gate";
import { DEV_TOOLS, shownTools } from "./registry";

test("dev tools are off in production only", () => {
  assert.equal(devOnly({ NODE_ENV: "production" }), false);
  assert.equal(devOnly({ NODE_ENV: "development" }), true);
  assert.equal(devOnly({}), true);
});

test("devGate answers 404 in production and lets dev through", () => {
  assert.equal(devGate({ NODE_ENV: "production" })?.status, 404);
  assert.equal(devGate({ NODE_ENV: "development" }), null);
});

test("devUi is off in production and when NEXT_PUBLIC_DEV_UI=off", () => {
  assert.equal(devUi({ NODE_ENV: "development" }), true);
  assert.equal(devUi({ NODE_ENV: "development", NEXT_PUBLIC_DEV_UI: "off" }), false);
  assert.equal(devUi({ NODE_ENV: "production" }), false);
});

test("a live tool's page sits under (live), every other under (local), so the live site opens only those", () => {
  const dir = path.join(process.cwd(), "src/app/dev");
  for (const t of DEV_TOOLS) {
    const folder = t.live ? "(live)" : "(local)";
    assert.ok(existsSync(path.join(dir, folder, t.href.replace(/^\/dev\//, ""), "page.tsx")), `${t.href} in ${folder}`);
  }
  assert.deepEqual(shownTools(false).map((t) => t.href), ["/dev/compare-models", "/dev/examples", "/dev/stories", "/dev/data"]);
  assert.equal(shownTools(true).length, DEV_TOOLS.length);
  assert.ok(existsSync(path.join(dir, "(local)", "page.tsx")), "the /dev index stays local");
});
