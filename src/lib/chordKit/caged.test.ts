import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barreChord, cagedBoxes, islandChord, islandNotes, laneAt, laneStarts } from "./caged";
import { shapeFromFrets } from "@/features/exercises/cues/voicing";

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

describe("islandNotes: the notes the open chord's fingers press, moved up with the shape", () => {
  it("C major: the notes the article's chord boxes play, the G shape with its B string", () => {
    const got = Object.fromEntries(cagedBoxes(0, "major").map((b) => [b.letter, islandNotes(b)]));
    // [string, fret], low E = 0 … high e = 5: C x-3-2-0-1-0, A x-3-5-5-5-3, G 8-7-5-5-5-8 (played 8-7-x-x-8-8), E 8-10-10-9-8-8, D x-x-10-12-13-12
    assert.deepEqual(got, {
      C: [[1, 3], [2, 2], [4, 1]], A: [[2, 5], [3, 5], [4, 5]], G: [[0, 8], [1, 7], [4, 8], [5, 8]], E: [[1, 10], [2, 10], [3, 9]], D: [[3, 12], [4, 13], [5, 12]],
    });
  });
  it("A minor: the E shape keeps its ♭3 on the G string", () => {
    const e = cagedBoxes(9, "minor").find((b) => b.letter === "E")!;
    // Am in the E shape 5-7-7-5-5-5: B and E on the A and D strings, C on the G string
    assert.deepEqual(islandNotes(e), [[1, 7], [2, 7], [3, 5]]);
  });
});

describe("islandChord and barreChord: every shape draws as a chord box", () => {
  for (const [root, q, name] of [[0, "major", "C"], [4, "major", "E"], [7, "major", "G"], [9, "major", "A"], [9, "minor", "Am"], [4, "minor", "Em"], [2, "minor", "Dm"]] as const) {
    it(`${name}: island and barre chord in all five shapes`, () => {
      for (const b of cagedBoxes(root, q)) {
        assert.ok(shapeFromFrets(name, islandChord(b)), `${name} ${b.letter} island ${islandChord(b)}`);
        assert.ok(shapeFromFrets(name, barreChord(b)), `${name} ${b.letter} barre ${barreChord(b)}`);
      }
    });
  }
  it("C major: the article's island chord boxes", () => {
    assert.deepEqual(cagedBoxes(0, "major").map(islandChord), [
      "x 3 2 x 1 x | x 3 2 x 1 x", "x x 5 5 5 x | x x 1 2 3 x", "8 7 x x 8 8 | 2 1 x x 3 4", "x 10 10 9 x x | x 2 3 1 x x", "x x 10 12 13 12 | x x 1 2 4 3",
    ]);
  });
});
