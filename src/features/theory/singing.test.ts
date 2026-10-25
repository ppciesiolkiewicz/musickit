import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLadder, fitOf, hzToMidi, locate, spellName } from "./singing";
import { place } from "./piano/staff";

describe("singing ladder", () => {
  it("E major, high voice: two octaves E3 to E5, the middle octave home", () => {
    const l = buildLadder("major-ionian", 4, "high")!;
    assert.equal(l.notes.length, 15);
    assert.equal(l.notes[0].midi, 52);
    assert.equal(l.notes[14].midi, 76);
    assert.deepEqual(l.notes.filter((n) => n.home).map((n) => n.spelled.name), ["E", "F♯", "G♯", "A", "B", "C♯", "D♯", "E"]);
    assert.equal(l.signature, 4);
    assert.equal(l.title, "E major");
  });
  it("the low voice sits an octave down", () => {
    assert.equal(buildLadder("major-ionian", 4, "low")!.notes[0].midi, 40);
  });
  it("pentatonics take their five notes and the host's signature", () => {
    const l = buildLadder("minor-pentatonic", 9, "high")!;
    assert.equal(l.notes.length, 11);
    assert.deepEqual(l.notes.slice(5, 11).map((n) => n.spelled.name), ["A", "C", "D", "E", "G", "A"]);
    assert.equal(l.signature, 0);
  });
  it("unknown scale is null", () => {
    assert.equal(buildLadder("nope", 0, "high"), null);
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
