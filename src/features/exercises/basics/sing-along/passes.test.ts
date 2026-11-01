import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cut, fill, passAt, passEnd, prune, regionOf, retime, snap } from "./passes";

// four quarter notes and a whole note: 8 beats
const notes = [0, 1, 2, 3].map((at) => ({ at, beats: 1 })).concat([{ at: 4, beats: 4 }]);
const chords = [{ at: 0, beats: 4 }, { at: 4, beats: 4 }];
const total = 8;

describe("sing-along passes", () => {
  it("cuts notes to a region, timed from its start", () => {
    assert.deepEqual(cut(notes, 2, 6), [{ i: 2, at: 0, beats: 1 }, { i: 3, at: 1, beats: 1 }, { i: 4, at: 2, beats: 2 }]);
  });
  it("lays the loop end to end past the horizon", () => {
    const ps = fill([], { from: 2, to: 6 }, 10, notes, chords, total);
    assert.deepEqual(ps.map((p) => p.start), [0, 4, 8]);
    assert.ok(passEnd(ps[ps.length - 1]) > 10);
    assert.equal(passAt(ps, 5)?.start, 4);
  });
  it("plays the whole tune once without a loop", () => {
    const ps = fill([], null, 100, notes, chords, total);
    assert.equal(ps.length, 1);
    assert.deepEqual([ps[0].from, ps[0].to], [0, 8]);
  });
  it("drops passes gone by", () => {
    const ps = fill([], { from: 0, to: 4 }, 20, notes, chords, total);
    assert.equal(prune(ps, 9)[0].start, 8);
  });
  it("a narrower loop ends the pass playing at its end", () => {
    const ps = fill([], { from: 0, to: 8 }, 20, notes, chords, total);
    const r = retime(ps, 1.5, { from: 0, to: 4 }, notes, chords, total);
    assert.equal(r.length, 1);
    assert.equal(passEnd(r[0]), 4);
  });
  it("past the new loop's end the pass ends on the next beat", () => {
    const ps = fill([], { from: 0, to: 8 }, 20, notes, chords, total);
    const r = retime(ps, 5.5, { from: 0, to: 2 }, notes, chords, total);
    assert.equal(passEnd(r[0]), 6);
    const next = fill(r, { from: 0, to: 2 }, 10, notes, chords, total);
    assert.deepEqual([next[1].start, next[1].from, next[1].to], [6, 0, 2]);
  });
  it("turning the loop off plays on to the tune's end", () => {
    const ps = fill([], { from: 2, to: 4 }, 20, notes, chords, total);
    const r = retime(ps, 1, null, notes, chords, total);
    assert.deepEqual([r[0].from, r[0].to], [2, 8]);
  });
  it("markers make a region whichever is first", () => {
    assert.deepEqual(regionOf(6, 2), { from: 2, to: 6 });
    assert.equal(regionOf(3, 3), null);
    assert.equal(snap(7.7, total), 8);
    assert.equal(snap(9, total), 8);
    assert.equal(snap(2.3, total, 0.5), 2.5);
  });
});
