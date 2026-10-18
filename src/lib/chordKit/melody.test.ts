import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { colourDegrees, generateMelody, scalePool } from "./melody";

/** A seeded generator, so a failing run can be replayed. */
function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("colourDegrees: what sets a mode apart", () => {
  it("major and natural minor have none", () => {
    assert.deepEqual(colourDegrees(makeKeyContext(0, 0, 0).steps), []);
    assert.deepEqual(colourDegrees(makeKeyContext(0, 0, 5).steps), []);
  });
  it("Dorian's 6, Lydian's ♯4, Mixolydian's ♭7", () => {
    assert.deepEqual(colourDegrees(makeKeyContext(0, 0, 1).steps), [5]);
    assert.deepEqual(colourDegrees(makeKeyContext(0, 0, 3).steps), [3]);
    assert.deepEqual(colourDegrees(makeKeyContext(0, 0, 4).steps), [6]);
  });
});

describe("generateMelody", () => {
  const dorian = makeKeyContext(2, 0, 1);
  const pool = scalePool(62, dorian.steps);

  for (let seed = 1; seed <= 200; seed++) {
    const tune = generateMelody(pool, dorian.steps, rngFrom(seed));
    it(`seed ${seed}: six full bars, scale notes only, ends on a long root`, () => {
      assert.equal(tune.reduce((t, n) => t + n.eighths, 0), 48);
      for (const n of tune) assert.ok(pool.includes(n.note));
      const last = tune[tune.length - 1];
      assert.equal(last.note.degree, 0);
      assert.ok(last.eighths >= 4);
      // stepped into the root
      assert.equal(Math.abs(pool.indexOf(tune[tune.length - 2].note) - pool.indexOf(last.note)), 1);
    });
    it(`seed ${seed}: no note three times in a row`, () => {
      for (let i = 2; i < tune.length - 1; i++) assert.ok(!(tune[i].note === tune[i - 1].note && tune[i].note === tune[i - 2].note));
    });
  }

  it("mostly moves by step", () => {
    const sorted = [...pool].sort((a, b) => a.midi - b.midi);
    let steps = 0;
    let moves = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const tune = generateMelody(pool, dorian.steps, rngFrom(seed));
      for (let i = 1; i < tune.length; i++) {
        moves++;
        if (Math.abs(sorted.indexOf(tune[i].note) - sorted.indexOf(tune[i - 1].note)) <= 1) steps++;
      }
    }
    assert.ok(steps / moves > 0.55, `${steps}/${moves} stepwise`);
  });

  it("works from a tiny pool", () => {
    assert.deepEqual(generateMelody([], [0, 2, 4, 5, 7, 9, 11]), []);
    assert.equal(generateMelody([{ midi: 60, degree: 0 }], [0, 2, 4, 5, 7, 9, 11]).length, 1);
  });
});
