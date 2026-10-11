import { test } from "node:test";
import assert from "node:assert/strict";
import { closestSample, midiToHz, midiToName, noteToMidi, pickSample } from "./notes";

test("note names and numbers convert both ways", () => {
  assert.equal(noteToMidi("C4"), 60);
  assert.equal(noteToMidi("F#3"), 54);
  assert.equal(noteToMidi("Bb2"), 46);
  assert.equal(noteToMidi("A0"), 21);
  assert.equal(noteToMidi(61.2), 61);
  assert.equal(noteToMidi("nope"), null);
  assert.equal(midiToName(61), "C#4");
  assert.equal(midiToName(noteToMidi("G3")!), "G3");
  assert.ok(Math.abs(midiToHz(69) - 440) < 1e-9);
});

test("the nearest sample is tuned to the note", () => {
  const samples = [{ midi: 55 }, { midi: 60 }, { midi: 67 }];
  const a = closestSample(62, samples)!;
  assert.equal(a.sample.midi, 60);
  assert.ok(Math.abs(a.rate - 2 ** (2 / 12)) < 1e-9);
  const b = closestSample(66, samples)!;
  assert.equal(b.sample.midi, 67);
  assert.ok(b.rate < 1);
  assert.equal(closestSample(60, []), null);
});

test("strict: only a sample at exactly the note plays, untuned", () => {
  const samples = [{ midi: 36 }, { midi: 38 }];
  assert.deepEqual(pickSample(38, samples, true), { sample: { midi: 38 }, rate: 1 });
  assert.equal(pickSample(37, samples, true), null);
  assert.equal(pickSample(60, [], true), null);
  assert.equal(pickSample(37, samples)!.sample.midi, 36);
});
