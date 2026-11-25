import { test } from "node:test";
import assert from "node:assert/strict";
import { ratedShare, ratingNudge } from "./ratingNudge";
import type { DayTime } from "./planTime";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (id: string): PlanExercise => ({ id, title: id, minutes: 5, cells: [{ type: "text", text: "x" }] });
const day = (id: string, n: number, rated: number[] = []): StoredPlan => ({
  id, startedOn: "2026-11-01", done: Object.fromEntries(rated.map((i) => [`0:${i}`, true])),
  rated: Object.fromEntries(rated.map((i) => [`0:${i}`, { stars: 4, at: "2026-11-01T10:00:00.000Z" }])),
  config: { title: id, days: [{ theme: "", exercises: Array.from({ length: n }, (_, i) => ex(`${id}-${i}`)) }] },
});
const time = (planId: string, spent: Record<string, number>): DayTime => ({ planId, day: 0, elapsed: 60, spent });

test("an exercise counts when rated or timed, never when only listed", () => {
  const days = [day("a", 4, [0]), day("b", 3)];
  const times = [time("a", { "a-1": 30, "a-0": 10 }), time("b", { "b-2": 0 })];
  assert.deepEqual(ratedShare(days, times), { practised: 2, rated: 1 });
});

test("the nudge asks when under half of enough practised exercises are rated", () => {
  const timed = time("a", { "a-0": 5, "a-1": 5, "a-2": 5, "a-3": 5 });
  assert.deepEqual(ratingNudge([day("a", 4, [0])], [timed]), { practised: 4, rated: 1 });
  assert.equal(ratingNudge([day("a", 4, [0, 1])], [timed]), null, "half rated is enough");
  assert.equal(ratingNudge([day("a", 4)], [time("a", { "a-0": 5, "a-1": 5, "a-2": 5 })]), null, "too few to count");
});
