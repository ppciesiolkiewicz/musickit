import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JamRig, type GridFollower } from "../jam/rig";
import { LoopDeck } from "./deck";
import { cleanConfig, type LoopConfig } from "./loops";

/** An audio node, param or context that takes any call: every property is another one, numbers read as 0. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fake(): any {
  const store: Record<PropertyKey, unknown> = {};
  return new Proxy(function () {}, {
    get(_t, k) {
      if (k in store) return store[k];
      if (k === "then") return undefined;
      if (k === Symbol.toPrimitive) return () => 0;
      return (store[k] = fake());
    },
    set(_t, k, v) {
      store[k] = v;
      return true;
    },
    apply: () => fake(),
  });
}
function fakeContext(now = 10) {
  const ctx = fake();
  ctx.currentTime = now;
  ctx.sampleRate = 100;
  return ctx as AudioContext;
}

/** A follower that records what the rig asks of it. */
function follower(locks = false) {
  const calls = { startAt: [] as number[], stopAt: [] as number[], grid: [] as [number, number][], tempo: [] as number[] };
  const f: GridFollower = {
    busy: () => false,
    locksTempo: () => locks,
    onGrid: (a, b) => void calls.grid.push([a, b]),
    startAt: (at) => void calls.startAt.push(at),
    stopAt: (at) => void calls.stopAt.push(at),
    onTempo: (bpm) => void calls.tempo.push(bpm),
  };
  return { f, calls };
}

describe("the rig's grid followers", () => {
  it("a follower that holds sound locks the tempo", () => {
    const rig = new JamRig();
    rig.setTempo(100);
    rig.follow(follower(true).f);
    assert.equal(rig.snapshot().tempoLocked, true);
    rig.setTempo(120);
    assert.equal(rig.snapshot().bpm, 100);
  });

  it("a follower without sound leaves the tempo free", () => {
    const rig = new JamRig();
    rig.setTempo(100);
    const { f, calls } = follower(false);
    rig.follow(f);
    assert.equal(rig.snapshot().tempoLocked, false);
    rig.setTempo(120);
    assert.equal(rig.snapshot().bpm, 120);
    assert.equal(calls.tempo.at(-1), 120);
  });

  it("starts with the parts, on the same beat, and stops being asked once unfollowed", () => {
    const rig = new JamRig();
    rig.attach(fakeContext(), fake());
    const { f, calls } = follower();
    const unfollow = rig.follow(f);
    try {
      rig.start(["drone"], true);
      assert.equal(calls.startAt.length, 1);
      assert.equal(calls.startAt[0], rig.nextBeatAt());
      assert.equal(calls.grid.length, 1);
      assert.equal(calls.grid[0][1], 60 / rig.snapshot().bpm);
      rig.start(["drums"]);
      assert.equal(calls.startAt.length, 1, "only with followers");
      rig.stop(["drone", "drums"], true);
      assert.equal(calls.stopAt.length, 1);
      unfollow();
      rig.start(["drone"], true);
      assert.equal(calls.startAt.length, 1);
    } finally {
      rig.dispose();
    }
  });
});

describe("the loop deck", () => {
  /** a `musickit.jam` save from before the loops left the rig, written from `LoopConfig`: the app's input, and a device of its own */
  const oldJamSave = {
    bpm: 96,
    parts: {},
    click: { volume: 0.7, muted: true },
    loops: [
      { id: "loop-a-1", deviceId: "", channel: "mix", bars: 2, volume: 0.8, effects: [], monitor: false },
      {
        id: "loop-b-2",
        deviceId: "usb-interface-123",
        channel: "2",
        bars: 4,
        volume: 0.5,
        effects: [{ id: "fx-r", kind: "reverb", bypass: false, post: false, params: { decay: 3, tone: 5000, mix: 0.4 } }],
        monitor: true,
      },
    ] satisfies LoopConfig[],
  };

  it("loads the loops of an old jam save and saves them the same", () => {
    const deck = new LoopDeck();
    deck.load(JSON.parse(JSON.stringify(oldJamSave)).loops);
    assert.deepEqual(deck.save(), oldJamSave.loops.map(cleanConfig));
    assert.deepEqual(deck.save(), oldJamSave.loops);
    assert.deepEqual(deck.snapshot().loops.map((l) => [l.id, l.deviceId, l.channel, l.effects.length, l.state]), [["loop-a-1", "", "mix", 0, "empty"], ["loop-b-2", "usb-interface-123", "2", 1, "empty"]]);
  });

  it("starts with one empty loop and keeps it on a save with no loops", () => {
    const deck = new LoopDeck();
    deck.load(undefined);
    deck.load([]);
    assert.equal(deck.save().length, 1);
    assert.equal(deck.locksTempo(), false);
    assert.equal(deck.busy(), false);
  });

  it("adds up to eight loops on the last one's input, and keeps one", () => {
    const deck = new LoopDeck();
    deck.load(oldJamSave.loops);
    for (let i = 0; i < 10; i++) deck.addLoop();
    const saved = deck.save();
    assert.equal(saved.length, 8);
    assert.equal(saved[7].deviceId, "usb-interface-123");
    saved.slice(1).forEach((l) => deck.removeLoop(l.id!));
    assert.equal(deck.save().length, 1);
    deck.removeLoop(saved[0].id!);
    assert.equal(deck.save().length, 1);
  });

  it("follows a rig and tells it when it changes", () => {
    const rig = new JamRig();
    const deck = new LoopDeck();
    const unfollow = rig.follow(deck);
    let heard = 0;
    rig.subscribe(() => heard++);
    deck.setLoop(deck.save()[0].id!, { volume: 0.3 });
    assert.ok(heard > 0);
    unfollow();
    assert.equal(deck.changed, undefined);
  });
});
