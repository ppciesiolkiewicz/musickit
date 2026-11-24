import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_PLANS, demoCards, demoPlan, spreadOverWeek } from "./demos";

test("every demo slug names a seed plan that parses", () => {
  for (const slug of Object.keys(DEMO_PLANS)) assert.ok(demoPlan(slug), slug);
});

test("cards are easiest first, one per slug", () => {
  const cards = demoCards();
  assert.equal(cards.length, 6);
  const order = ["new", "beginner", "intermediate", "advanced"];
  for (let i = 1; i < cards.length; i++) assert.ok(order.indexOf(cards[i - 1].level) <= order.indexOf(cards[i].level));
});

test("a demo of three days is laid over a week: today, in 3 days and in 6 days, the days between empty", () => {
  const demo = demoPlan("guitar-beginner")!;
  assert.deepEqual(demo.config.days.map((d) => d.exercises.length > 0), [true, false, false, true, false, false, true]);
  const two = spreadOverWeek({ title: "", days: [demo.config.days[0], demo.config.days[3]] });
  assert.deepEqual(two.days.map((d) => d.exercises.length > 0), [true, false, false, false, false, false, true]);
});
