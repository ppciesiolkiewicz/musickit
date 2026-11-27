import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitChords, titleChords, type ChordPart } from "./chordNames";

const show = (parts: ChordPart[]) => parts.map((p) => (typeof p === "string" ? p : `[${p.chord}]`)).join("");

describe("chord names in article text", () => {
  it("marks chords, not strings, named notes or the word A", () => {
    assert.equal(show(splitChords("Fmaj7 is F with one more note: E, the 7th, on the open high e string.")), "[Fmaj7] is [F] with one more note: E, the 7th, on the open high e string.");
    assert.equal(show(splitChords("A fill on the A string, then the low E. One fret up it's Cm, two frets up C♯m.")), "A fill on the A string, then the low E. One fret up it's [Cm], two frets up [C♯m].");
    assert.equal(show(splitChords("Slide it up for G, and two more for A.")), "Slide it up for [G], and two more for [A].");
  });

  it("leaves {{…}} notes and chords whole", () => {
    assert.equal(show(splitChords("{{b7}} over {{chord:V7}} in Am")), "{{b7}} over {{chord:V7}} in [Am]");
  });

  it("chips a chord quality in a title, so A 9 chord isn't A9", () => {
    assert.equal(show(titleChords("6. A 9 chord")), "6. A [9] chord");
    assert.equal(show(titleChords("7. A maj7 on the low E")), "7. A [maj7] on the low E");
    assert.equal(show(titleChords("2. B7 for B")), "2. [B7] for [B]");
  });
});
