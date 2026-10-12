import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INTERVALS, describeMove, intervalPositions } from "./intervals";

const has = (list: ReturnType<typeof intervalPositions>, want: Partial<ReturnType<typeof intervalPositions>[number]>) =>
  list.some((p) => Object.entries(want).every(([k, v]) => p[k as keyof typeof p] === v));

describe("intervals on the neck", () => {
  it("lists all twelve intervals", () => {
    assert.deepEqual(INTERVALS.map((i) => i.semis), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("a 5th: seven frets on one string, or one string over and two frets up", () => {
    const p = intervalPositions(0, 3, 7);
    assert.ok(has(p, { string: 0, fret: 10, strings: 0, frets: 7 }));
    assert.ok(has(p, { string: 1, fret: 5, strings: 1, frets: 2 }));
  });
  it("octaves: two strings over two frets up, the G–B shift, three strings over three back", () => {
    assert.ok(has(intervalPositions(1, 3, 12), { string: 3, fret: 5, strings: 2, frets: 2, gb: false }));
    assert.ok(has(intervalPositions(2, 5, 12), { string: 4, fret: 8, strings: 2, frets: 3, gb: true }));
    assert.ok(has(intervalPositions(0, 5, 12), { string: 3, fret: 2, strings: 3, frets: -3 }));
  });
  it("a major 2nd from the open low E is fret 2", () => {
    assert.ok(has(intervalPositions(0, 0, 2), { string: 0, fret: 2 }));
  });
  it("stays on the neck", () => {
    for (let s = 0; s < 6; s++) for (let f = 0; f <= 12; f++) for (const iv of INTERVALS)
      intervalPositions(s, f, iv.semis, 12).forEach((p) => assert.ok(p.fret >= 0 && p.fret <= 12 && p.string >= s));
  });
  it("describes the move", () => {
    assert.equal(describeMove({ string: 0, fret: 10, strings: 0, frets: 7, gb: false }), "same string, 7 frets up");
    assert.equal(describeMove({ string: 1, fret: 5, strings: 1, frets: 2, gb: false }), "1 string over, 2 frets up");
    assert.equal(describeMove({ string: 4, fret: 8, strings: 2, frets: 3, gb: true }), "2 strings over, 3 frets up (crosses G–B)");
    assert.equal(describeMove({ string: 3, fret: 2, strings: 3, frets: -3, gb: false }), "3 strings over, 3 frets back");
    assert.equal(describeMove({ string: 2, fret: 5, strings: 1, frets: 0, gb: false }), "1 string over, same fret");
  });
});
