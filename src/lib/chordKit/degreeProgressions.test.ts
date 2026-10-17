import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { colourDegrees, progressionForDegree } from "./degreeProgressions";
import { placedChordName } from "./chordShapes";
import { ALL_SHAPES } from "./shapeTools";

describe("progression for a chord of the mode", () => {
  it("has four chords, all different, and holds its own chord", () => {
    for (let f = 0; f < 3; f++)
      for (let m = 0; m < 7; m++) {
        const ctx = makeKeyContext(4, f, m);
        for (let d = 0; d < 7; d++) {
          const p = progressionForDegree(ctx, d);
          assert.equal(p.chords.length, 4);
          assert.ok(p.chords.some((c) => c.degree === d), `fam ${f} mode ${m} degree ${d}`);
          assert.equal(new Set(p.chords.map((c) => c.degree)).size, 4);
        }
      }
  });
  it("gives every chord a shape in C major", () => {
    const ctx = makeKeyContext(0, 0, 0);
    for (let d = 0; d < 7; d++) progressionForDegree(ctx, d).chords.forEach((c) => assert.ok(c.pick, `${c.name}`));
  });
  it("finds each mode's colour note", () => {
    const at = (m: number) => colourDegrees(makeKeyContext(0, 0, m));
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(at), [[6], [5], [1], [3], [6], [5], [1, 4]]);
  });
  it("Phrygian home loop leans on the ♭II and every chord gets an open shape in E", () => {
    const p = progressionForDegree(makeKeyContext(4, 0, 2), 0);
    assert.ok(p.chords.some((c) => c.roman === "♭II" && c.colour));
    assert.ok(p.chords.every((c) => c.pick && c.pick.shape.at !== undefined), p.chords.map((c) => c.name).join());
    assert.match(p.note, /♭2 \(F\)/);
  });
  it("names the v° of Phrygian as m7♭5, never as m7", () => {
    const ctx = makeKeyContext(4, 0, 2);
    const p = progressionForDegree(ctx, 4);
    const v = p.chords.find((c) => c.degree === 4)!;
    assert.equal(v.name, "Bm7♭5");
  });
});

describe("naming the chord a shape plays", () => {
  const C = makeKeyContext(0, 0, 0);
  const shape = (suf: string, f: (number | null)[]) => ALL_SHAPES.find((s) => s.suf === suf && s.f.join() === f.join())!;
  it("an m7 shell on a half-diminished degree is heard as m7♭5", () => {
    assert.equal(placedChordName(C, 6, shape("m7", [null, 0, null, 0, 1, null])), "Bm7♭5");
  });
  it("names added notes", () => {
    assert.equal(placedChordName(C, 0, shape("add9", [null, 0, -1, -3, 0, 0])), "Cadd9");
    assert.equal(placedChordName(C, 0, shape("maj7", [null, 0, 2, 1, 2, 0])), "Cmaj7");
    assert.equal(placedChordName(makeKeyContext(4, 0, 5), 0, shape("m(add9)", [0, 2, 2, 0, 0, 2])), "Em(add9)");
  });
});
