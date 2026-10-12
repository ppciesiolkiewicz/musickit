import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPEN_SHAPES } from "./openShapes";
import { SHAPES, type Shape } from "./shapes";
import { ALL_SHAPES, OPEN_RICH, RICH_SHAPES, ROOT_INDEX, fitsRoot, openRootPc, rootFretFor, shapeSemitones } from "./shapeTools";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const label = (s: Shape) => `${NAMES[openRootPc(s) ?? 0]}${s.suf}`;

describe("open chords", () => {
  it("are the chords the course teaches, by name", () => {
    const names = OPEN_SHAPES.map((s) => label(s)).sort();
    assert.deepEqual(names, ["A", "A7", "Am", "Am7", "Asus2", "B7", "C", "C7", "Cadd9", "D", "D7", "Dm", "Dsus2", "Dsus4", "E", "E7", "Em", "Em7", "Esus4", "Fmaj7", "G", "G7"].sort());
  });
  it("stage 1 is the eight first chords", () => {
    assert.deepEqual(OPEN_SHAPES.filter((s) => s.stage === 1).map((s) => label(s)).sort(), ["A", "Am", "C", "D", "Dm", "E", "Em", "G"]);
  });
  it("each fingering sounds its expected intervals, root offset 0, no fret below 0", () => {
    for (const s of OPEN_SHAPES) {
      assert.equal(s.f[ROOT_INDEX[s.rs]], 0, label(s));
      assert.ok(s.at !== undefined && s.f.every((v) => v === null || s.at! + v >= 0), label(s));
      const got = [...new Set(shapeSemitones(s).filter((v): v is number => v !== null))].sort((a, b) => a - b);
      assert.deepEqual(got, [...s.exp].sort((a, b) => a - b), label(s));
      assert.ok(s.tags.includes("open"), label(s));
    }
  });
  it("are easy, carry ids from 1000, and only fit their own root", () => {
    OPEN_RICH.forEach((s, i) => {
      assert.equal(s.diff, "easy");
      assert.equal(s.id, 1000 + i);
      const pc = openRootPc(s)!;
      for (let r = 0; r < 12; r++) assert.equal(fitsRoot(s, r), r === pc);
      assert.equal(rootFretFor(s, pc), s.at);
    });
  });
  it("RICH_SHAPES stays movable-only; ALL_SHAPES has both", () => {
    assert.ok(RICH_SHAPES.every((s) => s.at === undefined));
    assert.equal(ALL_SHAPES.length, RICH_SHAPES.length + OPEN_RICH.length);
    assert.ok(RICH_SHAPES.every((s) => [0, 5, 11].every((pc) => fitsRoot(s, pc))));
  });
  it("adds 6th- and 5th-string power chords", () => {
    const p = SHAPES.filter((s) => s.suf === "5");
    assert.deepEqual(p.map((s) => s.rs).sort(), [5, 6]);
    p.forEach((s) => { assert.equal(s.fam, "power"); assert.deepEqual(s.exp, [0, 7]); });
  });
});
