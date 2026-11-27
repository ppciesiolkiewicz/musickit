import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitChords, type ChordPart } from "./chordNames";

const show = (parts: ChordPart[]) => parts.map((p) => (typeof p === "string" ? p : `[${p.chord}]`)).join("");

describe("chord names in article text", () => {
  it("marks chords, not strings, named notes or the word A", () => {
    assert.equal(show(splitChords("Fmaj7 is F with one more note: E, the 7th, on the open high e string.")), "[Fmaj7] is [F] with one more note: E, the 7th, on the open high e string.");
    assert.equal(show(splitChords("A fill on the A string, then the low E. One fret up it's Cm, two frets up C♯m.")), "A fill on the A string, then the low E. One fret up it's [Cm], two frets up [C♯m].");
    assert.equal(show(splitChords("Slide it up for G, and two more for A.")), "Slide it up for [G], and two more for [A].");
    assert.equal(show(splitChords("Four notes of the C minor pentatonic scale, in G major, over Cm.")), "Four notes of the C minor pentatonic scale, in G major, over [Cm].");
  });

  it("leaves {{…}} notes and chords whole", () => {
    assert.equal(show(splitChords("{{b7}} over {{chord:V7}} in Am")), "{{b7}} over {{chord:V7}} in [Am]");
  });
});
