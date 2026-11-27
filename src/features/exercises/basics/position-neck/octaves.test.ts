import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scaleBoxes } from "../scale-neck/boxes";
import { octaves } from "./octaves";

const box = (pc: number, n: number) => scaleBoxes("minor-pentatonic", pc).positions.find((p) => p.number === n)!;
const spans = (pc: number, n: number) => octaves(box(pc, n)).map((p) => [p.from, p.to]);

describe("octaves", () => {
  it("C minor pentatonic position 3 sits at the open strings and again at fret 12", () => {
    assert.deepEqual(spans(0, 3), [[0, 4], [12, 16]]);
  });
  it("a position with no room an octave away has one place", () => {
    assert.equal(octaves(box(0, 1)).length, 1);
    assert.equal(octaves(box(0, 4)).length, 1);
  });
  it("puts the lowest place first", () => {
    for (let pc = 0; pc < 12; pc++) for (let n = 1; n <= 5; n++) {
      const all = octaves(box(pc, n));
      assert.ok(all.every((p, i) => !i || p.from > all[i - 1].from));
      assert.ok(all[0].from < 12, `pc ${pc} position ${n} starts at ${all[0].from}`);
    }
  });
});
