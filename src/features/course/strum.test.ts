import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STRUMS, parseStrum } from "./strum";

describe("strum patterns", () => {
  it("the island strum is one bar of 8ths", () => {
    assert.equal(STRUMS.island.steps.length, 8);
  });
  it("the 16th pattern has downs on beats 1 and 3", () => {
    assert.equal(STRUMS.sixteenths.steps.length, 16);
    assert.equal(STRUMS.sixteenths.steps[0], "D");
    assert.equal(STRUMS.sixteenths.steps[8], "D");
  });
  it("every pattern fills exactly one 4/4 bar", () => {
    Object.values(STRUMS).forEach((p) => assert.equal(p.steps.length, 4 * p.perBeat, p.id));
  });
  it("parsing ignores bar lines and rejects unknown strokes", () => {
    assert.deepEqual(parseStrum("D | U ."), ["D", "U", "."]);
    assert.throws(() => parseStrum("D X"));
  });
});
