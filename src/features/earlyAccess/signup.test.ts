import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSignup, signupPath } from "./signup";

const NOW = Date.UTC(2026, 9, 18, 12, 30, 0);

test("a good email is trimmed and lower-cased, and only known interests are kept", () => {
  const r = parseSignup({ email: "  Jo@Example.COM ", interests: ["basic-course", "nope", "private-lessons"], source: "hero" }, NOW);
  assert.deepEqual(r, { ok: true, signup: { email: "jo@example.com", interests: ["basic-course", "private-lessons"], source: "hero", at: NOW } });
});

test("a bad email is refused", () => {
  for (const email of ["", "jo", "jo@", "jo@example", "a b@c.de", 42]) assert.equal(parseSignup({ email }, NOW).ok, false, String(email));
});

test("a filled honeypot passes quietly as a bot", () => {
  assert.deepEqual(parseSignup({ email: "jo@example.com", website: "spam.biz" }, NOW), { ok: true, bot: true });
});

test("the source is cut down to a short slug", () => {
  const r = parseSignup({ email: "jo@example.com", source: "<script>hero section</script>" }, NOW);
  assert.ok(r.ok && "signup" in r);
  assert.equal(r.signup.source, "scriptherosectionscript");
});

test("non-object bodies are refused", () => {
  assert.equal(parseSignup(null, NOW).ok, false);
  assert.equal(parseSignup("jo@example.com", NOW).ok, false);
});

test("the blob path sorts by time and carries the random tail", () => {
  const r = parseSignup({ email: "jo@example.com" }, NOW);
  assert.ok(r.ok && "signup" in r);
  assert.equal(signupPath(r.signup, "x7"), "early-access/2026-10-18T12-30-00-000Z-x7.json");
});
