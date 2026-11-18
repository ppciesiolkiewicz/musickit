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
  assert.equal(reminderDue(stateOf(null), at("2026-11-18"), false), true);
  assert.equal(reminderDue(stateOf(dayPlan("2026-11-17", true)), at("2026-11-18"), false), true);
});

test("reminderDue: today's plan not finished is due; finished is not", () => {
  assert.equal(reminderDue(stateOf(dayPlan("2026-11-18")), at("2026-11-18"), false), true);
  assert.equal(reminderDue(stateOf(dayPlan("2026-11-18", true)), at("2026-11-18"), false), false);
});

test("reminderDue: never without answers, switched off, before its time or once shown today", () => {
  assert.equal(reminderDue(stateOf(null, false), at("2026-11-18"), false), false);
  assert.equal(reminderDue(stateOf(null, true, { enabled: false }), at("2026-11-18"), false), false);
  assert.equal(reminderDue(stateOf(null), at("2026-11-18", "17:59"), false), false);
  assert.equal(reminderDue(stateOf(null, true, { lastShownOn: "2026-11-18" }), at("2026-11-18"), false), false);
});

test("reminderBody: names today's plan when it is there, and says the page makes it when it isn't", () => {
  assert.equal(reminderBody(stateOf(dayPlan("2026-11-18")), at("2026-11-18"), false), "Today's plan: Scales");
  assert.equal(reminderBody(stateOf(dayPlan("2026-11-17")), at("2026-11-18"), false), "Open the Practice plan page, and attunr puts today's plan together.");
});

// a teacher's student: today's plan is the day of the teacher's week that covers today
const teacherWeek = (startedOn: string, done: Record<string, true> = {}): StoredPlan => ({
  id: "w", startedOn, done, teacher: { madeAt: `${startedOn}T09:00:00.000Z` },
  config: { title: "", days: Array.from({ length: 7 }, () => ({ theme: "", exercises: [ex] })) } as unknown as PlanConfig,
});
const taught = (week: StoredPlan | null): PlanState => ({ ...stateOf(null), given: week ? [week] : [] });

test("reminderDue, a teacher's student: today's day of the teacher's week, unfinished, is due; finished is not", () => {
  assert.equal(reminderDue(taught(teacherWeek("2026-11-16")), at("2026-11-18"), true), true);
  assert.equal(reminderDue(taught(teacherWeek("2026-11-16", { "2:0": true })), at("2026-11-18"), true), false);
  assert.equal(reminderDue(taught(teacherWeek("2026-11-16", { "0:0": true })), at("2026-11-18"), true), true, "another day's tick is not today's");
});

test("reminderDue, a teacher's student: with every week ended, nothing is due (no daily plan is made for them)", () => {
  assert.equal(reminderDue(taught(teacherWeek("2026-11-02")), at("2026-11-18"), true), false);
});

test("reminderBody, a teacher's student: which day of the plan today is, never that attunr makes one", () => {
  assert.equal(reminderBody(taught(teacherWeek("2026-11-16")), at("2026-11-18"), true), "Today is day 3 of 7 of your plan.");
});

test("taught comes from the account, not the document: a teacher week on a self-paced account doesn't make it taught, and a taught account with no week has nothing due", () => {
  const withWeek = { ...taught(teacherWeek("2026-11-16")), current: dayPlan("2026-11-18") };
  assert.equal(reminderBody(withWeek, at("2026-11-18"), false), "Today's plan: Scales");
  assert.equal(reminderBody(withWeek, at("2026-11-18"), true), "Today is day 3 of 7 of your plan.");
  assert.equal(reminderDue(stateOf(null), at("2026-11-18"), true), false, "taught, no week covering today");
});
