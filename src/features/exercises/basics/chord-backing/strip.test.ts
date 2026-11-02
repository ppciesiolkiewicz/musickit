import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripAt } from "./strip";

describe("chord-backing strip", () => {
  it("lights one box a bar, the next one after it, wrapping", () => {
    assert.equal(stripAt(-1, 4), null);
    assert.deepEqual(stripAt(0, 4), { now: 0, next: 1, beat: 0 });
    assert.deepEqual(stripAt(6, 4), { now: 1, next: 2, beat: 2 });
    assert.deepEqual(stripAt(15, 4), { now: 3, next: 0, beat: 3 });
    assert.deepEqual(stripAt(17, 4), { now: 0, next: 1, beat: 1 });
    assert.deepEqual(stripAt(5, 1), { now: 0, next: 0, beat: 1 });
  });
});
