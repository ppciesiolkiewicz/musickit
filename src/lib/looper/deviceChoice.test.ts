import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chooseDevice, deviceScore, gearIssues } from "./deviceChoice";

const mac = { id: "m", label: "MacBook Pro Microphone" };
const scarlett = { id: "s", label: "Focusrite USB Audio" };
const speakers = { id: "sp", label: "MacBook Pro Speakers" };

describe("device choice", () => {
  it("scores interfaces above the computer's own parts", () => {
    assert.ok(deviceScore("Scarlett 2i2 USB") > deviceScore("Some mic"));
    assert.ok(deviceScore("Some mic") > deviceScore("MacBook Pro Speakers"));
    assert.ok(deviceScore("Focusrite USB Audio") > 0);
  });
  it("prefers the interface, and keeps the remembered one", () => {
    assert.equal(chooseDevice([mac, scarlett], null)?.id, "s");
    assert.equal(chooseDevice([mac], null), null, "nothing worth choosing");
    assert.equal(chooseDevice([mac, scarlett], { id: "m", label: mac.label })?.id, "m");
    assert.equal(chooseDevice([{ ...scarlett, id: "new" }, mac], { id: "old", label: scarlett.label })?.id, "new", "matched by name when the id changed");
  });
});

describe("gear issues", () => {
  const base = { strips: [], devices: [mac, scarlett], outputs: [speakers, { id: "o2", label: "Focusrite USB Audio" }], outputId: "sp", canChooseOutput: true, prefIn: null, prefOut: null };
  it("suggests the interface for input and output", () => {
    assert.deepEqual(gearIssues(base).map((i) => i.kind), ["input-suggest", "output-suggest"]);
  });
  it("is quiet when things are connected", () => {
    const ok = { ...base, strips: [{ id: 0, name: "Guitar", deviceId: "s", connected: true, error: null }], outputId: "o2" };
    assert.deepEqual(gearIssues(ok), []);
  });
  it("reports idle, missing and failing inputs and a missing output", () => {
    const i = gearIssues({ ...base, strips: [{ id: 0, name: "A", deviceId: "s", connected: false, error: null }, { id: 1, name: "B", deviceId: "gone", connected: true, error: null }, { id: 2, name: "C", deviceId: "s", connected: true, error: "busy" }], outputs: [speakers], prefOut: { id: "x", label: "Focusrite USB Audio" } });
    assert.deepEqual(i.map((x) => x.kind), ["input-idle", "input-missing", "input-error", "output-missing"]);
  });
});
