import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rms } from "./mic";

describe("rms", () => {
  it("is the level of a frame", () => {
    assert.equal(rms([]), 0);
    assert.equal(rms([0.5, -0.5, 0.5, -0.5]), 0.5);
  });
});
