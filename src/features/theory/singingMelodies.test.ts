import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BOOK, LEVELS, STAGES, parseTune, placeTune } from "./singingMelodies";
import { VOICES, buildLadder } from "./singing";

describe("the melody book", () => {
  it("reads the tune notation", () => {
    assert.deepEqual(parseTune("1 2e 3e 5,q. 1'e | 1w"), [
      { step: 0, beats: 1, at: 0 },
      { step: 1, beats: 0.5, at: 1 },
      { step: 2, beats: 0.5, at: 1.5 },
      { step: -3, beats: 1.5, at: 2 },
      { step: 7, beats: 0.5, at: 3.5 },
      { step: 0, beats: 4, at: 4 },
    ]);
    assert.throws(() => parseTune("1 8"));
  });

  for (const t of BOOK)
    it(`#${t.n} (${t.stage.title}): whole bars, ends on a whole-note Do reached by step`, () => {
      for (const n of t.notes) assert.equal(Math.floor(n.at / 4), Math.floor((n.at + n.beats - 0.001) / 4), `note at ${n.at} crosses a barline`);
      const end = t.notes.at(-1)!;
      assert.equal(end.beats, 4);
      assert.equal(end.at % 4, 0);
      assert.ok(end.step === 0 || end.step === 7);
      assert.equal(Math.abs(t.notes.at(-2)!.step - end.step) <= 2, true);
      assert.ok([2, 4].includes((end.at + 4) / 4));
    });

  it("each stage stays with the notes it has reached", () => {
    const reach: Record<string, number[]> = { "do-re": [0, 1], mi: [0, 1, 2], fa: [0, 1, 2, 3], sol: [0, 1, 2, 3, 4], skips: [0, 1, 2, 3, 4], thirds: [0, 1, 2, 3, 4] };
    for (const s of STAGES.filter((s) => reach[s.id]))
      for (const n of BOOK.filter((t) => t.stage === s).flatMap((t) => t.notes)) assert.ok(reach[s.id].includes(n.step), `${s.id} uses step ${n.step}`);
  });

  it("past Do and Re, every tune uses at least three notes", () => {
    for (const t of BOOK.filter((t) => t.stage !== STAGES[0])) assert.ok(new Set(t.notes.map((n) => n.step)).size >= 3, `#${t.n}`);
  });

  it("steps first, the widest leaps last", () => {
    const widest = STAGES.map((s) => Math.max(...BOOK.filter((t) => t.stage === s).flatMap((t) => t.notes.slice(1).map((n, i) => Math.abs(n.step - t.notes[i].step)))));
    assert.equal(widest[0], 1);
    assert.ok(widest.slice(0, 4).every((w) => w <= 2));
    assert.ok(widest.at(-2)! > Math.max(...widest.slice(0, -2)) - 1);
    assert.ok(widest.at(-1)! >= 7);
  });

  it("both lengths come up in every stage", () => {
    for (const s of STAGES) {
      const ls = new Set(BOOK.filter((t) => t.stage === s).map((t) => t.length));
      assert.deepEqual([...ls].sort(), ["long", "short"], s.id);
    }
  });

  it("places a tune in the voice: one dipping under Do starts from the Do an octave up", () => {
    const l = buildLadder("major-ionian", 0, VOICES.tenor)!; // C3 to C5
    const up = placeTune(parseTune("5, 1 2 7, | 1w"), l, VOICES.tenor);
    assert.deepEqual(up.map((n) => n.spelled.name), ["G", "C", "D", "B", "C"]);
    assert.equal(up[1].midi, 60);
    const low = placeTune(parseTune("1 2 3 2 | 1w"), l, VOICES.tenor);
    assert.ok(low.every((n) => n.midi >= 48 && n.midi <= 72));
    for (const t of BOOK) for (const n of placeTune(t.notes, l, VOICES.tenor)) assert.ok(n.midi >= 48 && n.midi <= 72);
  });
});

describe("the levels", () => {
  it("are four, each starting at a stage, in book order", () => {
    assert.equal(LEVELS.length, 4);
    const at = LEVELS.map((l) => STAGES.findIndex((s) => s.id === l.from));
    assert.equal(at[0], 0);
    for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1]);
  });
});
