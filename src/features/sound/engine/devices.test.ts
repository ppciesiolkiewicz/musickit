import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDeviceName, findDevice, openInputStream, parseChoice, splitDevices } from "./devices";

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
  assert.deepEqual(parseChoice(JSON.stringify({ input: { id: "a", label: "Mic" }, output: null })), { input: { id: "a", label: "Mic" }, output: null, channel: "both" });
  assert.equal(parseChoice(JSON.stringify({ input: null, channel: "2" })).channel, "2");
  assert.equal(parseChoice(JSON.stringify({ channel: "left" })).channel, "both");
  assert.deepEqual(parseChoice("{nope"), { input: null, output: null, channel: "both" });
  assert.deepEqual(parseChoice(JSON.stringify({ input: { id: 3 } })), { input: null, output: null, channel: "both" });
  assert.deepEqual(parseChoice(null), { input: null, output: null, channel: "both" });
});

test("device names lose the browser's additions", () => {
  assert.equal(cleanDeviceName("MacBook Pro Speakers (Built-in)"), "MacBook Pro Speakers");
  assert.equal(cleanDeviceName("Scarlett 2i2 USB (1235:8210)"), "Scarlett 2i2 USB");
});

/** A browser with `devices` listed that records each getUserMedia request and fails the ones `fail` rejects. */
function fakeMedia(devices: { deviceId: string; label: string }[], fail: (c: MediaTrackConstraints) => string | null = () => null) {
  const asked: MediaTrackConstraints[] = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        enumerateDevices: async () => devices.map((d) => ({ kind: "audioinput", ...d })),
        getUserMedia: async ({ audio }: { audio: MediaTrackConstraints }) => {
          asked.push(audio);
          const name = fail(audio);
          if (name) throw Object.assign(new Error(name), { name });
          return {} as MediaStream;
        },
      },
    },
  });
  return asked;
}

test("a chosen input that is plugged in is asked for exactly, found again by name when its id changed", async () => {
  const asked = fakeMedia([{ deviceId: "scarlett", label: "Scarlett 2i2" }, { deviceId: "mac2", label: "MacBook Pro Microphone" }]);
  await openInputStream({ channelCount: { ideal: 2 } }, { id: "mac", label: "MacBook Pro Microphone" });
  assert.deepEqual(asked, [{ channelCount: { ideal: 2 }, deviceId: { exact: "mac2" } }]);
});

test("a chosen input not listed is only preferred; none is the default", async () => {
  let asked = fakeMedia([{ deviceId: "scarlett", label: "Scarlett 2i2" }]);
  await openInputStream({}, { id: "gone", label: "Old mic" });
  assert.deepEqual(asked, [{ deviceId: { ideal: "gone" } }]);
  asked = fakeMedia([{ deviceId: "scarlett", label: "Scarlett 2i2" }]);
  await openInputStream({}, null);
  assert.deepEqual(asked, [{ deviceId: undefined }]);
});

test("an exact input that fails falls back to the default; other errors are thrown", async () => {
  const asked = fakeMedia([{ deviceId: "mac", label: "MacBook Pro Microphone" }], (c) => (c.deviceId ? "OverconstrainedError" : null));
  await openInputStream({}, { id: "mac", label: "MacBook Pro Microphone" });
  assert.deepEqual(asked, [{ deviceId: { exact: "mac" } }, { deviceId: undefined }]);
  fakeMedia([{ deviceId: "mac", label: "MacBook Pro Microphone" }], () => "NotAllowedError");
  await assert.rejects(openInputStream({}, { id: "mac", label: "MacBook Pro Microphone" }), { name: "NotAllowedError" });
});
