import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { arpPositions, buildArpeggio, neckCells } from "./arpeggios";

const shapes = (tonic: number, kind: string) => {
  const ctx = makeKeyContext(tonic, 0, 0);
  return arpPositions(neckCells(ctx, buildArpeggio(ctx, 0, kind)));
};

describe("arpeggio positions", () => {
  it("has one position per root string, each starting on the root and climbing", () => {
    for (let tonic = 0; tonic < 12; tonic++) {
      const ps = shapes(tonic, "seventh");
      assert.deepEqual([...new Set(ps.map((p) => p.rootString))], [0, 1, 2, 3, 4]);
      for (const p of ps) {
        assert.equal(p.notes[0].arp?.role, "R");
        assert.equal(p.notes[0].string, p.rootString);
        for (let i = 1; i < p.notes.length; i++) {
          assert.ok(p.notes[i].midi > p.notes[i - 1].midi);
          assert.ok(p.notes[i].string >= p.notes[i - 1].string);
        }
        assert.ok(p.to - p.from <= 5, `span ${p.from}-${p.to}`);
      }
    }
  });

  it("gives an open-string root two positions: open and 12th fret", () => {
    const e = shapes(4, "triad").filter((p) => p.rootString === 0);
    assert.deepEqual(e.map((p) => p.rootFret), [0, 12]);
    assert.ok(e[0].to <= 4);
    assert.equal(shapes(9, "triad").filter((p) => p.rootString === 0).length, 1);
  });

  it("plays the classic A major triad shape with the root on the 6th string", () => {
    const p = shapes(9, "triad")[0];
    assert.deepEqual(p.notes.map((n) => `${6 - n.string}:${n.fret}`), ["6:5", "5:4", "5:7", "4:7", "3:6", "2:5", "1:5"]);
  });
});
