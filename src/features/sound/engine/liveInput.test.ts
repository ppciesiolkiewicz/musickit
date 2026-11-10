import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { meterLevel, openLiveInput, readLiveInput } from "./liveInput";

describe("live input", () => {
  it("counts listeners and clears when the last closes", () => {
    const a = openLiveInput();
    const b = openLiveInput();
    assert.equal(readLiveInput().listening, 2);
    a.levels([0.1, 0.2]);
    assert.deepEqual(readLiveInput().levels, [0.1, 0.2]);
    a.close();
    a.close();
    assert.equal(readLiveInput().listening, 1);
    b.close();
    assert.deepEqual(readLiveInput(), { listening: 0, levels: [] });
  });

  it("maps a level onto the meter", () => {
    assert.equal(meterLevel(0), 0);
    assert.equal(meterLevel(1), 1);
    assert.equal(meterLevel(0.001), 0);
    assert.ok(Math.abs(meterLevel(0.0316) - 0.5) < 0.01);
  });
});
