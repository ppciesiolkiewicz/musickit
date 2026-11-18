import { test } from "node:test";
import assert from "node:assert/strict";
import { claimEmail, claimUrl } from "./mail";

const link = claimUrl("https://attunr.app", "a b+c");

test("claimUrl puts the token in the query, encoded", () => {
  assert.equal(link, "https://attunr.app/claim?token=a%20b%2Bc");
});

test("the email names the teacher, what attunr is, what the link does and how long it works", () => {
  const m = claimEmail("ben@home.com", "Ben", "Tess <Lee>", link, {});
  assert.deepEqual(m.to, ["ben@home.com"]);
  assert.equal(m.from, "attunr <hello@attunr.app>");
  assert.ok(m.subject.includes("Tess <Lee>"));
  for (const part of [m.text, m.html]) {
    assert.ok(part.includes("Ben"));
    assert.ok(part.includes("30 days"));
    assert.ok(!part.replace("<!doctype html>", "").includes("!"));
  }
  assert.ok(m.text.includes(link));
  assert.ok(m.text.includes("Tess <Lee>"));
  assert.ok(m.html.includes(link.replace(/&/g, "&amp;")));
  assert.ok(m.html.includes("Tess &lt;Lee&gt;"), "html escapes the teacher's name");
  assert.ok(!m.html.includes("Tess <Lee>"));
});

test("the sender can be set in the environment", () => {
  assert.equal(claimEmail("a@b.co", "A", "T", link, { AUTH_FROM_EMAIL: "x <x@y.z>" }).from, "x <x@y.z>");
});
