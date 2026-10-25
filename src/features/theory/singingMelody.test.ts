import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BARS, BEATS_PER_BAR, makeMelody, spanOf, type Complexity, type MelodyLength } from "./singingMelody";

const LEVELS: Complexity[] = ["easy", "medium", "hard"];
const LENGTHS: MelodyLength[] = ["short", "long"];
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

describe("singing melodies", () => {
  it("the same seed makes the same melody, another seed another one", () => {
    assert.deepEqual(makeMelody(42, "long", "medium", 7, 14), makeMelody(42, "long", "medium", 7, 14));
    const all = new Set(SEEDS.map((s) => JSON.stringify(makeMelody(s, "long", "medium", 7, 14))));
    assert.ok(all.size > 150);
  });

  for (const length of LENGTHS)
    for (const level of LEVELS)
      it(`${length} ${level}: whole bars of 4/4, a whole-note Do at the end, reached by step, inside the span`, () => {
        for (const perOctave of [7, 5])
          for (const s of SEEDS) {
            const m = makeMelody(s, length, level, perOctave, 14);
            const end = m.at(-1)!;
            assert.equal(end.beats, BEATS_PER_BAR);
            assert.equal(end.at, (BARS[length] - 1) * BEATS_PER_BAR);
            assert.ok(end.step === 0 || end.step === perOctave);
            assert.equal(Math.abs(m.at(-2)!.step - end.step), 1);
            const total = m.reduce((t, n) => t + n.beats, 0);
            assert.equal(total, BARS[length] * BEATS_PER_BAR);
            // no note crosses a barline
            for (const n of m) assert.ok(Math.floor(n.at / 4) === Math.floor((n.at + n.beats - 0.001) / 4));
            const span = spanOf(level, perOctave);
            for (const n of m) assert.ok(n.step >= 0 && n.step <= span, `${n.step} out of 0..${span}`);
          }
      });

  it("easy moves only by step (or stays), starts on Do and uses no eighths", () => {
    for (const s of SEEDS) {
      const m = makeMelody(s, "long", "easy", 7, 14);
      assert.equal(m[0].step, 0);
      for (let i = 1; i < m.length; i++) assert.ok(Math.abs(m[i].step - m[i - 1].step) <= 1);
      assert.ok(m.every((n) => Number.isInteger(n.beats)));
    }
  });

  it("hard melodies use eighths and leaps somewhere", () => {
    const ms = SEEDS.map((s) => makeMelody(s, "long", "hard", 7, 14));
    assert.ok(ms.some((m) => m.some((n) => n.beats === 0.5)));
    assert.ok(ms.some((m) => m.some((n, i) => i > 0 && Math.abs(n.step - m[i - 1].step) >= 4)));
  });

  it("a narrow range keeps the melody under its top", () => {
    for (const s of SEEDS) {
      const m = makeMelody(s, "long", "hard", 7, 3);
      assert.ok(m.every((n) => n.step <= 3));
      assert.equal(m.at(-1)!.step, 0);
    }
  });
});
