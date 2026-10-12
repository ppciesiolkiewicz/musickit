import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STAGES, TRACKS, stageHref } from "./outline";

describe("course outline", () => {
  it("has four stages, each with every track filled", () => {
    assert.deepEqual(STAGES.map((s) => s.n), [1, 2, 3, 4]);
    STAGES.forEach((s) => TRACKS.forEach((t) => assert.ok(s.cells[t.id].length > 0, `${s.n} ${t.id}`)));
  });
  it("links to a stage and a track", () => {
    assert.equal(stageHref(2, "lead"), "/theory/stage/2#lead");
    assert.equal(stageHref(1), "/theory/stage/1");
  });
});
