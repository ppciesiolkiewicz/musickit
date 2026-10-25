import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDeviceName, findDevice, parseChoice, splitDevices } from "./devices";

test("devices split into inputs and outputs, without the aliases, unnamed ones numbered", () => {
  const { inputs, outputs } = splitDevices([
    { kind: "audioinput", deviceId: "default", label: "Default - MacBook Pro Microphone" },
    { kind: "audioinput", deviceId: "a", label: "Scarlett 2i2 USB" },
    { kind: "audioinput", deviceId: "b", label: "" },
    { kind: "audiooutput", deviceId: "communications", label: "" },
    { kind: "audiooutput", deviceId: "c", label: "" },
    { kind: "videoinput", deviceId: "v", label: "FaceTime HD Camera" },
  ]);
  assert.deepEqual(inputs, [{ id: "a", label: "Scarlett 2i2 USB" }, { id: "b", label: "Input 2" }]);
  assert.deepEqual(outputs, [{ id: "c", label: "Output 1" }]);
});

test("a remembered device is found by id, then by name, else not at all", () => {
  const list = [{ id: "new", label: "Scarlett 2i2 USB" }];
  assert.deepEqual(findDevice(list, { id: "new", label: "x" }), list[0]);
  assert.deepEqual(findDevice(list, { id: "old", label: "Scarlett 2i2 USB" }), list[0]);
  assert.equal(findDevice(list, { id: "old", label: "AirPods" }), null);
  assert.equal(findDevice(list, null), null);
});

test("the saved choice reads back, and anything broken is the system default", () => {
  assert.deepEqual(parseChoice(JSON.stringify({ input: { id: "a", label: "Mic" }, output: null })), { input: { id: "a", label: "Mic" }, output: null });
  assert.deepEqual(parseChoice("{nope"), { input: null, output: null });
  assert.deepEqual(parseChoice(JSON.stringify({ input: { id: 3 } })), { input: null, output: null });
  assert.deepEqual(parseChoice(null), { input: null, output: null });
});

test("device names lose the browser's additions", () => {
  assert.equal(cleanDeviceName("MacBook Pro Speakers (Built-in)"), "MacBook Pro Speakers");
  assert.equal(cleanDeviceName("Scarlett 2i2 USB (1235:8210)"), "Scarlett 2i2 USB");
});
