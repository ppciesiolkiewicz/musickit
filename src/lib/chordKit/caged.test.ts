import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cagedBoxes, islandStrings, laneAt, laneStarts } from "./caged";

describe("laneAt: each string's colour runs from one of its notes to the next", () => {
  const notes = [1, 4, 9, 13, 16];
  it("frets before the first note take the first lane", () => {
    assert.equal(laneAt(notes, 0), 0);
  });
  it("a note starts its lane and the lane runs until the next note", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 8, 9, 12, 13, 16, 17].map((f) => laneAt(notes, f)), [0, 0, 0, 1, 1, 1, 2, 2, 3, 4, 4]);
  });
  it("a note on the open string starts lane 0 there", () => {
    assert.deepEqual([0, 1, 4, 5].map((f) => laneAt([0, 5], f)), [0, 0, 0, 1]);
  });
  it("a string with no notes is all lane 0", () => {
    assert.equal(laneAt([], 7), 0);
  });
});

describe("laneStarts: where each lane begins, for the labels above the neck", () => {
  it("lane 0 starts at the nut; later lanes at the middle fret where they start across the strings", () => {
    const strings = [[1, 4, 9, 13, 16], [2, 6, 9, 14], [1, 4, 9, 13, 16]];
    assert.deepEqual(laneStarts(strings, 5), [0, 4, 9, 13, 16]);
  });
  it("a lane no string reaches starts at the end of the neck", () => {
    assert.deepEqual(laneStarts([[2, 6]], 3, 17), [0, 6, 17]);
  });
});

describe("islandStrings: the strings the open chord's fingers press, moved up with the shape", () => {
  it("C major: three strings in every shape, the ones the article's chord boxes use", () => {
    const got = Object.fromEntries(cagedBoxes(0, "major").map((b) => [b.letter, islandStrings(b)]));
    // low E = 0 … high e = 5: C x-3-2-0-1-0, A x-3-5-5-5-3, G 8-7-5-5-5-8, E 8-10-10-9-8-8, D x-x-10-12-13-12
    assert.deepEqual(got, { C: [1, 2, 4], A: [2, 3, 4], G: [0, 1, 5], E: [1, 2, 3], D: [3, 4, 5] });
  });
});
