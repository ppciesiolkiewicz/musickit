import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VOLUME, MIC_BOOST_DB, clampVolume, getVolume, micBoost, setVolume } from "./volume";

test("clampVolume keeps 0..1 and falls back to the default for junk", () => {
  assert.equal(clampVolume(0.5), 0.5);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(3), 1);
  assert.equal(clampVolume(NaN), DEFAULT_VOLUME);
  assert.equal(clampVolume("0.4"), DEFAULT_VOLUME);
  assert.equal(clampVolume(null), DEFAULT_VOLUME);
});

test("setVolume clamps and getVolume reads it back, with no audio or storage", () => {
  assert.equal(getVolume(), DEFAULT_VOLUME);
  setVolume(1.7);
  assert.equal(getVolume(), 1);
  setVolume(0);
  assert.equal(getVolume(), 0);
});

test("micBoost lifts the sound only on a touch screen with the mic open", () => {
  assert.equal(micBoost(0, true), 1);
  assert.equal(micBoost(2, false), 1);
  assert.ok(Math.abs(20 * Math.log10(micBoost(1, true)) - MIC_BOOST_DB) < 1e-9);
});
