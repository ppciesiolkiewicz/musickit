import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BandPart as PlanBandPart } from "@/features/plan/model/tools";
import { MAX_BPM } from "../jam/clock";
import { JamRig } from "../jam/rig";
import { VIEW_SHOW, applySetup, hasHostSetup, resolveShow, restoreBand, type BandPart, type BandView, type ShowFlag } from "./config";

// compile-time: the plan's own BandPart and this one must not drift
const _fromPlan: BandPart[] = [] as PlanBandPart[];
const _toPlan: PlanBandPart[] = [] as BandPart[];
void _fromPlan;
void _toPlan;

const TABLE: Record<ShowFlag, [boolean, boolean, boolean, boolean]> = {
  partChips: [false, false, true, false],
  tempo: [true, true, true, false],
  tempoSlider: [true, true, true, false],
  beats: [true, true, true, true],
  key: [true, false, true, false],
  levels: [true, true, false, true],
  groove: [true, true, true, false],
  patterns: [true, true, true, false],
  droneSound: [true, true, false, false],
  more: [false, false, true, false],
};
const VIEWS: BandView[] = ["full", "pocket", "bar", "inline"];

describe("band view rules", () => {
  it("has the table for every view", () => {
    VIEWS.forEach((v, i) => {
      for (const [flag, row] of Object.entries(TABLE)) assert.equal(VIEW_SHOW[v][flag as ShowFlag], row[i], `${v}.${flag}`);
    });
  });

  it("resolveShow overrides single flags", () => {
    const r = resolveShow("bar", { more: false });
    assert.equal(r.more, false);
    assert.deepEqual({ ...r, more: true }, VIEW_SHOW.bar);
    assert.equal(resolveShow("full").partChips, false);
    assert.notEqual(resolveShow("full"), VIEW_SHOW.full);
  });

  it("only bar and inline have a host setup", () => {
    assert.deepEqual(VIEWS.map(hasHostSetup), [false, false, true, true]);
  });
});

describe("applySetup", () => {
  it("sets tempo (clamped), key and groove", () => {
    const rig = new JamRig();
    applySetup(rig, { parts: ["click"], bpm: 300, keyPc: 2, groove: "bossa" });
    const s = rig.snapshot();
    assert.equal(s.bpm, MAX_BPM);
    assert.equal(s.parts.drone.state.drone.root, 2);
    assert.equal(s.groove, "bossa");
  });

  it("sets the drone octave only when given", () => {
    const rig = new JamRig();
    const before = rig.snapshot().parts.drone.state.drone.octave;
    applySetup(rig, { parts: [], keyPc: 5 });
    assert.equal(rig.snapshot().parts.drone.state.drone.octave, before);
    applySetup(rig, { parts: [], droneOctave: 3 });
    assert.equal(rig.snapshot().parts.drone.state.drone.octave, 3);
    assert.equal(rig.snapshot().parts.drone.state.drone.root, 5);
  });

  it("changes nothing when the config gives nothing", () => {
    const rig = new JamRig();
    const before = JSON.stringify(rig.save());
    applySetup(rig, { parts: ["click"] });
    assert.equal(JSON.stringify(rig.save()), before);
  });
});

describe("restoreBand", () => {
  const saved = (() => {
    const r = new JamRig();
    r.setTempo(140);
    r.setDrone({ root: 7 });
    r.setGroove("funk");
    return r.save();
  })();
  const config = { parts: ["click", "drums", "bass"] as BandPart[], bpm: 70, keyPc: 2, groove: "bossa" as const };
  const got = (view: BandView) => {
    const rig = new JamRig();
    restoreBand(rig, view, config, saved);
    const s = rig.snapshot();
    return [s.bpm, s.parts.drone.state.drone.root, s.groove];
  };

  it("in bar and inline the host's bpm, key and groove win over the save", () => {
    assert.deepEqual(got("bar"), [70, 2, "bossa"]);
    assert.deepEqual(got("inline"), [70, 2, "bossa"]);
  });

  it("in full and pocket the save wins", () => {
    assert.deepEqual(got("full"), [140, 7, "funk"]);
    assert.deepEqual(got("pocket"), [140, 7, "funk"]);
  });

  it("in bar and inline a saved mute stays behind (the bar has no mute to undo it); full keeps it", () => {
    const r = new JamRig();
    r.setLevel("drone", { muted: true });
    const muted = r.save();
    for (const [view, want] of [["bar", false], ["inline", false], ["full", true]] as const) {
      const rig = new JamRig();
      restoreBand(rig, view, config, muted);
      assert.equal(rig.snapshot().parts.drone.muted, want, view);
    }
  });

  it("with no save, bar still takes the host's setup", () => {
    const rig = new JamRig();
    restoreBand(rig, "bar", config, null);
    assert.equal(rig.snapshot().bpm, 70);
  });
});
