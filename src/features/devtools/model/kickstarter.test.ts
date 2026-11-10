import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INPUTS, isReply, outreachBrief, readInputs, SAMPLE_EMAILS, type DemoLink } from "./kickstarter";

const demos: DemoLink[] = [{ label: "Guitar for a beginner", about: "a week of daily exercises", url: "https://x.test/demo/guitar-beginner" }];
const brief = (over = {}) => outreachBrief({ ...DEFAULT_INPUTS, ...over }, demos, "https://x.test/demo");

test("the brief carries the offer, the beta line and every demo link", () => {
  const b = brief();
  for (const word of ["founding partners", "locked in", "90 days", "$360 AUD a year", "change their mind", "100% money-back guarantee", "ABN 48 737 987 261", "at least 20 founding partners", "Australian company", "scheduling", "profiles", "sells it through the attunr website", "/kickstarter", "involved in the creation", "beta", "manage more of a music school", "video call with me, Piotr, the founder", "about 30 minutes", "commits them to nothing", "Never invent a day or a time", "https://calendly.com/attunrapp/30min", "https://calendly.com/attunrapp/attunr", "never both"]) {
    assert.ok(b.includes(word), word);
  }
  assert.ok(b.includes("Guitar for a beginner (a week of daily exercises): https://x.test/demo/guitar-beginner"));
  assert.ok(b.includes("All demos: https://x.test/demo"));
});

test("no thread: a first email with a subject line", () => {
  const b = brief({ thread: "  " });
  assert.ok(!isReply({ ...DEFAULT_INPUTS, thread: "  " }));
  assert.ok(b.includes("first email"));
  assert.ok(b.includes("Subject:"));
  assert.ok(b.includes("The last line offers the call"));
  assert.ok(b.includes("I love music"));
  assert.ok(b.includes("No price, no trial length"));
  assert.ok(!brief({ thread: "x" }).includes("No price, no trial length"));
  assert.ok(!b.includes("our founder"));
  assert.ok(!b.includes("<thread>"));
});

test("a thread: a reply in their language, the thread fenced, the note when given", () => {
  const b = brief({ thread: " Hi Piotr, how much is it? \n— Anna ", note: "offer a call" });
  assert.ok(b.includes("Draft the reply"));
  assert.ok(b.includes("another persona"));
  assert.ok(b.includes("a call with Piotr, our founder"));
  assert.ok(b.includes("don't ask again"));
  assert.ok(!b.includes("Sign it"));
  assert.ok(b.includes("<thread>\nHi Piotr, how much is it? \n— Anna\n</thread>"));
  assert.ok(b.includes("language of their last message"));
  assert.ok(b.includes("## What this email should do\noffer a call"));
  assert.ok(b.includes("[ANSWER:"));
  assert.ok(!brief({ thread: "x" }).includes("What this email should do"));
});

test("the brief carries every sample email, fenced, as a model not a source", () => {
  const b = brief();
  for (const e of SAMPLE_EMAILS) assert.ok(b.includes(`<sample label="${e.label}">\n${e.about}\n\n${e.text}\n</sample>`), e.label);
  assert.ok(b.includes("not their words"));
});

test("readInputs keeps good fields and drops the rest", () => {
  assert.deepEqual(readInputs(null), DEFAULT_INPUTS);
  assert.deepEqual(readInputs({ thread: "A", note: 3, school: "old" }), { thread: "A", note: "" });
});
