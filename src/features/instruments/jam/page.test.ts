import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JamRig, type GridFollower } from "./rig";
import { LoopDeck } from "../loops/deck";
import { cleanConfig, type LoopConfig } from "../loops/loops";
import { loadJamPage, saveJamPage } from "./page";

/** a drone part as a rig saves it, on D */
const droneOnD = () => {
  const r = new JamRig();
  r.setDrone({ root: 2 });
  return r.save().parts.drone!;
};

/** a `musickit.jam` save from before the loops left the rig: the rig's fields and the loops beside them */
const oldJamSave = {
  bpm: 96,
  parts: { drone: droneOnD() },
  click: { volume: 0.7, muted: true },
  loops: [
    { id: "loop-a-1", deviceId: "", channel: "mix", bars: 2, volume: 0.8, effects: [], monitor: false },
    { id: "loop-b-2", deviceId: "usb-interface-123", channel: "2", bars: 4, volume: 0.5, effects: [{ id: "fx-r", kind: "reverb", bypass: false, post: false, params: { decay: 3, tone: 5000, mix: 0.4 } }], monitor: true },
  ] satisfies LoopConfig[],
};

describe("the jam page's save", () => {
  it("opens an old jam save with its tempo, drone and loops", () => {
    const rig = new JamRig({ followClick: true });
    const deck = new LoopDeck();
    loadJamPage(rig, deck, JSON.parse(JSON.stringify(oldJamSave)), null);
    assert.equal(rig.snapshot().bpm, 96);
    assert.equal(rig.snapshot().parts.drone.state.drone.root, 2);
    assert.deepEqual(deck.save(), oldJamSave.loops.map(cleanConfig));
  });

  it("saves the rig and the loops in one save, and reads it back", () => {
    const rig = new JamRig({ followClick: true });
    const deck = new LoopDeck();
    loadJamPage(rig, deck, oldJamSave, null);
    const saved = JSON.parse(JSON.stringify(saveJamPage(rig, deck)));
    assert.deepEqual(saved.loops, oldJamSave.loops);
    assert.equal(saved.bpm, 96);
    const rig2 = new JamRig({ followClick: true });
    const deck2 = new LoopDeck();
    loadJamPage(rig2, deck2, saved, null);
    assert.deepEqual(rig2.save(), rig.save());
    assert.deepEqual(deck2.save(), deck.save());
  });

  it("without a jam save, takes the drone page's old drone", () => {
    const rig = new JamRig({ followClick: true });
    const deck = new LoopDeck();
    loadJamPage(rig, deck, null, { root: 7, octave: 2 });
    assert.equal(rig.snapshot().parts.drone.state.drone.root, 7);
    assert.equal(deck.save().length, 1);
  });

  it("a broken save starts fresh", () => {
    const rig = new JamRig({ followClick: true });
    const fresh = rig.save();
    loadJamPage(rig, new LoopDeck(), "nonsense", 42);
    assert.deepEqual(rig.save(), fresh);
  });
});

describe("the rig's followers on", () => {
  it("is on while a follower is on, and tells the snapshot when it changes", () => {
    const rig = new JamRig();
    let on = false;
    const f: GridFollower = { busy: () => false, on: () => on, locksTempo: () => false, onGrid: () => {}, startAt: () => {}, stopAt: () => {}, onTempo: () => {} };
    rig.follow(f);
    assert.equal(rig.snapshot().followersOn, false);
    on = true;
    f.changed?.();
    assert.equal(rig.snapshot().followersOn, true);
  });

  it("a deck with nothing recorded is not on", () => {
    const rig = new JamRig();
    rig.follow(new LoopDeck());
    assert.equal(rig.snapshot().followersOn, false);
  });
});
