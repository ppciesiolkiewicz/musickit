import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPEN_PCS, lessonShape, naturalDots, scaleDots } from "./visuals";

describe("stage visuals", () => {
  it("lessons can ask for the drop 3 voicing of a chord", () => {
    const am7 = lessonShape("Am7", undefined, "drop 3");
    assert.equal(am7?.shape.v, "drop 3");
    assert.equal(am7?.fret, 0);
    assert.equal(lessonShape("Bm7", undefined, "drop 3")?.fret, 2);
    assert.equal(lessonShape("Em7", undefined, "drop 3")?.shape.v, "drop 3");
  });
  it("a lesson can ask for the drop 3 on a given root string", () => {
    const am7 = lessonShape("Am7", undefined, "drop 3", 6);
    assert.equal(am7?.shape.rs, 6);
    assert.equal(am7?.fret, 5);
  });
  it("only the 6th-string m7♭5 is labelled drop 3", () => {
    assert.equal(lessonShape("F♯m7♭5", undefined, "drop 3", 5)?.shape.v === "drop 3" && lessonShape("F♯m7♭5", undefined, "drop 3", 5)?.shape.rs === 5, false);
  });
  it("natural notes on low E start E F G", () => {
    assert.deepEqual(naturalDots([0], 3).map((d) => d.label), ["E", "F", "G"]);
  });
  it("A minor pentatonic box 1 has its roots on the 5th fret of both E strings", () => {
    const roots = scaleDots(9, [0, 3, 5, 7, 10], [0, 2, 3, 4, 6].map((d, i) => ({ d, label: ["R", "♭3", "4", "5", "♭7"][i] })), 5, 8).filter((d) => d.label === "R");
    assert.ok(roots.some((d) => d.string === 0 && d.fret === 5));
    assert.ok(roots.some((d) => d.string === 5 && d.fret === 5));
    roots.forEach((d) => assert.equal((OPEN_PCS[d.string] + d.fret) % 12, 9));
  });
});
