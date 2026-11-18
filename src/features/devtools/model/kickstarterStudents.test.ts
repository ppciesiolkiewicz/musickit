import { test } from "node:test";
import assert from "node:assert/strict";
import { PRICING } from "@/features/account/pricing";
import { FIRST_STUDENTS, FIRST_STUDENTS_PRICE, STUDENT_PRICE } from "@/lib/studentOffer";
import type { DemoLink } from "./kickstarter";
import { PILLARS, STUDENT_NEVER, STUDENT_OFFER_LINE, STUDENT_TERMS, studentOffer } from "./kickstarterStudents";

const demos: DemoLink[] = [
  { group: "Lead with", label: "Guitar for a beginner", about: "a sample week", url: "https://x.test/demo/guitar-beginner" },
  { group: "For singers", label: "Singing runs", about: "runs with the mic", url: "https://x.test/theory/singing/runs" },
];

test("the offer stands on three pillars: the daily plan, the change, the exercises", () => {
  assert.deepEqual(PILLARS.map((p) => p.title), ["A daily practice plan fitted to you", "The change: a daily habit you can see", "Engaging, interactive exercises"]);
  for (const word of ["friendly", "engaging"]) assert.ok(STUDENT_OFFER_LINE.includes(word), word);
  for (const p of PILLARS) assert.ok(p.promise && p.facts.length, p.title);
});

test("the early price is half the yearly price, for the first 500, with no count and no date", () => {
  assert.equal(FIRST_STUDENTS, 500);
  assert.equal(STUDENT_PRICE, PRICING.player.price);
  assert.equal(FIRST_STUDENTS_PRICE, `$${PRICING.player.priceNumber / 2}`);
  const terms = STUDENT_TERMS.join("\n");
  for (const word of ["free now", `first 500 people`, `${FIRST_STUDENTS_PRICE} a year instead of ${STUDENT_PRICE}`, "locked in", "when paid plans open", "nobody is counted"]) assert.ok(terms.includes(word), word);
});

test("the offer text carries the line, every pillar fact, the terms, what never to say and the pages", () => {
  const o = studentOffer(demos);
  assert.ok(o.includes(STUDENT_OFFER_LINE));
  for (const p of PILLARS) for (const f of [p.title, p.promise, ...p.facts]) assert.ok(o.includes(f), f);
  for (const t of [...STUDENT_TERMS, ...STUDENT_NEVER]) assert.ok(o.includes(t), t);
  assert.ok(o.includes("### Lead with\n1. Guitar for a beginner (a sample week): https://x.test/demo/guitar-beginner"));
  assert.ok(!o.includes("### For guitarists"), "an empty group is left out");
  assert.ok(!studentOffer([]).includes("## Pages to show"));
});

test("the offer says who makes the plan and promises no result", () => {
  const o = studentOffer(demos);
  for (const word of ["No AI writes the plan", "Daily plans are unlimited", "a daily reminder", "no points, no score", "Never a result by a date"]) assert.ok(o.toLowerCase().includes(word.toLowerCase()), word);
});
