import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chooseDevice, deviceKind, deviceName, deviceScore, gearIssues } from "./deviceChoice";

const mac = { id: "m", label: "MacBook Pro Microphone" };
const scarlett = { id: "s", label: "Focusrite USB Audio" };
const speakers = { id: "sp", label: "MacBook Pro Speakers" };

describe("device choice", () => {
  it("scores interfaces above the computer's own parts", () => {
    assert.ok(deviceScore("Scarlett 2i2 USB") > deviceScore("Some mic"));
    assert.ok(deviceScore("Some mic") > deviceScore("MacBook Pro Speakers"));
    assert.ok(deviceScore("Focusrite USB Audio") > 0);
    assert.equal(deviceScore("RC-505mkII"), 2, "the BOSS looper is an interface");
    assert.equal(deviceScore("XYZ 8x8"), 1, "an unknown device beats the computer's own");
    assert.equal(deviceScore("Jabra Evolve headset"), 0, "a headset is not music gear");
    assert.equal(deviceScore("Input 2"), 0, "a nameless device (no access yet) is unknown");
  });
  it("prefers the interface, and keeps the remembered one", () => {
    assert.equal(chooseDevice([mac, scarlett], null)?.id, "s");
    assert.equal(chooseDevice([mac], null), null, "nothing worth choosing");
    assert.equal(chooseDevice([mac, { id: "x", label: "XYZ 8x8" }], null)?.id, "x", "any device that is not the computer's own");
    assert.equal(chooseDevice([{ id: "x", label: "XYZ 8x8" }, { id: "r", label: "RC-505mkII" }], null)?.id, "r", "a known interface first");
    assert.equal(chooseDevice([mac, scarlett], { id: "m", label: mac.label })?.id, "m");
    assert.equal(chooseDevice([{ ...scarlett, id: "new" }, mac], { id: "old", label: scarlett.label })?.id, "new", "matched by name when the id changed");
  });
});

describe("gear issues", () => {
  const strip = { id: 1, name: "Scarlett", deviceId: "s", connected: true, error: null };
  it("says nothing when there are no inputs, whatever is plugged in", () => {
    assert.deepEqual(gearIssues({ strips: [], devices: [mac, scarlett] }), []);
  });
  it("flags an input that is not connected, whose device is missing, or that failed", () => {
    assert.deepEqual(gearIssues({ strips: [strip], devices: [mac, scarlett] }), []);
    assert.deepEqual(gearIssues({ strips: [{ ...strip, connected: false }], devices: [scarlett] }).map((i) => i.kind), ["input-idle"]);
    assert.deepEqual(gearIssues({ strips: [{ ...strip, connected: false }], devices: [mac] }).map((i) => i.kind), ["input-missing"], "unplugged wins over not connected");
    assert.deepEqual(gearIssues({ strips: [{ ...strip, error: "busy" }], devices: [scarlett] }).map((i) => i.kind), ["input-error"]);
    assert.deepEqual(gearIssues({ strips: [{ ...strip, deviceId: "" , connected: false }], devices: [mac] }).map((i) => i.kind), ["input-idle"], "the system default needs no particular device");
  });
});

describe("deviceKind and deviceName", () => {
  it("describe devices for the dialog", () => {
  assert.equal(deviceKind("Scarlett 4i4 4th Gen (1235:821a)"), "interface");
  assert.equal(deviceKind("MacBook Pro Microphone (Built-in)"), "builtin");
  assert.equal(deviceKind("ZoomAudioDevice (Virtual)"), "virtual");
  assert.equal(deviceKind("Some headset"), "other");
  assert.equal(deviceKind("RC-505mkII"), "interface");
  assert.equal(deviceName("Scarlett 4i4 4th Gen (1235:821a)"), "Scarlett 4i4 4th Gen");
  assert.equal(deviceName("MacBook Pro Speakers (Built-in)"), "MacBook Pro Speakers");
  });
});
