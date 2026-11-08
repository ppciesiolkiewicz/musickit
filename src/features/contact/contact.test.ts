import { test } from "node:test";
import assert from "node:assert/strict";
import { contactEmail, contactPath, contactTo, parseContact } from "./contact";

const NOW = Date.UTC(2026, 10, 8, 12, 0, 0);

test("a good message is trimmed and the email lower-cased", () => {
  const r = parseContact({ email: " Jo@Example.COM ", message: "  Hi there  ", source: "schools" }, NOW);
  assert.deepEqual(r, { ok: true, contact: { email: "jo@example.com", message: "Hi there", source: "schools", at: NOW } });
});

test("a bad email or an empty or huge message is refused", () => {
  assert.equal(parseContact({ email: "jo", message: "hi" }, NOW).ok, false);
  assert.equal(parseContact({ email: "jo@example.com", message: "   " }, NOW).ok, false);
  assert.equal(parseContact({ email: "jo@example.com", message: "x".repeat(4001) }, NOW).ok, false);
  assert.equal(parseContact(null, NOW).ok, false);
});

test("a filled honeypot passes quietly as a bot", () => {
  assert.deepEqual(parseContact({ email: "jo@example.com", message: "hi", website: "spam.biz" }, NOW), { ok: true, bot: true });
});

test("the email goes to attunrapp@gmail.com unless overridden, replying to the sender", () => {
  const r = parseContact({ email: "jo@example.com", message: "Hello", source: "schools" }, NOW);
  assert.ok(r.ok && "contact" in r);
  const mail = contactEmail(r.contact, {});
  assert.deepEqual(mail.to, ["attunrapp@gmail.com"]);
  assert.equal(mail.reply_to, "jo@example.com");
  assert.equal(mail.from, "attunr <hello@attunr.app>");
  assert.match(mail.text, /Hello/);
  assert.equal(contactTo({ CONTACT_TO_EMAIL: "me@x.io" }), "me@x.io");
  assert.match(contactPath(r.contact, "abc123"), /^contact\/2026-11-08T12-00-00-000Z-abc123\.json$/);
});
