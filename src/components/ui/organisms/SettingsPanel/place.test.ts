import assert from "node:assert/strict";
import test from "node:test";
import { SETTINGS_BOOT, SETTINGS_PLACE_KEY, readSettingsPlace } from "./boot";

test("readSettingsPlace: only a stored \"top\" moves the settings above", () => {
  assert.equal(readSettingsPlace("top"), "top");
  assert.equal(readSettingsPlace("side"), "side");
  assert.equal(readSettingsPlace(null), "side");
  assert.equal(readSettingsPlace("junk"), "side");
});

test("SETTINGS_BOOT reads the same key the panel writes", () => {
  assert.ok(SETTINGS_BOOT.includes(SETTINGS_PLACE_KEY));
});
