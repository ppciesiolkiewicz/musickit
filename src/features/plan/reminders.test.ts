import { test } from "node:test";
import assert from "node:assert/strict";
import { reminderBody, reminderDue } from "./reminders";
import { DEFAULT_ANSWERS } from "./intake/answers";
import { EMPTY_STATE, type PlanConfig, type PlanState, type StoredPlan } from "./model/types";

const ex = { title: "A", minutes: 5, cells: [] };
const dayPlan = (startedOn: string, done = false): StoredPlan => ({
  id: "p", startedOn, done: done ? { "0:0": true } : {}, composed: { attempt: 0, declined: [], short: false },
  config: { title: "t", days: [{ theme: "Scales", exercises: [ex] }] } as unknown as PlanConfig,
});
const stateOf = (current: StoredPlan | null, answers = true, more: Partial<PlanState["reminder"]> = {}): PlanState =>
  ({ ...EMPTY_STATE, answers: answers ? DEFAULT_ANSWERS : null, current, reminder: { enabled: true, time: "18:00", ...more } });
const at = (date: string, time = "19:00") => new Date(`${date}T${time}:00`);

test("reminderDue: with answers and no plan for today yet (yesterday's is current), it is due", () => {
  assert.equal(reminderDue(stateOf(null), at("2026-11-18")), true);
  assert.equal(reminderDue(stateOf(dayPlan("2026-11-17", true)), at("2026-11-18")), true);
});

test("reminderDue: today's plan not finished is due; finished is not", () => {
  assert.equal(reminderDue(stateOf(dayPlan("2026-11-18")), at("2026-11-18")), true);
  assert.equal(reminderDue(stateOf(dayPlan("2026-11-18", true)), at("2026-11-18")), false);
});

test("reminderDue: never without answers, switched off, before its time or once shown today", () => {
  assert.equal(reminderDue(stateOf(null, false), at("2026-11-18")), false);
  assert.equal(reminderDue(stateOf(null, true, { enabled: false }), at("2026-11-18")), false);
  assert.equal(reminderDue(stateOf(null), at("2026-11-18", "17:59")), false);
  assert.equal(reminderDue(stateOf(null, true, { lastShownOn: "2026-11-18" }), at("2026-11-18")), false);
});

test("reminderBody: names today's plan when it is there, and says the page makes it when it isn't", () => {
  assert.equal(reminderBody(stateOf(dayPlan("2026-11-18")), at("2026-11-18")), "Today's plan: Scales");
  assert.equal(reminderBody(stateOf(dayPlan("2026-11-17")), at("2026-11-18")), "Open the plan page, and attunr puts today's plan together.");
});
