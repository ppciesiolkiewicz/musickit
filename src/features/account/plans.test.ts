import { test } from "node:test";
import assert from "node:assert/strict";
import { allowanceLabel, modelLabel, priceLabel, studentsLabel } from "./plans";

test("plan labels", () => {
  assert.equal(priceLabel({ priceCents: 2700, period: "year" }), "$27 a year");
  assert.equal(priceLabel({ priceCents: 1250, period: "month" }), "$12.50 a month");
  assert.equal(allowanceLabel({ autoplansPerMonth: 8 }), "8 AI autoplans a month, or 24 AI notes");
  assert.equal(studentsLabel({ students: 10 }), "Up to 10 students");
  assert.equal(studentsLabel({ students: null }), "Any number of students");
  assert.equal(studentsLabel({ students: 0 }), null);
  assert.equal(modelLabel("claude-sonnet-5-5"), "Sonnet 5.5");
  assert.equal(modelLabel("gpt"), "gpt");
});
