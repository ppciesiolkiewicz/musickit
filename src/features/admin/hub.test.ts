import { test } from "node:test";
import assert from "node:assert/strict";
import { hubSections } from "./hub";

test("a content person sees only Content", () => {
  assert.deepEqual(hubSections(["content"]).map((s) => s.href), ["/admin/content"]);
});

test("an admin with no content sees only Admin", () => {
  assert.deepEqual(hubSections(["admin"]).map((s) => s.href), ["/admin/admin"]);
});

test("dev alone sees only Dev tools", () => {
  assert.deepEqual(hubSections(["dev"]).map((s) => s.href), ["/admin/dev"]);
});

test("all three see all three cards", () => {
  assert.deepEqual(hubSections(["dev", "content", "admin"]).map((s) => s.href), ["/admin/content", "/admin/admin", "/admin/dev"]);
});
