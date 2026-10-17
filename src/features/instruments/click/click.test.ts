import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CLICK_MAX_BPM, DEFAULT_CLICK, beatIndexAt, beatOf, clampClick, tapTempo } from "./click";

describe("click", () => {
  it("keeps every field in range and falls back on rubbish", () => {
    assert.deepEqual(clampClick(null), DEFAULT_CLICK);
    assert.deepEqual(clampClick({ bpm: 999, beatsPerBar: 0, volume: NaN }), { bpm: CLICK_MAX_BPM, beatsPerBar: 1, volume: DEFAULT_CLICK.volume });
    assert.equal(clampClick({ bpm: 90.6 }).bpm, 91);
  });
  it("finds the beat of the bar, also before the anchor", () => {
    assert.equal(beatOf(0, 4), 0);
    assert.equal(beatOf(5, 4), 1);
    assert.equal(beatOf(-1, 4), 3);
  });
  it("counts beats from the anchor", () => {
    assert.equal(beatIndexAt(9, 10, 120), -1);
    assert.equal(beatIndexAt(10, 10, 120), 0);
    assert.equal(beatIndexAt(11.49, 10, 120), 2);
    assert.equal(beatIndexAt(11.5, 10, 120), 3);
  });
  it("taps a tempo from the recent taps", () => {
    assert.equal(tapTempo([1]), null);
    assert.equal(tapTempo([1, 1.5, 2, 2.5]), 120);
    // an old tap 5 s back is forgotten
    assert.equal(tapTempo([0, 5, 6]), 60);
    assert.equal(tapTempo([0, 0.01]), CLICK_MAX_BPM);
  });
});
