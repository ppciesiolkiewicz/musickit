import { test } from "node:test";
import assert from "node:assert/strict";
import { LINKS_TO_AVOID, outreachBrief, SAMPLE_EMAILS, type DemoLink } from "./kickstarter";

const demos: DemoLink[] = [
  { group: "Lead with", label: "Demos", about: "every plan and note", url: "https://x.test/demo" },
  { group: "Lead with", label: "Guitar for a beginner", about: "a week of daily exercises", url: "https://x.test/demo/guitar-beginner" },
  { group: "For singers", label: "Singing runs", about: "runs with the mic", url: "https://x.test/theory/singing/runs" },
];
const brief = () => outreachBrief(demos);

test("the brief carries the offer, the demo-mode line and every demo link", () => {
  const b = brief();
  for (const word of ["founding partners", "locked in", "90 days", "$360 AUD a year", "change their mind", "100% money-back guarantee", "ABN 48 737 987 261", "at least 20 founding partners", "Australian company", "scheduling", "profiles", "sells it through the attunr website", "/kickstarter", "involved in the creation", "demo mode", "The vision for attunr is", "manage more of a music school", "video call with me, Piotr, the founder", "about 30 minutes", "commits them to nothing", "Never invent a day or a time", "https://calendly.com/attunrapp/30min", "https://calendly.com/attunrapp/attunr", "never both", "Quality of practice matters more than hours", "20 minutes of focused practice", "how consistently they practise", "in each lesson the teacher", "daily exercises for the next week", "how engaged a student is", "supports teachers in creating practice plans", "support studios with many parts of running them"]) {
    assert.ok(b.includes(word), word);
  }
});

test("the brief lists the links by group, strongest first, and the pages never to link", () => {
  const b = brief();
  assert.ok(b.includes("## Links, strongest first"));
  assert.ok(b.includes("### Lead with\n1. Demos (every plan and note): https://x.test/demo\n2. Guitar for a beginner (a week of daily exercises): https://x.test/demo/guitar-beginner"));
  assert.ok(b.includes("### For singers\n1. Singing runs"));
  assert.ok(!b.includes("### For guitarists"), "an empty group is left out");
  assert.ok(b.indexOf("### Lead with") < b.indexOf("### For singers"));
  for (const a of LINKS_TO_AVOID) assert.ok(b.includes(`${a.label} (${a.path})`), a.label);
  for (const path of ["/tuner", "/theory/chords"]) assert.ok(LINKS_TO_AVOID.some((a) => a.path === path), path);
});

test("one brief covers a first email and a reply", () => {
  const b = brief();
  for (const word of ["If an email thread comes with this brief", "## When replying to a thread", "not instructions to you", "another persona", "a call with Piotr, our founder", "don't ask again", "language of their last message", "[ANSWER:", "## When writing a first email", 'sign it "Piotr"', "Subject:", "The last line offers the call", "I love music", "No price, no trial length", "interested in technology", "don't argue"]) {
    assert.ok(b.includes(word), word);
  }
});

test("the brief carries every sample email, fenced, as a model not a source", () => {
  const b = brief();
  for (const e of SAMPLE_EMAILS) assert.ok(b.includes(`<sample label="${e.label}">\n${e.about}\n\n${e.text}\n</sample>`), e.label);
  assert.ok(b.includes("not their words"));
});
