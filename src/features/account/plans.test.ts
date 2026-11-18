import { test } from "node:test";
import assert from "node:assert/strict";
import { allowanceLabel, bestSavingLabel, bothPricesLabel, canChoose, choosablePlans, TAUGHT_PLAN_ID, modelLabel, priceLabel, pricedWithYou, savingLabel, studentsLabel, trialLabel, yearlyCents, type Plan } from "./plans";

test("a plan with any number of students is priced with the person", () => {
  assert.equal(pricedWithYou({ students: null }), true);
  assert.equal(pricedWithYou({ students: 50 }), false);
  assert.equal(pricedWithYou({ students: 0 }), false);
});

test("plan labels", () => {
  const student = { monthCents: 900, yearCents: 2700 };
  assert.equal(priceLabel(student, "year"), "$27 a year");
  assert.equal(priceLabel({ monthCents: 1250, yearCents: 0 }, "month"), "$12.50 a month");
  assert.equal(bothPricesLabel(student), "$9 a month or $27 a year");
  assert.equal(savingLabel(student), "Save 75%");
  assert.equal(savingLabel({ monthCents: 900, yearCents: 7200 }), "Save 33%");
  assert.equal(savingLabel({ monthCents: 900, yearCents: 10800 }), null);
  assert.equal(bestSavingLabel([{ monthCents: 500, yearCents: 5000 }, { monthCents: 1500, yearCents: 15000 }]), "Save 17%");
  assert.equal(bestSavingLabel([student, { monthCents: 900, yearCents: 7200 }]), "Save up to 75%");
  assert.equal(bestSavingLabel([{ monthCents: 900, yearCents: 10800 }]), null);
  assert.equal(yearlyCents(student, "month"), 10800);
  assert.equal(trialLabel({ trialDays: 14 }), "14-day free trial, cancel any time");
  assert.equal(trialLabel({ trialDays: 0 }), null);
  assert.equal(allowanceLabel({ autoplansPerMonth: 8 }), "8 AI autoplans a month, or 24 AI notes");
  assert.equal(studentsLabel({ students: 10 }), "Up to 10 active students a month");
  assert.equal(studentsLabel({ students: null }), "Any number of students");
  assert.equal(studentsLabel({ students: 0 }), null);
  assert.equal(modelLabel("claude-sonnet-5-5"), "Sonnet 5.5");
  assert.equal(modelLabel("gpt"), "gpt");
});

test("a plan can be chosen paid either way; the one you are on only the other way, even turned off", () => {
  const base = { role: "student", students: 0, extraStudents: 0, autoplansPerMonth: 8, batch: false, monthCents: 900, yearCents: 2700, trialDays: 14, sort: 0 } as const;
  const plans: Plan[] = [{ ...base, id: "a", name: "A", enabled: true }, { ...base, id: "old", name: "Old", enabled: false }];
  const none = { planId: null, billing: "year" } as const;
  assert.equal(canChoose(plans, none, "a", "month")?.id, "a");
  assert.equal(canChoose(plans, none, "a", "week"), null);
  assert.equal(canChoose(plans, none, "old", "year"), null);
  assert.equal(canChoose(plans, { planId: "a", billing: "year" }, "a", "year"), null);
  assert.equal(canChoose(plans, { planId: "old", billing: "year" }, "old", "month")?.id, "old");
});

test("the taught plan is never offered to someone who is not on it", () => {
  const plan = (id: string, enabled: boolean): Plan => ({ id, name: id, role: "student", monthCents: 0, yearCents: 0, trialDays: 0, students: 0, extraStudents: 0, autoplansPerMonth: 0, batch: false, enabled, sort: 0 });
  const all = [plan("student", true), plan(TAUGHT_PLAN_ID, false)];
  assert.equal(TAUGHT_PLAN_ID, "taught");
  assert.deepEqual(choosablePlans(all, "student").map((p) => p.id), ["student"]);
  assert.deepEqual(choosablePlans(all, null).map((p) => p.id), ["student"]);
  assert.deepEqual(choosablePlans(all, TAUGHT_PLAN_ID).map((p) => p.id), ["student", "taught"]);
});
