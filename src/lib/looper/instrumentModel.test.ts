import { test } from "node:test";
import assert from "node:assert/strict";
import { PAD_BASE, clampInstrument, migrateSaves, padIndexOf, soundingNote, voiceSpec, withGenerator } from "./instrumentModel";

test("malformed state is repaired; unknown controller and generator fall back to the piano", () => {
  const s = clampInstrument({ controller: "harp", root: 14, scale: "", octave: 99, pads: 0, generator: { kind: "theremin" } });
  assert.equal(s.controller, "piano");
  assert.equal(s.root, 2);
  assert.equal(s.scale, "major");
  assert.equal(s.octave, 6);
  assert.equal(s.pads, 1);
  assert.deepEqual(s.generator, { kind: "piano", instrument: "PIANO", padNotes: [60] });
  assert.deepEqual(clampInstrument(undefined).generator, { kind: "piano", instrument: "PIANO", padNotes: [60, 61, 62, 63, 64, 65, 66, 67] });
});

test("pad arrays follow the pad count, keeping what fits", () => {
  const s = clampInstrument({ pads: 3, generator: { kind: "sampler", root: 200, sample: "a", padSamples: ["x", 5, null, "y", "z"] } });
  assert.deepEqual(s.generator, { kind: "sampler", root: 60, sample: "a", padSamples: ["x", null, null] });
  const grown = clampInstrument({ ...s, pads: 5 });
  assert.deepEqual(grown.generator.kind === "sampler" && grown.generator.padSamples, ["x", null, null, null, null]);
  assert.equal(clampInstrument({ pads: 99 }).pads, 32);
});

test("switching the generator starts a fresh one; switching the controller keeps everything", () => {
  const s = clampInstrument({ controller: "scalepiano", root: 5, generator: { kind: "piano", instrument: "CELLO" } });
  assert.equal(withGenerator(s, "piano"), s);
  const sam = withGenerator(s, "sampler");
  assert.deepEqual(sam.generator, { kind: "sampler", root: 60, padSamples: Array(8).fill(null) });
  assert.equal(sam.root, 5);
  const board = clampInstrument({ ...s, controller: "soundboard" });
  assert.equal(board.root, 5);
  assert.deepEqual(board.generator, s.generator);
});

test("the note that sounds: keys pass through, pads map on a piano and stay pad notes on a sampler", () => {
  const keys = clampInstrument({ controller: "scalepiano" });
  assert.equal(soundingNote(keys, 61), 61);
  const board = clampInstrument({ controller: "soundboard", pads: 2, generator: { kind: "piano", instrument: "PIANO", padNotes: [48, 72] } });
  assert.equal(soundingNote(board, PAD_BASE), 48);
  assert.equal(soundingNote(board, PAD_BASE + 1), 72);
  assert.equal(soundingNote(board, PAD_BASE + 2), null);
  assert.equal(soundingNote(board, PAD_BASE - 1), null);
  const pads = withGenerator(board, "sampler");
  assert.equal(soundingNote(pads, PAD_BASE + 1), PAD_BASE + 1);
});

test("what the voice plays", () => {
  assert.deepEqual(voiceSpec(clampInstrument({ generator: { kind: "piano", instrument: "FLUTE" } })), { kind: "piano", instrument: "FLUTE" });
  assert.deepEqual(voiceSpec(clampInstrument({ controller: "piano", generator: { kind: "sampler", root: 57, sample: "s1" } })), { kind: "pitched", sample: "s1", root: 57 });
  assert.deepEqual(voiceSpec(clampInstrument({ controller: "scalepiano", generator: { kind: "sampler" } })), { kind: "pitched", sample: null, root: 60 });
  assert.deepEqual(voiceSpec(clampInstrument({ controller: "soundboard", pads: 2, generator: { kind: "sampler", padSamples: ["a", null] } })), { kind: "pads", samples: ["a", null] });
});

test("pad keys: number row, then Q, A and Z rows, only up to the pad count", () => {
  assert.equal(padIndexOf("Digit1", 8), 0);
  assert.equal(padIndexOf("Digit0", 10), 9);
  assert.equal(padIndexOf("KeyQ", 11), 10);
  assert.equal(padIndexOf("KeyQ", 8), null);
  assert.equal(padIndexOf("KeyM", 32), null); // the 36th key is past 32 pads
  assert.equal(padIndexOf("Space", 32), null);
});

test("old saves: Scale Pianos and the keyboard become instruments with the same strip ids", () => {
  const inputs = [
    { id: 0, kind: "device", name: "Guitar", deviceId: "d", mode: "left", volume: 1 },
    { id: 3, kind: "extra", name: "Piano", deviceId: "", mode: "stereo", volume: 0.7 },
    { id: 4, kind: "scalepiano", sourceId: "p2", name: "Piano C major", deviceId: "", mode: "stereo", volume: 1 },
    { id: 5, kind: "scalepiano", sourceId: "p1", name: "Old", deviceId: "", mode: "stereo", volume: 1 },
  ];
  const scalePianos = { p2: { root: 2, scale: "dorian", octave: 4, instrument: "CELLO" }, p1: { instrument: "user:abc" } };
  const m = migrateSaves({ inputs, scalePianos, instruments: null })!;
  assert.deepEqual(m.inputs.map((s) => [s.id, s.kind, s.sourceId]), [[0, "device", undefined], [3, "instrument", "p3"], [4, "instrument", "p2"], [5, "instrument", "p1"]]);
  assert.equal(m.inputs[1].volume, 0.7);
  assert.equal(m.instruments.p3.controller, "piano");
  assert.deepEqual([m.instruments.p2.controller, m.instruments.p2.root, m.instruments.p2.scale, m.instruments.p2.octave], ["scalepiano", 2, "dorian", 4]);
  assert.deepEqual(m.instruments.p2.generator, { kind: "piano", instrument: "CELLO", padNotes: [60, 61, 62, 63, 64, 65, 66, 67] });
  // a sampler instrument from the old page is gone: the built-in piano plays instead
  assert.equal(m.instruments.p1.generator.kind === "piano" && m.instruments.p1.generator.instrument, "PIANO");
});

test("migration runs once: migrated or new saves are left alone", () => {
  const first = migrateSaves({ inputs: [{ id: 1, kind: "extra", name: "Piano" }], scalePianos: null, instruments: null })!;
  assert.equal(migrateSaves({ inputs: first.inputs, scalePianos: null, instruments: first.instruments }), null);
  assert.equal(migrateSaves({ inputs: [{ id: 0, kind: "device", name: "G" }], scalePianos: null, instruments: null }), null);
  assert.equal(migrateSaves({ inputs: null, scalePianos: null, instruments: null }), null);
  assert.equal(migrateSaves({ inputs: "junk", scalePianos: null, instruments: null }), null);
});
