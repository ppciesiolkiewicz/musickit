import assert from "node:assert/strict";
import test from "node:test";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { stepAt } from "../model/path";
import { EMPTY_STATE, type PlanState } from "../model/types";
import { composeStudentWeek } from "./composeStudentWeek";
import { stubBlock, stubLibrary, topicBlocks } from "./stubLibrary";

const S = "student-1";
const answers = { areas: ["guitar"], topics: { "guitar-scales": 0 }, minutes: 10, styles: "", notes: "" };
const state = (over: Partial<PlanState> = {}): PlanState => ({ ...EMPTY_STATE, answers: answers as PlanState["answers"], ...over });
const levels = (r: Awaited<ReturnType<typeof composeStudentWeek>>) =>
  new Set(r.ok ? r.days.flatMap((d) => d.exercises.flatMap((e) => e.steps ?? []).map((ref) => stepAt(ref)!.step.level)) : []);

test("no answers: no-answers, and the library is not asked", async () => {
  const library = stubLibrary(topicBlocks("guitar-scales"));
  const r = await composeStudentWeek({ library, userData: memoryUserDataRepo() }, S, { start: "2026-11-18", seed: "x" }, EMPTY_STATE);
  assert.deepEqual(r, { ok: false, code: "no-answers" });
  assert.equal(library.calls.length, 0);
});

test("seven days from the start, from the student's blocks of their areas", async () => {
  const library = stubLibrary(topicBlocks("guitar-scales"));
  const r = await composeStudentWeek({ library, userData: memoryUserDataRepo() }, S, { start: "2026-11-18", seed: "x" }, state());
  assert.ok(r.ok);
  assert.equal(r.days.length, 7);
  assert.equal(r.short, false);
  assert.ok(r.days.every((d) => d.exercises.length > 0));
  assert.deepEqual(library.calls, [{ player: S, areas: ["guitar"] }]);
  // no block twice on two days running
  for (let i = 1; i < 7; i++) {
    const before = new Set(r.days[i - 1].exercises.map((e) => e.blockId));
    for (const e of r.days[i].exercises) assert.ok(!before.has(e.blockId), `day ${i}`);
  }
});

test("every day empty: no-blocks; some days empty: short, all seven days kept", async () => {
  const none = await composeStudentWeek({ library: stubLibrary([]), userData: memoryUserDataRepo() }, S, { start: "2026-11-18", seed: "x" }, state());
  assert.deepEqual(none, { ok: false, code: "no-blocks" });
  // two blocks: a day can't use yesterday's, so every other day is empty or short
  const two = [stubBlock("notes-on-neck:1", 0), stubBlock("notes-on-neck:1", 1)];
  const few = await composeStudentWeek({ library: stubLibrary(two), userData: memoryUserDataRepo() }, S, { start: "2026-11-18", seed: "x" }, state());
  assert.ok(few.ok);
  assert.equal(few.days.length, 7);
  assert.equal(few.short, true);
});

test("a teacher's score paces the week: set to 2, the topic gets intermediate steps; without it, none", async () => {
  const d = () => ({ library: stubLibrary(topicBlocks("guitar-scales")), userData: memoryUserDataRepo() });
  const plain = await composeStudentWeek(d(), S, { start: "2026-11-18", seed: "x" }, state());
  assert.ok(!levels(plain).has("intermediate"), [...levels(plain)].join());
  const taught = state({ teacherScores: [{ topic: "guitar-scales", score: 2, at: "2026-11-18T12:00:00.000Z" }] });
  const raised = await composeStudentWeek(d(), S, { start: "2026-11-18", seed: "x" }, taught);
  assert.ok(levels(raised).has("intermediate"), [...levels(raised)].join());
});

test("yesterday: the day before the week is barred on its first day", async () => {
  const two = [stubBlock("notes-on-neck:1", 0), stubBlock("notes-on-neck:1", 1)];
  const one = { ...answers, minutes: 5 };
  const st = state({ answers: one as PlanState["answers"] });
  for (const barred of [two[0].id, two[1].id]) {
    const r = await composeStudentWeek({ library: stubLibrary(two), userData: memoryUserDataRepo() }, S, { start: "2026-11-18", seed: "x", yesterday: [barred] }, st);
    assert.ok(r.ok);
    assert.deepEqual(r.days[0].exercises.map((e) => e.blockId), [two.find((b) => b.id !== barred)!.id]);
  }
});

test("a week that starts in the past is paced as of today: a score set today counts", async () => {
  const taught = state({ teacherScores: [{ topic: "guitar-scales", score: 2, at: "2026-11-18T12:00:00.000Z" }] });
  const d = () => ({ library: stubLibrary(topicBlocks("guitar-scales")), userData: memoryUserDataRepo() });
  const past = await composeStudentWeek(d(), S, { start: "2026-11-16", seed: "x" }, taught);
  assert.ok(!levels(past).has("intermediate"), "as of the start the score is not set yet");
  const today = await composeStudentWeek(d(), S, { start: "2026-11-16", seed: "x", today: "2026-11-18" }, taught);
  assert.ok(levels(today).has("intermediate"));
});
