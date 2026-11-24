import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_PLANS, demoCards, demoPlan, spreadOverWeek } from "./demos";

test("every demo slug names a seed plan that parses", () => {
  for (const slug of Object.keys(DEMO_PLANS)) assert.ok(demoPlan(slug), slug);
});

test("every demo is three or four practice days, each of two to five exercises", () => {
  for (const slug of Object.keys(DEMO_PLANS)) {
    const days = demoPlan(slug)!.config.days.filter((d) => d.exercises.length > 0);
    assert.ok(days.length === 3 || days.length === 4, `${slug}: ${days.length} days`);
    for (const d of days) assert.ok(d.exercises.length >= 2 && d.exercises.length <= 5, `${slug}: ${d.theme}`);
  }
});

test("cards are easiest first, one per slug", () => {
  const cards = demoCards();
  assert.equal(cards.length, Object.keys(DEMO_PLANS).length);
  assert.equal(cards.filter((c) => c.area === "mixed").length, 3);
  const order = ["new", "beginner", "intermediate", "advanced"];
  for (let i = 1; i < cards.length; i++) assert.ok(order.indexOf(cards[i - 1].level) <= order.indexOf(cards[i].level));
});

test("a demo of three days is laid over a week: today, in 3 days and in 6 days, the days between empty", () => {
  const demo = demoPlan("guitar-beginner")!;
  assert.deepEqual(demo.config.days.map((d) => d.exercises.length > 0), [true, true, false, false, true, false, false]);
  const two = spreadOverWeek({ title: "", days: [demo.config.days[0], demo.config.days[4]] });
  assert.deepEqual(two.days.map((d) => d.exercises.length > 0), [true, false, false, true, false, false, false]);
});
