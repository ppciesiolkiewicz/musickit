import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanVoice, furthest, isHighEnough, nearestVoice, normaliseRange, noteName, rangeOf, steadyNote, typeOf, voiceWords } from "./voiceRange";

test("steadyNote: a held note rounds to its midi", () => {
  const frames = Array.from({ length: 30 }, (_, i) => 48.2 + (i % 2 ? 0.1 : -0.1));
  assert.equal(steadyNote(frames, 30), 48);
});

test("steadyNote: a jump inside the window is not steady", () => {
  const frames = [...Array(15).fill(48.2), ...Array(15).fill(50.1)];
  assert.equal(steadyNote(frames, 30), null);
});

test("steadyNote: a wide vibrato round a held note still counts", () => {
  // ±90 cents at 5.5 Hz, read 30 times a second: the top of a range often shakes this much
  const frames = Array.from({ length: 15 }, (_, i) => 79 + 0.9 * Math.sin((2 * Math.PI * 5.5 * i) / 30));
  assert.equal(steadyNote(frames, 15), 79);
});

test("steadyNote: a slide is not a held note", () => {
  const frames = Array.from({ length: 15 }, (_, i) => 60 + (i * 1.5) / 14);
  assert.equal(steadyNote(frames, 15), null);
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
  assert.equal(noteName(61), "C♯4");
});

test("isHighEnough needs 3 semitones above the low note", () => {
  assert.equal(isHighEnough(48, 48), false);
  assert.equal(isHighEnough(48, 50), false);
  assert.equal(isHighEnough(48, 51), true);
});

test("cleanVoice: a type, a range of their own, or nothing", () => {
  assert.deepEqual(cleanVoice("tenor"), { type: "tenor" });
  assert.deepEqual(cleanVoice({ type: "alto" }), { type: "alto" });
  assert.deepEqual(cleanVoice({ type: "tenor", range: { low: 45, high: 64 } }), { range: { low: 45, high: 64 } }, "their own range wins over a type");
  assert.deepEqual(cleanVoice({ low: 45, high: 64 }), { range: { low: 45, high: 64 } }, "a bare range, as the singing page once kept it");
  assert.deepEqual(cleanVoice({ low: 48, high: 72 }), { type: "tenor" }, "a bare range that is a type's own");
  for (const bad of [null, 3, "loud", {}, { type: "loud" }, { range: { low: 64, high: 45 } }, { range: { low: 45.5, high: 64 } }, { range: { low: 10, high: 64 } }]) {
    assert.equal(cleanVoice(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(cleanVoice({ type: "bass", range: { low: 64, high: 45 } }), { type: "bass" }, "a broken range leaves the type");
});

test("rangeOf: a type's range is its definition, their own range is used as found", () => {
  assert.deepEqual(rangeOf({ type: "baritone" }), { low: 43, high: 67 });
  assert.deepEqual(rangeOf({ range: { low: 45, high: 64 } }), { low: 45, high: 64 });
});

test("rangeOf: a range under an octave is widened to an octave around its middle, inside C2 to C7", () => {
  assert.deepEqual(rangeOf({ range: { low: 50, high: 56 } }), { low: 47, high: 59 });
  assert.deepEqual(rangeOf({ range: { low: 36, high: 40 } }), { low: 36, high: 48 });
  assert.deepEqual(rangeOf({ range: { low: 92, high: 96 } }), { low: 84, high: 96 });
});

test("typeOf and voiceWords: the type's name, or the whole range when it is their own", () => {
  assert.equal(typeOf({ type: "mezzo" }), "mezzo");
  assert.equal(typeOf({ range: { low: 44, high: 66 } }), "baritone");
  assert.equal(voiceWords({ type: "mezzo" }), "Mezzo");
  assert.equal(voiceWords({ range: { low: 45, high: 64 } }), "A2 to E4");
  assert.equal(voiceWords({ range: { low: 50, high: 56 } }), "B2 to B3", "the octave the tools use");
});

test("furthest: the lowest or the highest note held so far", () => {
  assert.equal(furthest(null, 50, "low"), 50);
  assert.equal(furthest(50, 47, "low"), 47);
  assert.equal(furthest(47, 52, "low"), 47);
  assert.equal(furthest(60, 64, "high"), 64);
  assert.equal(furthest(64, 62, "high"), 64);
});
