import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listDevices, sameDevices, singleFlight } from "./deviceList";

const dev = (kind: MediaDeviceKind, deviceId: string, label = "") => ({ kind, deviceId, label });

describe("device list", () => {
  it("splits inputs and outputs, skips the default and communications aliases, names unnamed ones", () => {
    const { devices, outputs } = listDevices([
      dev("audioinput", "default", "Default - Scarlett"),
      dev("audioinput", "s", "Scarlett 2i2"),
      dev("audioinput", "x"),
      dev("audiooutput", "communications", "Comms"),
      dev("audiooutput", "sp", "MacBook Pro Speakers"),
      dev("videoinput", "cam", "FaceTime HD"),
    ]);
    assert.deepEqual(devices, [{ id: "s", label: "Scarlett 2i2" }, { id: "x", label: "Input 2" }]);
    assert.deepEqual(outputs, [{ id: "sp", label: "MacBook Pro Speakers" }]);
  });

  it("sees the same list as unchanged, and a new, missing or renamed device as a change", () => {
    const a = [{ id: "s", label: "Scarlett" }, { id: "m", label: "Mic" }];
    assert.ok(sameDevices(a, [{ id: "s", label: "Scarlett" }, { id: "m", label: "Mic" }]));
    assert.ok(!sameDevices(a, a.slice(0, 1)));
    assert.ok(!sameDevices(a, [...a, { id: "z", label: "Zoom" }]));
    assert.ok(!sameDevices(a, [{ id: "s", label: "Input 1" }, { id: "m", label: "Mic" }]), "names appear once access is given");
  });
});

describe("singleFlight", () => {
  it("shares one running call between callers, then runs again once it is done", async () => {
    let runs = 0;
    let release!: () => void;
    const once = singleFlight(() => {
      runs++;
      return new Promise<number>((r) => (release = () => r(runs)));
    });
    const a = once();
    const b = once();
    assert.equal(runs, 1);
    release();
    assert.deepEqual(await Promise.all([a, b]), [1, 1]);
    const c = once();
    assert.equal(runs, 2);
    release();
    assert.equal(await c, 2);
  });

  it("lets the next call run after a failure", async () => {
    let runs = 0;
    const once = singleFlight(async () => {
      runs++;
      if (runs === 1) throw new Error("busy");
      return runs;
    });
    await assert.rejects(once(), /busy/);
    assert.equal(await once(), 2);
  });
});
