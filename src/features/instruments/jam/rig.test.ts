import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findGroove, grooveBassCells, grooveDrumCells } from "../sequencer/grooves";
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

  it("mutes the following click by default and saves its mute", () => {
    assert.equal(new JamRig().snapshot().click.muted, false);
    const rig = new JamRig({ followClick: true });
    assert.equal(rig.snapshot().click.muted, true);
    rig.setClickMuted(false);
    const again = new JamRig({ followClick: true });
    again.load(JSON.parse(JSON.stringify(rig.save())));
    assert.equal(again.snapshot().click.muted, false);
    const old = new JamRig({ followClick: true });
    old.load({ bpm: 90, parts: {}, click: { volume: 0.5 } });
    assert.equal(old.snapshot().click.muted, true);
  });
});

describe("jam grooves", () => {
  const swings = (r: JamRig) => [r.save().parts.drums?.swing, r.save().parts.bass?.swing];

  it("sets drums and bass from a groove, with its swing", () => {
    const rig = new JamRig();
    rig.setGroove("funk");
    const p = rig.snapshot().parts;
    assert.equal(rig.snapshot().groove, "funk");
    assert.deepEqual(p.drums.state.cells, grooveDrumCells(findGroove("funk")!));
    assert.deepEqual(p.bass.state.cells, grooveBassCells(findGroove("funk")!));
    assert.equal(p.drums.state.bars, 1);
    assert.deepEqual(swings(rig), [0, 0]);
    rig.setGroove("swing");
    assert.deepEqual(swings(rig), [1, 1]);
  });

  it("an edited step is Custom and survives a reload", () => {
    const rig = new JamRig();
    rig.setGroove("funk");
    rig.setStep("drums", 0, 3, 2);
    assert.equal(rig.snapshot().groove, null);
    assert.equal(rig.snapshot().parts.drums.state.cells[0][3], 2);
    const again = new JamRig();
    again.load(JSON.parse(JSON.stringify(rig.save())));
    assert.equal(again.snapshot().groove, null);
    assert.equal(again.snapshot().parts.drums.state.cells[0][3], 2);
  });

  it("restores a saved groove without reloading the cells", () => {
    const rig = new JamRig();
    rig.setGroove("rock");
    const saved = JSON.parse(JSON.stringify(rig.save()));
    saved.parts.drums.cells[0][3] = 2;
    const again = new JamRig();
    again.load(saved);
    assert.equal(again.snapshot().groove, "rock");
    assert.equal(again.snapshot().parts.drums.state.cells[0][3], 2);
  });

  it("clear, preset and bars make it Custom", () => {
    for (const edit of [(r: JamRig) => r.clear("bass"), (r: JamRig) => r.loadPreset("drums", "rock"), (r: JamRig) => r.setBars("drums", 2)]) {
      const rig = new JamRig();
      rig.setGroove("pop");
      edit(rig);
      assert.equal(rig.snapshot().groove, null);
    }
    const rig = new JamRig();
    rig.setGroove("swing");
    rig.loadPreset("drums", "rock");
    assert.equal(rig.save().parts.drums?.swing, 0);
  });

  it("a key change keeps the groove and the cells", () => {
    const rig = new JamRig();
    rig.setGroove("pop");
    const before = JSON.stringify(rig.snapshot().parts.bass.state.cells);
    rig.setDrone({ root: 2 });
    assert.equal(rig.snapshot().groove, "pop");
    assert.equal(JSON.stringify(rig.snapshot().parts.bass.state.cells), before);
    assert.equal(rig.key(), 2);
  });

  it("an old save has no groove and no swing", () => {
    const rig = new JamRig();
    rig.setGroove("swing");
    rig.load({ bpm: 90, parts: {} });
    assert.equal(rig.snapshot().groove, null);
    const fresh = new JamRig();
    fresh.load({ bpm: 90, parts: {} });
    assert.equal(fresh.snapshot().groove, null);
    assert.deepEqual(swings(fresh), [0, 0]);
  });
});
