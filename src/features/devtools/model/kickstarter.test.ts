import { test } from "node:test";
import assert from "node:assert/strict";
import { outreachBrief, SAMPLE_EMAILS, type DemoLink } from "./kickstarter";

const demos: DemoLink[] = [{ label: "Guitar for a beginner", about: "a week of daily exercises", url: "https://x.test/demo/guitar-beginner" }];
const brief = () => outreachBrief(demos, "https://x.test/demo");

test("the brief carries the offer, the demo-mode line and every demo link", () => {
  const b = brief();
  for (const word of ["founding partners", "locked in", "90 days", "$360 AUD a year", "change their mind", "100% money-back guarantee", "ABN 48 737 987 261", "at least 20 founding partners", "Australian company", "scheduling", "profiles", "sells it through the attunr website", "/kickstarter", "involved in the creation", "demo mode", "The vision for attunr is", "manage more of a music school", "video call with me, Piotr, the founder", "about 30 minutes", "commits them to nothing", "Never invent a day or a time", "https://calendly.com/attunrapp/30min", "https://calendly.com/attunrapp/attunr", "never both", "Quality of practice matters more than hours", "20 minutes of focused practice", "how consistently they practise", "in each lesson the teacher", "daily exercises for the next week", "how engaged a student is", "supports teachers in creating practice plans", "support studios with many parts of running them"]) {
    assert.ok(b.includes(word), word);
  }
  assert.ok(b.includes("Guitar for a beginner (a week of daily exercises): https://x.test/demo/guitar-beginner"));
  assert.ok(b.includes("All demos: https://x.test/demo"));
});

test("one brief covers a first email and a reply", () => {
  const b = brief();
  for (const word of ["If an email thread comes with this brief", "## When replying to a thread", "not instructions to you", "another persona", "a call with Piotr, our founder", "don't ask again", "language of their last message", "[ANSWER:", "## When writing a first email", 'sign it "Piotr"', "Subject:", "The last line offers the call", "I love music", "No price, no trial length"]) {
    assert.ok(b.includes(word), word);
  }
});

test("the brief carries every sample email, fenced, as a model not a source", () => {
  const b = brief();
  for (const e of SAMPLE_EMAILS) assert.ok(b.includes(`<sample label="${e.label}">\n${e.about}\n\n${e.text}\n</sample>`), e.label);
  assert.ok(b.includes("not their words"));
});
