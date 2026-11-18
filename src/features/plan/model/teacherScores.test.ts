import { test } from "node:test";
import assert from "node:assert/strict";
import { isAfter } from "./outcome";
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
  const out = setScores(s, { [T]: 2.4, "guitar-scales": 1.02, "voice-pitch": 0 }, "2026-11-18T09:00:00.000Z", { [T]: 1, "guitar-scales": 1, "voice-pitch": null }, "2026-11-18");
  assert.deepEqual(out.teacherScores.map((e) => [e.topic, e.score]), [["guitar-scales", 1], [T, 2.4], ["voice-pitch", 0]]);
  assert.equal(out.teacherScores[1].at, "2026-11-18T09:00:00.000Z");
  assert.equal(setScores(s, { [T]: 1.04 }, "2026-11-18T09:00:00.000Z", { [T]: 1 }, "2026-11-18").teacherScores.length, 1);
  assert.deepEqual(s.teacherScores.length, 1, "the state given is not changed");
});

test("scoreAt: the newest entry of the topic dated on or before the end of the local day", () => {
  const list = [ts(T, 1, "2026-11-10T10:00:00.000Z"), ts("guitar-scales", 3, "2026-11-10T10:00:00.000Z"), ts(T, 2, "2026-11-12T10:00:00.000Z")];
  assert.equal(scoreAt(list, T, "2026-11-12")?.score, 2);
  assert.equal(scoreAt(list, T, "2026-11-11")?.score, 1);
  assert.equal(scoreAt(list, T, "2026-11-09"), null);
  assert.equal(scoreAt(list, "voice-pitch", "2026-11-30"), null);
});

// --- the teacher's own day (an evening west of UTC is already the next day on the server)

test("scoreAt: an entry counts from the teacher's local day, not the server's date of its time", () => {
  const e = { topic: T, score: 2, at: "2026-11-19T01:00:00Z", day: "2026-11-18" };
  assert.equal(scoreAt([e], T, "2026-11-18"), e);
  assert.equal(scoreAt([e], T, "2026-11-17"), null);
  assert.equal(scoreAt([ts(T, 1, "2026-11-18T09:00:00Z")], T, "2026-11-18")?.score, 1, "an old entry with no day: the date of its time");
});

test("setScores records the teacher's day; cleanTeacherScores keeps a valid day only", () => {
  const out = setScores(EMPTY_STATE, { [T]: 2 }, "2026-11-19T01:00:00.000Z", { [T]: 1 }, "2026-11-18");
  assert.deepEqual(out.teacherScores, [{ topic: T, score: 2, at: "2026-11-19T01:00:00.000Z", day: "2026-11-18" }]);
  const clean = cleanTeacherScores([
    { topic: T, score: 2, at: "2026-11-19T01:00:00Z", day: "2026-11-18" },
    { topic: T, score: 2, at: "2026-11-19T01:00:00Z", day: "18 Nov" },
    { topic: T, score: 2, at: "2026-11-19T01:00:00Z", day: "2026-13-45" },
  ]);
  assert.deepEqual(clean.map((e) => e.day), ["2026-11-18", undefined, undefined]);
  assert.ok(!("day" in clean[1]), "no day key when it was not a date");
});

test("isAfter: a date-only rating is compared with the teacher's day when the entry has one", () => {
  assert.equal(isAfter("2026-11-19", "2026-11-19T01:00:00Z", "2026-11-18"), true);
  assert.equal(isAfter("2026-11-18", "2026-11-19T01:00:00Z", "2026-11-18"), false);
  assert.equal(isAfter("2026-11-19T02:00:00Z", "2026-11-19T01:00:00Z", "2026-11-18"), true, "a datetime compares times");
  assert.equal(isAfter("2026-11-19T00:30:00Z", "2026-11-19T01:00:00Z", "2026-11-18"), false);
});
