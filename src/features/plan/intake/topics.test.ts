import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS } from "../model/concepts";
import { TOPICS, topicById, topicsFor } from "./topics";

const IDS = [
  "guitar-scales", "guitar-basic-chords", "guitar-barre-chords", "guitar-extended-chords", "guitar-caged", "guitar-techniques",
  "voice-pitch", "voice-intervals", "voice-melodies", "voice-breath-range", "voice-runs", "voice-harmony",
  "theory-basics", "theory-ear", "theory-scales-keys", "theory-building-chords", "theory-progressions", "theory-modes",
];

test("18 topics, in order, with unique ids", () => {
  assert.deepEqual(TOPICS.map((t) => t.id), IDS);
});

test("six topics per area", () => {
  for (const a of AREAS) assert.equal(topicsFor(a.id).length, 6, a.id);
});

test("every topic has four lines, the first 'Not yet', and a description", () => {
  for (const t of TOPICS) {
    assert.equal(t.lines.length, 4, t.id);
    assert.equal(t.lines[0], "Not yet", t.id);
    assert.ok(t.desc && t.label, t.id);
    for (const l of t.lines) assert.ok(l.trim().length > 0, t.id);
  }
});

test("scale shapes are positions, never boxes", () => {
  for (const t of TOPICS) for (const s of [t.desc, ...t.lines]) assert.doesNotMatch(s, /\bbox/i, t.id);
});

test("topicById", () => {
  assert.equal(topicById("guitar-barre-chords")!.lines[1], "I can hold an F or Bm, but it buzzes");
  assert.equal(topicById("nope"), undefined);
});
