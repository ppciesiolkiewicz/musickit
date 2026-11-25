import { test } from "node:test";
import assert from "node:assert/strict";
import { planWantsReminder, reminderBody } from "./reminder";
import { DEFAULT_ANSWERS } from "../intake/answers";
import { EMPTY_STATE, type PlanConfig, type PlanState, type StoredPlan } from "./types";

const ex = { title: "A", minutes: 5, cells: [] };
const dayPlan = (startedOn: string, done = false): StoredPlan => ({
  id: "p", startedOn, done: done ? { "0:0": true } : {}, composed: { attempt: 0, declined: [], short: false },
  config: { title: "t", days: [{ theme: "Scales", exercises: [ex] }] } as unknown as PlanConfig,
});
const stateOf = (current: StoredPlan | null, answers = true): PlanState => ({ ...EMPTY_STATE, answers: answers ? DEFAULT_ANSWERS : null, current });
const teacherWeek = (startedOn: string, done: Record<string, true> = {}): StoredPlan => ({
  id: "w", startedOn, done, teacher: { madeAt: `${startedOn}T09:00:00.000Z` },
  config: { title: "", days: Array.from({ length: 7 }, () => ({ theme: "", exercises: [ex] })) } as unknown as PlanConfig,
});
const taught = (week: StoredPlan | null): PlanState => ({ ...stateOf(null, false), given: week ? [week] : [] });

test("planWantsReminder: needs answers; no plan for today yet, or today's not finished", () => {
  assert.equal(planWantsReminder(stateOf(null, false), "2026-11-18", false), false);
  assert.equal(planWantsReminder(stateOf(null), "2026-11-18", false), true);
  assert.equal(planWantsReminder(stateOf(dayPlan("2026-11-17", true)), "2026-11-18", false), true);
  assert.equal(planWantsReminder(stateOf(dayPlan("2026-11-18")), "2026-11-18", false), true);
  assert.equal(planWantsReminder(stateOf(dayPlan("2026-11-18", true)), "2026-11-18", false), false);
});

test("planWantsReminder, a teacher's student with no answers: today's teacher day open is wanted; finished or no week is not", () => {
  assert.equal(planWantsReminder(taught(teacherWeek("2026-11-16")), "2026-11-18", true), true);
  assert.equal(planWantsReminder(taught(teacherWeek("2026-11-16", { "2:0": true })), "2026-11-18", true), false);
  assert.equal(planWantsReminder(taught(teacherWeek("2026-11-02")), "2026-11-18", true), false);
  assert.equal(planWantsReminder(taught(null), "2026-11-18", true), false);
});

test("reminderBody: the three wordings", () => {
  assert.equal(reminderBody(stateOf(dayPlan("2026-11-18")), "2026-11-18", false), "Today's plan: Scales");
  assert.equal(reminderBody(stateOf(dayPlan("2026-11-17")), "2026-11-18", false), "Open the Practice plan page and attunr puts today's plan together.");
  assert.equal(reminderBody(taught(teacherWeek("2026-11-16")), "2026-11-18", true), "Today is day 3 of 7 in your plan.");
});
