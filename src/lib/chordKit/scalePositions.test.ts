import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { pentatonicOf, positionLine, positionMidi, positionsFor, rootStrings, scaleCells, scaleLineMidi } from "./scalePositions";

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

describe("five positions, named by the strings the root is on", () => {
  const aMinor = makeKeyContext(9, 0, 5);
  const ROOTS = [[0, 2, 5], [2, 4], [1, 4], [1, 3], [0, 3, 5]]; // E D e · D B · A B · A G · E G e

  it("A minor pentatonic: the classic five boxes, climbing from the 5th fret", () => {
    const boxes = positionsFor(aMinor, "pentatonic");
    assert.deepEqual(boxes.map((b) => `${b.from}-${b.to}`), ["5-8", "7-10", "9-13", "12-15", "14-17"]);
    assert.deepEqual(frets(boxes[0]), [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]);
    assert.deepEqual(boxes.map(rootStrings), ROOTS);
  });

  it("A minor scale position 1 is the 5th-position shape", () => {
    assert.deepEqual(frets(positionsFor(aMinor, "scale")[0]), [[5, 7, 8], [5, 7, 8], [5, 7, 9], [5, 7], [5, 6, 8], [5, 7, 8]]);
  });

  it("major and minor pentatonic keep the root pattern in every key, and stay at two notes per string away from the nut", () => {
    for (let pc = 0; pc < 12; pc++) for (const m of [0, 1, 2, 3, 4, 5]) {
      positionsFor(makeKeyContext(pc, 0, m), "pentatonic").forEach((p, i) => {
        assert.ok(ROOTS[i].every((s) => rootStrings(p).includes(s)), `${pc} ${m} position ${i + 1}`);
        if (p.from > 2) for (let s = 0; s < 6; s++) assert.equal(p.notes.filter((n) => n.string === s).length, 2);
      });
    }
  });

  it("next to the nut the open strings are part of the shape (E major position 1)", () => {
    const [p1] = positionsFor(makeKeyContext(4, 0, 0), "pentatonic");
    assert.deepEqual(frets(p1), [[0, 2, 4], [2, 4], [2, 4], [1, 4], [0, 2, 5], [0, 2, 4]]);
  });

  it("an odd pentatonic's box takes in the note one fret below it, so the root is not left out", () => {
    const boxes = positionsFor(makeKeyContext(7, 1, 4), "pentatonic"); // G Phrygian dominant
    assert.deepEqual(frets(boxes[1]), [[3, 4, 7], [5, 6], [5, 6], [4, 7], [3, 4, 8], [3, 4, 7]]);
  });

  it("in every key and mode: five positions, no fret below the nut or past 17, a playable span, the root pattern away from the nut", () => {
    for (let pc = 0; pc < 12; pc++) for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) {
      const ctx = makeKeyContext(pc, f, m);
      for (const kind of ["pentatonic", "scale"] as const) {
        const ps = positionsFor(ctx, kind);
        const tag = `${pc} ${f} ${m} ${kind}`;
        assert.equal(ps.length, 5, tag);
        const places = ps.map((p) => p.notes.map((n) => `${n.string}-${n.fret}`).join(" "));
        assert.equal(new Set(places).size, 5, `${tag} two positions are the same`);
        ps.forEach((p, i) => {
          assert.ok(p.from >= 0 && p.to <= 17, tag);
          assert.ok(p.to - p.from <= 7, `${tag} spans ${p.from}-${p.to}`);
          if (p.from > 2) assert.ok(ROOTS[i].every((s) => rootStrings(p).includes(s)), `${tag} position ${i + 1} roots ${rootStrings(p)}`);
          if (kind === "scale") assert.equal(new Set(positionLine(p).map((n) => n.degree)).size, 7, `${tag} position ${i + 1} misses a note`);
          const line = positionLine(p);
          for (let k = 1; k < line.length; k++) assert.ok(line[k].midi > line[k - 1].midi, tag);
        });
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
