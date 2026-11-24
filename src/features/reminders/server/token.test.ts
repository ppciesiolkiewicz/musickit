import { test } from "node:test";
import assert from "node:assert/strict";
import { offPageUrl, offPostUrl, offToken, readOffToken } from "./token";
import { reminderEmail } from "./mail";

test("off token: reads back with its secret only", () => {
  const t = offToken("u1", "s");
  assert.equal(readOffToken(t, "s"), "u1");
  assert.equal(readOffToken(t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"), "s"), null);
  assert.equal(readOffToken(t, "other"), null);
  assert.equal(readOffToken(t, ""), null);
  assert.equal(readOffToken("garbage", "s"), null);
});

test("reminderEmail: words, links and one-click unsubscribe headers", () => {
  const m = reminderEmail("a@b.c", "Today's plan: <b>Scales</b>", "https://x.app", "tok", {});
  assert.equal(m.subject, "Time to practise");
  assert.deepEqual(m.to, ["a@b.c"]);
  assert.ok(m.text.includes("https://x.app/plan") && m.text.includes(offPageUrl("https://x.app", "tok")));
  assert.equal(m.headers["List-Unsubscribe"], `<${offPostUrl("https://x.app", "tok")}>`);
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(m.html.includes("&lt;b&gt;Scales") && !m.html.includes("<b>Scales"));
});
