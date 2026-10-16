import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { loopMotion, progressionForDegree } from "./degreeProgressions";
import { shapesForChord } from "./chordShapes";
import { shapeMidi } from "./shapeTools";

describe("progression for a chord of the mode", () => {
  it("has four chords, holds its own chord, and differs for every degree", () => {
    for (let f = 0; f < 3; f++)
      for (let m = 0; m < 7; m++) {
        const ctx = makeKeyContext(4, f, m);
        const seen = new Set<string>();
        for (let d = 0; d < 7; d++) {
          const p = progressionForDegree(ctx, d);
          assert.equal(p.chords.length, 4);
          assert.ok(p.chords.some((c) => c.degree === d), `fam ${f} mode ${m} degree ${d}`);
          seen.add(p.chords.map((c) => c.degree).join());
        }
        assert.equal(seen.size, 7);
      }
  });
  it("voice-leads: the loop moves less than taking each chord's first shape", () => {
    for (let m = 0; m < 7; m++)
      for (let d = 0; d < 7; d++) {
        const ctx = makeKeyContext(4, 0, m);
        const p = progressionForDegree(ctx, d);
        const naive = p.chords.map((c) => shapesForChord(ctx, c.degree)[0]);
        assert.ok(loopMotion(p.chords.map((c) => c.pick!)) <= loopMotion(naive) + 1e-9, `mode ${m} degree ${d}`);
      }
  });
  it("plays C Am F G in C major as open chords near the nut", () => {
    const p = progressionForDegree(makeKeyContext(0, 0, 0), 0);
    p.chords.forEach((c) => assert.ok(c.pick && Math.min(...shapeMidi(c.pick.shape, c.pick.fret)) < 55, c.name));
  });
  it("names each chord by the shape it shows", () => {
    const ctx = makeKeyContext(4, 0, 2); // E Phrygian: the 5th chord is Bm7♭5
    const v = progressionForDegree(ctx, 0).chords.find((c) => c.degree === 4)!;
    assert.equal(v.name, ctx.names[4] + v.pick!.shape.suf);
    assert.match(v.name, /^B(m7♭5|°|dim)/);
  });
  it("gives every chord a shape in C major", () => {
    const ctx = makeKeyContext(0, 0, 0);
    for (let d = 0; d < 7; d++) progressionForDegree(ctx, d).chords.forEach((c) => assert.ok(c.pick, `${c.name}`));
  });
});
