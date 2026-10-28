import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STRING_GROUPS, nearbyFourthFifth, triadVoicings } from "./triads";

describe("nearbyFourthFifth", () => {
  it("finds B♭ and C right next to the F shape on D-G-B", () => {
    const dgb = STRING_GROUPS.find((g) => g.id === "432")!;
    const f = triadVoicings(5, "maj", 0, dgb)[0];
    assert.deepEqual(f.frets, [3, 2, 1]);
    const [iv, v] = nearbyFourthFifth(f, 5);
    assert.deepEqual(iv.v.frets, [3, 3, 3]);
    assert.deepEqual(v.v.frets, [2, 0, 1]);
  });
});
