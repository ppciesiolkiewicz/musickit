import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pentatonicContext, findPentatonic } from "@/features/theory/pentatonics";
import { pentatonicPositions } from "@/lib/chordKit/scalePositions";
import { parsePlacement, pickBox, type BoxInfo } from "./placement";

const B: BoxInfo[] = [
  { number: 1, from: 5, to: 8, roots: [{ string: 0, fret: 5 }, { string: 3, fret: 7 }] },
  { number: 2, from: 7, to: 10, roots: [{ string: 3, fret: 7 }] },
  { number: 5, from: 0, to: 3, roots: [{ string: 1, fret: 0 }] },
];

describe("placement", () => {
  it("open picks the lowest box, fret the nearest", () => {
    assert.deepEqual(pickBox(B, { by: "open" }), { number: 5, shift: 0 });
    assert.deepEqual(pickBox(B, { by: "fret", fret: 6 }), { number: 1, shift: 0 });
    assert.deepEqual(pickBox(B, { by: "fret", fret: 9 }), { number: 2, shift: 0 });
  });

  it("root picks the box with the root on that string under the first finger", () => {
    assert.deepEqual(pickBox(B, { by: "root", string: 6 }), { number: 1, shift: 0 });
    assert.deepEqual(pickBox(B, { by: "root", string: 5 }), { number: 5, shift: 0 });
  });

  it("box picks that box, or nothing", () => {
    assert.deepEqual(pickBox(B, { by: "box", box: 2 }), { number: 2, shift: 0 });
    assert.equal(pickBox(B, { by: "box", box: 4 }), null);
  });

  it("a box high on the neck can be played an octave down", () => {
    const high: BoxInfo[] = [{ number: 1, from: 5, to: 8, roots: [{ string: 0, fret: 5 }] }, { number: 4, from: 12, to: 15, roots: [{ string: 1, fret: 12 }] }];
    assert.deepEqual(pickBox(high, { by: "open" }), { number: 4, shift: -12 });
    assert.deepEqual(pickBox(high, { by: "root", string: 5 }), { number: 4, shift: -12 });
    assert.deepEqual(pickBox(high, { by: "fret", fret: 13 }), { number: 4, shift: 0 });
  });

  it("a root no box holds resolves to nothing", () => {
    assert.equal(pickBox(B, { by: "root", string: 4 }), null);
  });

  it("A minor pentatonic: root on the low E is box 1; the open box starts low", () => {
    const pent = findPentatonic("minor-pentatonic")!;
    const p = pentatonicContext(9, pent);
    const boxes: BoxInfo[] = pentatonicPositions(p.host, p.degrees).positions.map((b) => ({
      number: b.number, from: b.from, to: b.to,
      roots: b.notes.filter((c) => c.semi === 0).map((c) => ({ string: c.string, fret: c.fret })),
    }));
    assert.deepEqual(pickBox(boxes, { by: "root", string: 6 }), { number: 1, shift: 0 });
    // the boxes run up from fret 5; the open position is box 4 (frets 12-15) an octave down
    assert.deepEqual(pickBox(boxes, { by: "open" }), { number: 4, shift: -12 });
    assert.deepEqual(pickBox(boxes, { by: "fret", fret: 2 }), { number: 4, shift: -12 });
  });

  it("parses placements, dropping what is out of range", () => {
    assert.deepEqual(parsePlacement({ by: "open" }), { by: "open" });
    assert.deepEqual(parsePlacement({ by: "box", box: 3 }), { by: "box", box: 3 });
    assert.deepEqual(parsePlacement({ by: "fret", fret: 7 }), { by: "fret", fret: 7 });
    assert.deepEqual(parsePlacement({ by: "root", string: 5 }), { by: "root", string: 5 });
    assert.deepEqual(parsePlacement({ by: "chords" }), { by: "chords" });
    assert.equal(parsePlacement({ by: "fret", fret: 22 }), null);
    assert.equal(parsePlacement({ by: "root", string: 3 }), null);
    assert.equal(parsePlacement({ by: "box", box: 9 }), null);
    assert.equal(parsePlacement("open"), null);
  });
});
