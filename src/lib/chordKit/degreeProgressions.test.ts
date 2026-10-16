import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { progressionForDegree } from "./degreeProgressions";

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
  it("gives every chord a shape in C major", () => {
    const ctx = makeKeyContext(0, 0, 0);
    for (let d = 0; d < 7; d++) progressionForDegree(ctx, d).chords.forEach((c) => assert.ok(c.pick, `${c.name}`));
  });
});
