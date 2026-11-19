import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteEmail } from "./emailHtml";

test("inviteEmail: the link is in the text and the HTML, escaped, with the logo from the link's site", () => {
  const link = "https://attunr.app/join/abc?x=1&y=2";
  const mail = inviteEmail(link);
  assert.match(mail.text, /https:\/\/attunr\.app\/join\/abc\?x=1&y=2/);
  assert.ok(mail.html.includes('href="https://attunr.app/join/abc?x=1&amp;y=2"'));
  assert.ok(!mail.html.includes("x=1&y=2"));
  assert.ok(mail.html.includes("https://attunr.app/attunr-transparent.png"));
  assert.ok(mail.html.includes("Open invite"));
  assert.ok(mail.html.includes("You&#39;re") || mail.html.includes("You're"));
});
