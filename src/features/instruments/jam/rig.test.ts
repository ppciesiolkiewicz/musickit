import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LEVEL, JamRig, clampLevel } from "./rig";

describe("jam part levels", () => {
  it("repairs a saved level", () => {
    assert.deepEqual(clampLevel(undefined), DEFAULT_LEVEL);
    assert.deepEqual(clampLevel({ volume: 2, muted: true }), { volume: 1, muted: true });
    assert.deepEqual(clampLevel({ volume: -1 }), { volume: 0, muted: false });
    assert.deepEqual(clampLevel({ volume: "x" as unknown as number, muted: "yes" as unknown as boolean }), DEFAULT_LEVEL);
  });

  it("saves and loads each part's level, without audio", () => {
    const rig = new JamRig();
    rig.setLevel("drums", { volume: 0.4 });
    rig.setLevel("bass", { muted: true });
    assert.deepEqual(rig.snapshot().parts.drums.volume, 0.4);
    const again = new JamRig();
    again.load(JSON.parse(JSON.stringify(rig.save())));
    const parts = again.snapshot().parts;
    assert.equal(parts.drums.volume, 0.4);
    assert.equal(parts.drums.muted, false);
    assert.equal(parts.bass.muted, true);
    assert.equal(parts.bass.volume, 1);
  });
});
