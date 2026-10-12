import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tabFor } from "./tab";
import { OPEN_MIDI } from "./shapeTools";

const one = (note: string, position = 0) => tabFor([{ note, beats: 1 }], position)[0];

describe("tab positions", () => {
  it("puts notes on the highest string inside the hand position", () => {
    assert.deepEqual([one("E4").string, one("E4").fret], [5, 0]);
    assert.deepEqual([one("C4").string, one("C4").fret], [4, 1]);
    assert.deepEqual([one("D5", 5).string, one("D5", 5).fret], [5, 10]);
    assert.deepEqual([one("A4", 5).string, one("A4", 5).fret], [5, 5]);
    assert.deepEqual([one("E4", 5).string, one("E4", 5).fret], [4, 5]); // B fret 5 beats G fret 9: both in position
  });
  it("every note sounds its pitch", () => {
    const t = tabFor(["E4", "F4", "G4", "C4", "D4", "G#4", "B3", "C5"].map((note) => ({ note, beats: 1 })), 0);
    t.forEach((n) => assert.equal(OPEN_MIDI[n.string] + n.fret, n.midi));
  });
  it("refuses notes below the guitar", () => {
    assert.throws(() => one("C2"));
  });
});
