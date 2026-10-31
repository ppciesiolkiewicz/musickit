import { test } from "node:test";
import assert from "node:assert/strict";
import { isHighEnough, nearestVoice, normaliseRange, noteName, steadyNote } from "./voiceRange";

test("steadyNote: a held note rounds to its midi", () => {
  const frames = Array.from({ length: 30 }, (_, i) => 48.2 + (i % 2 ? 0.1 : -0.1));
  assert.equal(steadyNote(frames, 30), 48);
});

test("steadyNote: a jump inside the window is not steady", () => {
  const frames = [...Array(15).fill(48.2), ...Array(15).fill(50.1)];
  assert.equal(steadyNote(frames, 30), null);
});

test("steadyNote: a gap or too few frames is not steady", () => {
  const frames: (number | null)[] = Array(30).fill(48.2);
  frames[10] = null;
  assert.equal(steadyNote(frames, 30), null);
  assert.equal(steadyNote([48, 48], 30), null);
});

test("steadyNote: only the last frames count", () => {
  assert.equal(steadyNote([null, 70, ...Array(30).fill(48.2)], 30), 48);
});

test("nearestVoice picks the closest preset range", () => {
  assert.equal(nearestVoice({ low: 48, high: 69 }), "tenor");
  assert.equal(nearestVoice({ low: 41, high: 62 }), "bass");
});

test("normaliseRange swaps a reversed range", () => {
  assert.deepEqual(normaliseRange(69, 48), { low: 48, high: 69 });
  assert.equal(nearestVoice(normaliseRange(69, 48)), "tenor");
});

test("noteName spells a midi note", () => {
  assert.equal(noteName(48), "C3");
  assert.equal(noteName(69), "A4");
  assert.equal(noteName(61), "C#4");
});

test("isHighEnough needs 3 semitones above the low note", () => {
  assert.equal(isHighEnough(48, 48), false);
  assert.equal(isHighEnough(48, 50), false);
  assert.equal(isHighEnough(48, 51), true);
});
