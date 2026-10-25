import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RANGE_MIN, VOICES, buildLadder, clefFor, fitOf, hzToMidi, locate, scaleRun, setRangeEnd, spellName, voiceOf } from "./singing";
import { place } from "./piano/staff";

describe("singing ladder", () => {
  it("E major, soprano (C4 to C6): starts on the lowest E, E4 to B5", () => {
    const l = buildLadder("major-ionian", 4, VOICES.soprano)!;
    assert.equal(l.notes[0].midi, 64);
    assert.equal(l.notes[0].label, "R");
    assert.equal(l.notes.at(-1)!.midi, 83);
    assert.equal(l.notes.length, 12);
    assert.equal(l.signature, 4);
    assert.equal(l.title, "E major");
  });
  it("C major, tenor: two octaves root to root", () => {
    const l = buildLadder("major-ionian", 0, VOICES.tenor)!;
    assert.equal(l.notes.length, 15);
    assert.deepEqual([l.notes[0].midi, l.notes[14].midi], [48, 72]);
  });
  it("a custom range ends on the highest scale note in it (a five-note run)", () => {
    const l = buildLadder("major-ionian", 0, { low: 60, high: 67 })!;
    assert.deepEqual(l.notes.map((n) => n.spelled.name), ["C", "D", "E", "F", "G"]);
  });
  it("no root in the range: the one just under it, and at least two notes", () => {
    const l = buildLadder("major-ionian", 7, { low: 60, high: 62 })!;
    assert.deepEqual(l.notes.map((n) => n.midi), [55, 57, 59, 60, 62]);
    assert.equal(buildLadder("major-ionian", 0, { low: 60, high: 61 })!.notes.length, 2);
  });
  it("pentatonics take their five notes and the host's signature", () => {
    const l = buildLadder("minor-pentatonic", 9, VOICES.alto)!;
    assert.deepEqual(l.notes.slice(0, 6).map((n) => n.spelled.name), ["A", "C", "D", "E", "G", "A"]);
    assert.equal(l.notes[0].midi, 57);
    assert.equal(l.signature, 0);
  });
  it("unknown scale is null", () => {
    assert.equal(buildLadder("nope", 0, VOICES.soprano), null);
  });
});

describe("voices and ranges", () => {
  it("names a voice's own range, null for a custom one", () => {
    assert.equal(voiceOf({ low: 48, high: 72 }), "tenor");
    assert.equal(voiceOf({ low: 48, high: 70 }), null);
  });
  it("clef by the middle of the range", () => {
    assert.equal(clefFor(VOICES.tenor), "treble");
    assert.equal(clefFor(VOICES.baritone), "bass");
  });
  it("moving one end past the other pushes it along", () => {
    assert.deepEqual(setRangeEnd({ low: 60, high: 72 }, "low", 75), { low: 75, high: 77 });
    assert.deepEqual(setRangeEnd({ low: 60, high: 72 }, "high", 55), { low: 53, high: 55 });
    assert.deepEqual(setRangeEnd({ low: 60, high: 72 }, "high", 76), { low: 60, high: 76 });
    assert.deepEqual(setRangeEnd({ low: 60, high: 72 }, "low", 10), { low: RANGE_MIN, high: 72 });
  });
});

describe("scaleRun", () => {
  it("up, rest beats, then down from the top", () => {
    assert.deepEqual(scaleRun(3, 2), [0, 1, 2, null, null, 2, 1, 0]);
  });
  it("no rest: the top once", () => {
    assert.deepEqual(scaleRun(3, 0), [0, 1, 2, 1, 0]);
  });
});

describe("spellName", () => {
  it("keeps the octave of B♯ and C♭ by letter", () => {
    assert.equal(spellName("B♯", 60).octave, 3);
    assert.equal(spellName("C♭", 59).octave, 4);
    assert.equal(spellName("F♯", 66).alter, 1);
  });
  it("places on the clef asked for", () => {
    assert.equal(place(spellName("E", 64), 0, "treble").step, 0);
    assert.equal(place(spellName("E", 64), 0, "bass").step, 12);
  });
});

describe("locate", () => {
  const midis = [60, 62, 64, 65];
  const steps = [-2, -1, 0, 1];
  it("lands on a note's notehead", () => {
    assert.deepEqual(locate(midis, steps, 62), { x: 1, step: -1, nearest: 1, cents: 0 });
  });
  it("halfway between two notes on both axes", () => {
    const r = locate(midis, steps, 63);
    assert.equal(r.x, 1.5);
    assert.equal(r.step, -0.5);
  });
  it("a semitone gap is crossed by a semitone", () => {
    assert.equal(locate(midis, steps, 64.5).x, 2.5);
  });
  it("past the ends it carries on, up to one slot out", () => {
    assert.equal(locate(midis, steps, 59).x, -0.5);
    assert.equal(locate(midis, steps, 40).x, -1);
    assert.equal(locate(midis, steps, 66).x, 4);
    assert.equal(locate(midis, steps, 66).step, 2);
    assert.equal(locate(midis, steps, 90).x, 4);
  });
  it("names the nearest note and the cents off it", () => {
    const r = locate(midis, steps, 61.8);
    assert.equal(r.nearest, 1);
    assert.ok(Math.abs(r.cents + 20) < 1e-9);
  });
});

describe("fitOf", () => {
  const pcs = new Set([0, 2, 4, 5, 7, 9, 11]);
  it("in, out or between", () => {
    assert.equal(fitOf(62.1, pcs), "in");
    assert.equal(fitOf(61, pcs), "out");
    assert.equal(fitOf(61.5, pcs), "between");
  });
  it("hzToMidi", () => {
    assert.equal(hzToMidi(440), 69);
    assert.ok(Math.abs(hzToMidi(261.6256) - 60) < 1e-4);
  });
});
