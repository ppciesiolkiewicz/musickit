import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DRONE, clampDrone, droneCutoff, droneFrequency, droneLayers, droneName, droneQ, modRange, modShape } from "./drone";

describe("drone", () => {
  it("tunes notes to A4 = 440 Hz", () => {
    assert.ok(Math.abs(droneFrequency(9, 4) - 440) < 1e-9);
    assert.ok(Math.abs(droneFrequency(0, 4) - 261.6256) < 1e-3);
    assert.ok(Math.abs(droneFrequency(9, 2) - 110) < 1e-9);
  });
  it("names the note", () => assert.equal(droneName({ root: 9, octave: 2 }), "A2"));
  it("keeps every field in range and falls back on rubbish", () => {
    const p = clampDrone({ root: 14, octave: 99, wave: "noise" as never, fifth: 3, detune: -2, tone: NaN, level: 0.3 });
    assert.equal(p.root, 2);
    assert.equal(p.octave, 5);
    assert.equal(p.wave, DEFAULT_DRONE.wave);
    assert.equal(p.fifth, 1);
    assert.equal(p.detune, 0);
    assert.equal(p.tone, DEFAULT_DRONE.tone);
    assert.equal(p.level, 0.3);
    assert.deepEqual(clampDrone(null), DEFAULT_DRONE);
  });
  it("builds the layers from the levels", () => {
    const f = droneFrequency(0, 2);
    const full = droneLayers({ ...DEFAULT_DRONE, root: 0, octave: 2, fifth: 0.5, upper: 0.25, sub: 0.5, detune: 8 });
    assert.equal(full.length, 5);
    assert.deepEqual(full.map((l) => l.cents), [-8, 8, 0, 0, 0]);
    assert.ok(Math.abs(full[2].freq - f * 1.5) < 1e-9);
    assert.ok(Math.abs(full[4].freq - f / 2) < 1e-9);
    const bare = droneLayers({ ...DEFAULT_DRONE, fifth: 0, upper: 0, sub: 0, detune: 0 });
    assert.equal(bare.length, 1);
    assert.equal(bare[0].cents, 0);
  });
  it("opens the filter from 200 Hz to 6.4 kHz", () => {
    assert.equal(droneCutoff(0), 200);
    assert.equal(droneCutoff(1), 6400);
    assert.equal(droneCutoff(5), 6400);
  });
  it("checks the filter and the modulator", () => {
    const p = clampDrone({ filter: "notch" as never, resonance: 4, mod: "pan" as never, modWave: "square", modRate: 100, modDepth: -1 });
    assert.equal(p.filter, DEFAULT_DRONE.filter);
    assert.equal(p.resonance, 1);
    assert.equal(p.mod, DEFAULT_DRONE.mod);
    assert.equal(p.modWave, "square");
    assert.equal(p.modRate, 8);
    assert.equal(p.modDepth, 0);
    // an old saved drone without the new fields gets the defaults
    assert.equal(clampDrone({ root: 2 }).mod, DEFAULT_DRONE.mod);
  });
  it("maps resonance to Q", () => {
    assert.ok(Math.abs(droneQ(0) - 0.7) < 1e-9);
    assert.ok(droneQ(1) > 15);
  });
  it("draws the modulator shapes", () => {
    for (const w of ["sine", "triangle", "sawtooth"] as const) assert.ok(Math.abs(modShape(w, 0)) < 1e-9);
    assert.ok(Math.abs(modShape("sine", 0.25) - 1) < 1e-9);
    assert.equal(modShape("triangle", 0.25), 1);
    assert.equal(modShape("triangle", 0.75), -1);
    assert.equal(modShape("square", 0.1), 1);
    assert.equal(modShape("square", 0.6), -1);
    assert.ok(modShape("sawtooth", 0.49) > 0.9 && modShape("sawtooth", 0.51) < -0.9);
    assert.equal(modShape("sine", 3.25), modShape("sine", 0.25));
  });
  it("says what the modulator moves", () => {
    assert.deepEqual(modRange({ ...DEFAULT_DRONE, mod: "pitch", modDepth: 1 }), { label: "Pitch", low: "−50 ¢", high: "+50 ¢" });
    assert.deepEqual(modRange({ ...DEFAULT_DRONE, mod: "volume", modDepth: 0.4 }), { label: "Volume", low: "60%", high: "100%" });
    assert.deepEqual(modRange({ ...DEFAULT_DRONE, mod: "filter", tone: 0.4, modDepth: 0.5 }), { label: "Cut-off", low: "400 Hz", high: "1.6 kHz" });
  });
});
