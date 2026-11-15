import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ANSWERS } from "../intake/answers";
import type { ProgressEntry } from "@/features/progress/log";
import type { AnswersEntry } from "./types";
import { outcome, type TopicOutcome } from "./outcome";
import { mergeTimes, minutesOf, shownAreas, topicLevel } from "./trackerView";

let n = 0;
const entry = (over: Partial<ProgressEntry> = {}): ProgressEntry => ({
  id: `e${++n}`, planId: "p", exerciseId: `x${n}`, day: 0, exercise: 0, title: "x", stars: 3, at: "2026-11-10T12:00:00.000Z", ...over,
});
const asked = (at: string, topics: AnswersEntry["topics"]): AnswersEntry => ({ at, topics });

test("mergeTimes: today's live record replaces the one read", () => {
  const read = [{ planId: "p", day: 0, elapsed: 100, spent: {} }, { planId: "q", day: 1, elapsed: 50, spent: {} }];
  const live = [{ planId: "p", day: 0, elapsed: 400, spent: {} }];
  assert.deepEqual(mergeTimes(read, live).map((d) => [d.planId, d.elapsed]).sort(), [["p", 400], ["q", 50]]);
});
test("shownAreas: the chosen areas plus any practised one, in screen order", () => {
  const o = outcome({ plans: [], times: [], answersHistory: [], entries: [entry({ concepts: ["matching-a-pitch"], stars: 3 })] }, "2026-11-15");
  assert.deepEqual(shownAreas(o, { ...DEFAULT_ANSWERS, areas: ["theory"] }).map((a) => a.area), ["voice", "theory"]);
  assert.deepEqual(shownAreas(o, null).map((a) => a.area), ["voice"]);
});
test("topicLevel: the level reached by id, and the next one only once something there is solid", () => {
  assert.deepEqual(topicLevel({ reached: 0, score: 0 } as TopicOutcome), { level: "new", next: null });
  assert.deepEqual(topicLevel({ reached: 0, score: 0.5 } as TopicOutcome), { level: "new", next: "beginner" });
  assert.deepEqual(topicLevel({ reached: 1, score: 1.5 } as TopicOutcome), { level: "beginner", next: "intermediate" });
  assert.deepEqual(topicLevel({ reached: 1, score: 1 } as TopicOutcome), { level: "beginner", next: null });
  assert.deepEqual(topicLevel({ reached: 3, score: 3 } as TopicOutcome), { level: "advanced", next: null });
  assert.equal(topicLevel({ reached: null, score: null } as TopicOutcome), null);
});
test("topicLevel from a real outcome: rung 1 and one of the two intermediate CAGED concepts solid", () => {
  const o = outcome({ plans: [], times: [], entries: [entry({ concepts: ["caged"], stars: 4 })], answersHistory: [asked("2026-11-01", { "guitar-caged": 1 })] }, "2026-11-15");
  assert.deepEqual(topicLevel(o.areas[0].topics.find((t) => t.topic === "guitar-caged")!), { level: "beginner", next: "intermediate" });
});
test("minutesOf rounds down", () => assert.equal(minutesOf(359), 5));
