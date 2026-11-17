import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_PLANS, demoCards, demoPlan } from "./demos";

test("every demo slug names a seed plan that parses", () => {
  for (const slug of Object.keys(DEMO_PLANS)) assert.ok(demoPlan(slug), slug);
});

test("cards are easiest first, one per slug", () => {
  const cards = demoCards();
  assert.equal(cards.length, 6);
  const order = ["new", "beginner", "intermediate", "advanced"];
  for (let i = 1; i < cards.length; i++) assert.ok(order.indexOf(cards[i - 1].level) <= order.indexOf(cards[i].level));
});
