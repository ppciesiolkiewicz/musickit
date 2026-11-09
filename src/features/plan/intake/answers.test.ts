import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ANSWERS, areasMissingTopics, levelOf, migrateAnswers, type PlanAnswers } from "./answers";

const base: PlanAnswers = { areas: ["guitar"], topics: {}, minutes: 20, styles: "", notes: "" };

test("unreadable answers give the defaults", () => {
  assert.deepEqual(migrateAnswers(null), DEFAULT_ANSWERS);
  assert.deepEqual(migrateAnswers("x"), DEFAULT_ANSWERS);
  assert.notEqual(migrateAnswers(null).topics, DEFAULT_ANSWERS.topics);
});

test("the old per-area levels shape keeps its areas and drops ratings and focus", () => {
  const a = migrateAnswers({
    levels: { voice: "new", guitar: "intermediate" }, ratings: { caged: 3 }, focus: ["caged"],
    minutes: 30, styles: "blues", notes: "x", voice: { type: "tenor" },
  });
  assert.deepEqual(a, { areas: ["guitar", "voice"], topics: {}, voice: { type: "tenor" }, minutes: 30, styles: "blues", notes: "x" });
});

test("the oldest shape: instruments and one level", () => {
  assert.deepEqual(migrateAnswers({ instruments: ["voice"], level: "beginner" }).areas, ["voice", "theory"]);
  assert.deepEqual(migrateAnswers({ instruments: ["piano"], level: "new" }).areas, ["guitar", "theory"]);
  assert.deepEqual(migrateAnswers({ instrument: "guitar" }).areas, ["guitar", "theory"]);
});

test("today's shape round-trips; bad topics, rungs and areas are dropped", () => {
  const good: PlanAnswers = { areas: ["guitar", "theory"], topics: { "guitar-caged": 2, "theory-ear": 0 }, minutes: 45, styles: "folk", notes: "n" };
  assert.deepEqual(migrateAnswers(good), good);
  const a = migrateAnswers({ ...good, areas: ["theory", "piano", "guitar", "guitar"], topics: { "guitar-caged": 2, nope: 1, "theory-ear": 4, "guitar-scales": "2", "voice-pitch": 1.5 } });
  assert.deepEqual(a.areas, ["guitar", "theory"]);
  assert.deepEqual(a.topics, { "guitar-caged": 2 });
  assert.deepEqual(migrateAnswers({ areas: [], topics: {} }).areas, ["guitar"]);
  assert.equal(migrateAnswers({ areas: ["voice"], minutes: -3 }).minutes, DEFAULT_ANSWERS.minutes);
});

test("a bad voice is dropped, a good range kept", () => {
  assert.equal(migrateAnswers({ areas: ["voice"], voice: { type: "robot", range: { low: 60, high: 50 } } }).voice, undefined);
  assert.deepEqual(migrateAnswers({ areas: ["voice"], voice: { range: { low: 48, high: 72 } } }).voice, { range: { low: 48, high: 72 } });
});

test("levelOf: the mean of the area's answered lines, rounded", () => {
  const g = (topics: PlanAnswers["topics"]) => levelOf({ ...base, topics }, "guitar");
  assert.equal(g({ "guitar-basic-chords": 3, "guitar-barre-chords": 1, "guitar-caged": 0 }), "beginner");
  assert.equal(g({ "guitar-basic-chords": 3, "guitar-barre-chords": 3, "guitar-caged": 2 }), "advanced");
  assert.equal(g({ "guitar-basic-chords": 2, "guitar-scales": 2 }), "intermediate");
  assert.equal(g({ "guitar-caged": 0 }), "new");
  assert.equal(g({}), "beginner");
  assert.equal(g({ "voice-pitch": 3 }), "beginner", "another area's answers don't count");
});

test("areasMissingTopics: chosen areas with no answered topic", () => {
  assert.deepEqual(areasMissingTopics({ ...base, areas: ["guitar", "voice"], topics: { "voice-pitch": 2 } }), ["guitar"]);
  assert.deepEqual(areasMissingTopics({ ...base, areas: ["guitar"], topics: { "guitar-caged": 0 } }), []);
});
