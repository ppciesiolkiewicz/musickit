import { test } from "node:test";
import assert from "node:assert/strict";
import { reminderDue } from "./reminders";
import { EMPTY_STATE, type PlanConfig, type PlanState, type StoredPlan } from "./model/types";

const ex = { title: "A", minutes: 5, cells: [] };
const planOf = (days: number, startedOn: string): StoredPlan => ({ id: "p", startedOn, done: {}, config: { title: "t", days: Array.from({ length: days }, () => ({ theme: "t", exercises: [ex] })) } as unknown as PlanConfig });
const stateOf = (current: StoredPlan): PlanState => ({ ...EMPTY_STATE, current, reminder: { enabled: true, time: "18:00" } });
const at = (date: string) => new Date(`${date}T19:00:00`);

test("reminderDue: a one-day plan reminds on its day only", () => {
  const s = stateOf(planOf(1, "2026-11-18"));
  assert.equal(reminderDue(s, at("2026-11-18")), true);
  assert.equal(reminderDue(s, at("2026-11-19")), false);
});

test("reminderDue: a seven-day plan reminds through its seventh day, as before", () => {
  const s = stateOf(planOf(7, "2026-11-10"));
  assert.equal(reminderDue(s, at("2026-11-16")), true);
  assert.equal(reminderDue(s, at("2026-11-17")), false);
});
