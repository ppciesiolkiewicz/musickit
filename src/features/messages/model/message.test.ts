import { test } from "node:test";
import assert from "node:assert/strict";
import { EMAIL_GAP_MS, MAX_SELECTION, isUnread, parseBody, parseContext, preview, shouldEmail } from "./message";

test("a body is trimmed; an empty, missing or too long one is refused", () => {
  assert.deepEqual(parseBody("  hi  "), { ok: true, body: "hi" });
  assert.equal(parseBody("   ").ok, false);
  assert.equal(parseBody(null).ok, false);
  assert.equal(parseBody(42).ok, false);
  assert.equal(parseBody("x".repeat(4001)).ok, false);
  assert.equal(parseBody("x".repeat(4000)).ok, true);
});

test("context keeps what is usable and trims what is too long", () => {
  const c = parseContext({ path: "/plan?day=3", title: "Plan", under: ["Day 3", 7], selection: "x".repeat(10_000), ref: "day-3" });
  assert.ok(c);
  assert.equal(c.path, "/plan?day=3");
  assert.equal(c.title, "Plan");
  assert.deepEqual(c.under, ["Day 3"]);
  assert.equal(c.selection?.length, MAX_SELECTION);
  assert.equal(c.ref, "day-3");
});

test("context drops a path that is not on this site, and junk", () => {
  assert.equal(parseContext({ path: "https://evil.com/x" }), null);
  assert.equal(parseContext({ path: "//evil.com/x" }), null);
  assert.equal(parseContext("nope"), null);
  assert.equal(parseContext({}), null);
  assert.equal(parseContext(null), null);
  assert.equal(parseContext({ path: "/" + "a".repeat(400) })?.path?.length, 300);
});

test("context limits title, headings, ref, source and checks the email", () => {
  const c = parseContext({ title: "t".repeat(200), under: ["a", "b", "c", "d", "e", "h".repeat(100)], ref: "r".repeat(100), source: "s".repeat(100), email: "Jo@Example.com" });
  assert.ok(c);
  assert.equal(c.title?.length, 120);
  assert.deepEqual(c.under, ["a", "b", "c", "d"]);
  assert.equal(c.ref?.length, 80);
  assert.equal(c.source?.length, 80);
  assert.equal(c.email, "jo@example.com");
  assert.equal(parseContext({ title: "x", email: "nope" })?.email, undefined);
});

test("preview is the first line, at most 80 characters", () => {
  assert.equal(preview("line one\nline two"), "line one");
  const p = preview("y".repeat(100));
  assert.equal(p.length, 80);
  assert.ok(p.endsWith("…"));
});

test("unread when the other side wrote after the last read", () => {
  const t1 = new Date(1000), t2 = new Date(2000);
  assert.equal(isUnread(null, null), false);
  assert.equal(isUnread(t2, t1), true);
  assert.equal(isUnread(t1, null), true);
  assert.equal(isUnread(t1, t2), false);
});

test("we are emailed at most once per thread every 10 minutes", () => {
  const now = new Date(Date.UTC(2026, 10, 18, 12));
  assert.equal(EMAIL_GAP_MS, 600_000);
  assert.equal(shouldEmail(null, now), true);
  assert.equal(shouldEmail(new Date(now.getTime() - 9 * 60_000), now), false);
  assert.equal(shouldEmail(new Date(now.getTime() - 10 * 60_000), now), true);
});

test("a path with a backslash, which browsers read as another site, is dropped", () => {
  assert.equal(parseContext({ path: "/\\evil.com" }), null);
  assert.equal(parseContext({ path: "/a\\b" }), null);
});
