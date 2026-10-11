import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { pentatonicOf, positionMidi, positionsFor, scaleCells, scaleLineMidi, scalePositions } from "./scalePositions";

const frets = (p: { notes: { string: number; fret: number }[] }) => [0, 1, 2, 3, 4, 5].map((s) => p.notes.filter((n) => n.string === s).map((n) => n.fret));

describe("pentatonicOf: the five-note scale inside a mode", () => {
  it("major-3rd modes keep 1 2 3 5 6", () => {
    for (const m of [0, 3, 4]) assert.equal(pentatonicOf(makeKeyContext(0, 0, m).steps).name, "Major pentatonic");
  });
  it("minor-3rd modes keep 1 b3 4 5 b7", () => {
    for (const m of [1, 2, 5]) assert.equal(pentatonicOf(makeKeyContext(0, 0, m).steps).name, "Minor pentatonic");
  });
  it("Locrian gets the same cut, named by its formula", () => {
    const p = pentatonicOf(makeKeyContext(0, 0, 6).steps);
    assert.equal(p.name, "Pentatonic 1 ♭3 4 ♭5 ♭7");
    assert.deepEqual(p.degrees, [0, 2, 3, 4, 6]);
  });
});

describe("scalePositions", () => {
  const aMinor = makeKeyContext(9, 0, 5);

  it("A minor pentatonic position 1 is the classic box at the 5th fret", () => {
    const [p1] = positionsFor(aMinor, "pentatonic");
    assert.deepEqual(frets(p1), [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]);
    assert.equal(p1.from, 5);
    assert.equal(p1.to, 8);
  });

  it("the five pentatonic boxes start on each note of the pentatonic, climbing the neck", () => {
    const boxes = positionsFor(aMinor, "pentatonic");
    assert.equal(boxes.length, 5);
    assert.deepEqual(boxes.map((b) => b.notes[0].fret), [5, 8, 10, 12, 15]);
    assert.deepEqual(frets(boxes[1]), [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]]);
  });

  it("three notes per string gives seven positions of 18 notes, all in the scale", () => {
    const ps = positionsFor(makeKeyContext(0, 0, 0), "threeNps");
    assert.equal(ps.length, 7);
    for (const p of ps) {
      assert.equal(p.notes.length, 18);
      assert.ok(p.notes.every((n) => n.fret >= 0));
      for (let k = 1; k < p.notes.length; k++) assert.ok(p.notes[k].midi > p.notes[k - 1].midi);
    }
    // G major position starting on G (3rd fret)
    assert.deepEqual(frets(scalePositions(makeKeyContext(7, 0, 0), [0, 1, 2, 3, 4, 5, 6], 3)[0]), [[3, 5, 7], [3, 5, 7], [4, 5, 7], [4, 5, 7], [5, 7, 8], [5, 7, 8]]);
  });

  it("no fret is ever negative and every box fits a playable span", () => {
    for (let pc = 0; pc < 12; pc++) for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) {
      const ctx = makeKeyContext(pc, f, m);
      for (const kind of ["pentatonic", "threeNps"] as const) for (const p of positionsFor(ctx, kind)) {
        assert.ok(p.from >= 0, `${pc} ${f} ${m} ${kind}`);
        assert.ok(p.to - p.from <= 7, `${pc} ${f} ${m} ${kind} spans ${p.from}-${p.to}`);
      }
    }
  });

  it("a position plays up and back down", () => {
    const m = positionMidi(positionsFor(aMinor, "pentatonic")[0]);
    assert.equal(m.length, 23);
    assert.equal(m[0], 45);
    assert.equal(m[m.length - 1], 45);
  });
});

describe("scaleCells and scaleLineMidi", () => {
  it("lists every scale note with its degree and spelling", () => {
    const cells = scaleCells(makeKeyContext(7, 0, 0), 12);
    const f = cells.find((c) => c.string === 0 && c.fret === 2)!;
    assert.equal(f.name, "F♯");
    assert.equal(f.degree, 6);
  });
  it("plays the scale up an octave and back", () => {
    assert.deepEqual(scaleLineMidi(makeKeyContext(0, 0, 0)), [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]);
  });
});
