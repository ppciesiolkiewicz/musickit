import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expandShape } from "../shapes";
import { columnsOf, readRiff, writeRiff } from "./riff";

const A5 = { frets: [{ string: 6, fret: 5, beats: 1 }, { string: 5, fret: 7, beats: 1 }], beats: 1 };
const WRITTEN = [A5, { string: 4, fret: 7, beats: 0.5 }, { rest: 0.5 }, { string: 4, fret: 5, beats: 2 }];

describe("a written riff", () => {
  it("reads into notes and writes back the same", () => {
    const read = readRiff(WRITTEN);
    assert.ok("notes" in read);
    assert.deepEqual(read.notes[0], { string: 0, fret: 5, beats: 1 });
    assert.deepEqual(read.notes[1], { string: 1, fret: 7, beats: 1, with: true });
    assert.deepEqual(read.notes[3], { string: null, fret: null, beats: 0.5 });
    assert.equal(columnsOf(read.notes).reduce((a, c) => a + c.beats, 0), 4);
    assert.deepEqual(writeRiff(read.notes), WRITTEN);
  });

  it("names the step it can't read", () => {
    const bad = (notes: unknown) => { const r = readRiff(notes); return "error" in r ? r.error : ""; };
    assert.match(bad([{ string: 7, fret: 5, beats: 1 }]), /step 1 is not a note on the neck/);
    assert.match(bad([A5, { string: 4, fret: 5, beats: 0.3 }]), /step 2 has length 0.3/);
    assert.match(bad([{ frets: [{ string: 4, fret: 5, beats: 1 }, { string: 4, fret: 7, beats: 1 }], beats: 1 }]), /one note a string/);
    assert.match(bad([{ rest: 5 }]), /rest of length 5/);
    assert.equal(bad([{ rest: 1 }]), "no notes");
    assert.equal(bad([]), "no notes");
    assert.equal(bad("x"), "no notes");
  });

  it("plays through the riff shape in its key, at the play-along's tempo", () => {
    const t = expandShape({ shape: "riff", key: "a", notes: WRITTEN, bpm: 70 })!;
    assert.equal(t.bars, 1);
    assert.equal(t.bpm, 70);
    const steps = t.events.filter((e) => e.type === "step");
    assert.equal(steps.length, 3);
    // A5 with its root on the low E string: A and the E a 5th above, counted from the A an octave higher (`melodyTonic`)
    assert.deepEqual(steps[0].step, { kind: "grip", semis: [-12, -5], strings: [6, 5], from: "key", fret: 6 });
    assert.deepEqual(steps[1].step, { kind: "note", semis: 0, from: "key", string: 4 });
    assert.equal(steps[2].at, 2);
    assert.equal(expandShape({ shape: "riff", notes: WRITTEN }), null);
    assert.equal(expandShape({ shape: "riff", key: "a", notes: [] }), null);
  });
});
