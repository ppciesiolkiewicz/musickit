import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTeacherScores, MAX_TEACHER_SCORES, scoreAt, setScores } from "./teacherScores";
import { EMPTY_STATE, type TeacherScore } from "./types";

const ts = (topic: string, score: number, at: string): TeacherScore => ({ topic, score, at });
const T = "guitar-basic-chords";

test("cleanTeacherScores: drops unknown topics and broken entries, clamps to 0..3, rounds to 0.1", () => {
  const out = cleanTeacherScores([
    ts(T, 2.44, "2026-11-10T10:00:00.000Z"), ts(T, 7, "2026-11-11T10:00:00.000Z"), ts(T, -2, "2026-11-12T10:00:00.000Z"),
    ts("nope", 1, "2026-11-10T10:00:00.000Z"), ts(T, 1, ""), ts(T, Number.NaN, "2026-11-10T10:00:00.000Z"),
    { topic: T, score: "2" }, null, "x",
  ]);
  assert.deepEqual(out.map((e) => e.score), [2.4, 3, 0]);
  assert.deepEqual(cleanTeacherScores("junk"), []);
  assert.deepEqual(cleanTeacherScores(undefined), []);
});

test("cleanTeacherScores: keeps the newest MAX_TEACHER_SCORES", () => {
  const many = Array.from({ length: MAX_TEACHER_SCORES + 5 }, (_, i) => ts(T, 1, `2026-11-10T10:00:${String(i % 60).padStart(2, "0")}.${String(i).padStart(3, "0")}Z`));
  const out = cleanTeacherScores(many);
  assert.equal(out.length, MAX_TEACHER_SCORES);
  assert.equal(out.at(-1)!.at, many.at(-1)!.at);
});

test("setScores: appends one entry per topic that moved by 0.05 or more, oldest first", () => {
  const s = { ...EMPTY_STATE, teacherScores: [ts("guitar-scales", 1, "2026-11-01T10:00:00.000Z")] };
  const out = setScores(s, { [T]: 2.4, "guitar-scales": 1.02, "voice-pitch": 0 }, "2026-11-18T09:00:00.000Z", { [T]: 1, "guitar-scales": 1, "voice-pitch": null });
  assert.deepEqual(out.teacherScores.map((e) => [e.topic, e.score]), [["guitar-scales", 1], [T, 2.4], ["voice-pitch", 0]]);
  assert.equal(out.teacherScores[1].at, "2026-11-18T09:00:00.000Z");
  assert.equal(setScores(s, { [T]: 1.04 }, "2026-11-18T09:00:00.000Z", { [T]: 1 }).teacherScores.length, 1);
  assert.deepEqual(s.teacherScores.length, 1, "the state given is not changed");
});

test("scoreAt: the newest entry of the topic dated on or before the end of the local day", () => {
  const list = [ts(T, 1, "2026-11-10T10:00:00.000Z"), ts("guitar-scales", 3, "2026-11-10T10:00:00.000Z"), ts(T, 2, "2026-11-12T10:00:00.000Z")];
  assert.equal(scoreAt(list, T, "2026-11-12")?.score, 2);
  assert.equal(scoreAt(list, T, "2026-11-11")?.score, 1);
  assert.equal(scoreAt(list, T, "2026-11-09"), null);
  assert.equal(scoreAt(list, "voice-pitch", "2026-11-30"), null);
});
