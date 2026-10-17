import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BASS_PRESETS, DRUM_PRESETS, emptyCells, fromRows, stepAt, stepsInPattern, MAX_STEPS } from "./pattern";

describe("sequencer pattern", () => {
  it("counts steps for bars and beats", () => {
    assert.equal(stepsInPattern(1, 4), 16);
    assert.equal(stepsInPattern(2, 4), 32);
    assert.equal(stepsInPattern(1, 3), 12);
    assert.equal(stepsInPattern(9, 12), MAX_STEPS);
  });
  it("finds the current step and wraps", () => {
    // 120 bpm: a beat is 0.5 s, a step 0.125 s
    assert.equal(stepAt(10, 10, 0.5, 16), 0);
    assert.equal(stepAt(10.26, 10, 0.5, 16), 2);
    assert.equal(stepAt(12.0, 10, 0.5, 16), 0); // 16 steps later
    assert.equal(stepAt(9.9, 10, 0.5, 16), 15); // just before the anchor
  });
  it("builds patterns from rows and tiles them across the grid", () => {
    const c = fromRows(["X...x...", "........"].map((r) => r.padEnd(16, ".")));
    assert.equal(c[0][0], 2);
    assert.equal(c[0][4], 1);
    assert.equal(c[0][16], 2); // repeats every bar
    assert.equal(c[1].every((v) => v === 0), true);
    assert.equal(emptyCells(3).length, 3);
  });
  it("every preset has the right number of lanes of 16 characters", () => {
    DRUM_PRESETS.forEach((p) => { assert.equal(p.rows.length, 6); p.rows.forEach((r) => assert.equal(r.length, 16, p.id)); });
    BASS_PRESETS.forEach((p) => { assert.equal(p.rows.length, 8); p.rows.forEach((r) => assert.equal(r.length, 16, p.id)); });
  });
});

describe("bass key", () => {
  it("keeps every key's ladder between E1 and D♯2, A on A1", async () => {
    const { bassRootMidi, lanesIn, BASS, DRUMS, DEFAULT_KEY } = await import("./sequencer");
    assert.equal(bassRootMidi(9), 33);
    assert.equal(bassRootMidi(4), 28);
    assert.equal(bassRootMidi(3), 39);
    assert.equal(bassRootMidi(-3), 33);
    assert.equal(lanesIn(BASS, 2).at(-1)?.label, "D2");
    assert.deepEqual(lanesIn(BASS, DEFAULT_KEY), BASS.lanes);
    assert.deepEqual(lanesIn(DRUMS, 2), DRUMS.lanes);
  });
});
