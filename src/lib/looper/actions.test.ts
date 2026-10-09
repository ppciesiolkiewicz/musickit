import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, describeAction, inverseOf, isAction, type ActionState, type ActionTarget, type GroupPatch, type LooperAction, type MetronomePatch } from "./actions";
import { ActionHistory } from "./history";
import { MacroRecorder, parseMacros, playMacro, serialiseMacros } from "./macros";

/** A tiny in-memory stand-in for the engine. */
function fake() {
  const s: ActionState = {
    channels: [0, 1].map((id) => ({ id, name: `Loop ${id + 1}`, volume: 0.8, muted: false, solo: false, x: 10 * id, y: 20, active: true })),
    groups: [{ id: "g1", name: "A", colour: "#fff", volume: 1, muted: false, x: 0, y: 0, w: 100, h: 100, effects: [{ id: "fx1", bypass: false, post: false, params: { mix: 0.3 } }] }],
    masterVolume: 1,
    playing: false,
    metronome: { bpm: 120, beatsPerBar: 4, volume: 0.5, audible: true, showBeat: true, quantise: "bar", countInBars: 1 },
    sequencers: [{ id: "q1", name: "Drums", x: 5, y: 5, dest: "auto", playing: false }],
  };
  const ch = (id: number) => s.channels.find((c) => c.id === id)!;
  const gr = (id: string) => s.groups.find((g) => g.id === id)!;
  const sq = (id: string) => s.sequencers.find((q) => q.id === id)!;
  const t: ActionTarget = {
    getSnapshot: () => s,
    setVolume: (id, v) => { ch(id).volume = v; },
    toggleMute: (id) => { ch(id).muted = !ch(id).muted; },
    toggleSolo: (id) => { ch(id).solo = !ch(id).solo; },
    rename: (id, n) => { ch(id).name = n; },
    moveChannel: (id, x, y) => { Object.assign(ch(id), { x, y }); },
    setLoopActive: (id, on) => { ch(id).active = on; },
    updateGroup: (id, p: GroupPatch) => { Object.assign(gr(id), p); },
    setGroupActive: () => undefined,
    setMasterVolume: (v) => { s.masterVolume = v; },
    setMetronome: (p: MetronomePatch) => { Object.assign(s.metronome, p); },
    setPlaying: (on) => { s.playing = on; },
    setEffectParam: (g, f, k, v) => { gr(g).effects.find((e) => e.id === f)!.params[k] = v; },
    toggleEffectBypass: (g, f) => { const e = gr(g).effects.find((x) => x.id === f)!; e.bypass = !e.bypass; },
    setEffectPost: (g, f, p) => { gr(g).effects.find((e) => e.id === f)!.post = p; },
    moveSequencer: (id, x, y) => { Object.assign(sq(id), { x, y }); },
    setSequencerPlaying: (id, on) => { sq(id).playing = on; },
    setSequencerDest: (id, d) => { sq(id).dest = d; },
  };
  return { s, t };
}

const SAMPLES: LooperAction[] = [
  { type: "loop.volume", id: 0, value: 0.2 },
  { type: "loop.mute", id: 1, muted: true },
  { type: "loop.solo", id: 1, solo: true },
  { type: "loop.rename", id: 0, name: "Bass" },
  { type: "loop.move", id: 1, x: 300, y: 40 },
  { type: "loop.active", id: 0, on: false },
  { type: "group.set", id: "g1", patch: { volume: 0.4, muted: true, name: "Drums" } },
  { type: "master.volume", value: 0.5 },
  { type: "metronome.set", patch: { bpm: 90, audible: false } },
  { type: "playback.set", on: true },
  { type: "effect.param", groupId: "g1", fxId: "fx1", key: "mix", value: 0.9 },
  { type: "effect.bypass", groupId: "g1", fxId: "fx1", bypass: true },
  { type: "effect.post", groupId: "g1", fxId: "fx1", post: true },
  { type: "sequencer.move", id: "q1", x: 50, y: 60 },
  { type: "sequencer.playing", id: "q1", on: true },
  { type: "sequencer.dest", id: "q1", dest: "record" },
  { type: "batch", label: "Duck", actions: [{ type: "loop.volume", id: 0, value: 0.1 }, { type: "master.volume", value: 0.3 }] },
];

test("every action is valid, described, and undone exactly", () => {
  for (const a of SAMPLES) {
    assert.ok(isAction(a), a.type);
    const { s, t } = fake();
    const before = JSON.stringify(s);
    const inv = inverseOf(a, s);
    assert.ok(inv, a.type);
    applyAction(t, a);
    assert.notEqual(JSON.stringify(s), before, `${a.type} should change something`);
    applyAction(t, inv);
    assert.equal(JSON.stringify(s), before, `${a.type} undo`);
    assert.ok(describeAction(a, s).length > 0);
  }
});

test("actions that point at nothing have no inverse", () => {
  const { s } = fake();
  assert.equal(inverseOf({ type: "loop.volume", id: 9, value: 1 }, s), null);
  assert.equal(inverseOf({ type: "group.set", id: "zz", patch: { volume: 1 } }, s), null);
});

test("isAction rejects malformed data", () => {
  assert.equal(isAction({ type: "loop.volume", id: "0", value: 1 }), false);
  assert.equal(isAction({ type: "nope" }), false);
  assert.equal(isAction({ type: "group.set", id: "g", patch: { bogus: 1 } }), false);
  assert.equal(isAction({ type: "group.set", id: "g", patch: {} }), false);
  assert.equal(isAction({ type: "batch", actions: [] }), false);
  assert.equal(isAction(null), false);
});

test("history: undo, redo, jump and a dropped redo tail", () => {
  const { s, t } = fake();
  let now = 0;
  const h = new ActionHistory(t, { now: () => now });
  h.do({ type: "master.volume", value: 0.5 }); now += 5000;
  h.do({ type: "loop.mute", id: 0, muted: true }); now += 5000;
  h.do({ type: "playback.set", on: true });
  assert.equal(h.getState().entries.length, 3);
  h.undo();
  assert.equal(s.playing, false);
  h.undo();
  assert.equal(s.channels[0].muted, false);
  h.redo();
  assert.equal(s.channels[0].muted, true);
  h.jumpTo(-1);
  assert.equal(s.masterVolume, 1);
  assert.equal(h.getState().cursor, 0);
  h.jumpTo(2);
  assert.equal(s.playing, true);
  h.undo();
  h.do({ type: "master.volume", value: 0.1 });
  assert.equal(h.canRedo, false);
  assert.equal(h.getState().entries.length, 3);
});

test("history merges a drag into one line that undoes to where it began", () => {
  const { s, t } = fake();
  let now = 0;
  const h = new ActionHistory(t, { now: () => now });
  let seen = 0;
  h.onEvent((e) => { if (e.kind === "do") seen++; });
  for (let i = 1; i <= 10; i++) { now += 20; h.do({ type: "loop.volume", id: 0, value: 0.8 - i * 0.05 }); }
  assert.equal(seen, 10);
  assert.equal(h.getState().entries.length, 1);
  assert.ok(Math.abs(s.channels[0].volume - 0.3) < 1e-9);
  h.undo();
  assert.equal(s.channels[0].volume, 0.8);
  now += 5000;
  h.do({ type: "loop.volume", id: 0, value: 0.1 });
  now += 5000;
  h.do({ type: "loop.volume", id: 0, value: 0.2 });
  assert.equal(h.getState().entries.length, 2);
});

test("history limit drops the oldest lines", () => {
  const { t } = fake();
  const h = new ActionHistory(t, { limit: 3 });
  for (let i = 0; i < 6; i++) h.do({ type: "playback.set", on: i % 2 === 0 });
  assert.equal(h.getState().entries.length, 3);
});

test("macros: record, serialise, parse, replay and undo as one", () => {
  const { s, t } = fake();
  let now = 1000;
  const h = new ActionHistory(t, { now: () => now });
  const rec = new MacroRecorder(h, () => now);
  rec.start();
  h.do({ type: "loop.mute", id: 0, muted: true }); now += 400;
  h.do({ type: "master.volume", value: 0.4 }); now += 600;
  h.do({ type: "playback.set", on: true });
  const m = rec.stop("Intro", "m1");
  assert.ok(m);
  assert.deepEqual(m.steps.map((x) => x.t), [0, 400, 1000]);
  assert.equal(m.duration, 1000);

  const back = parseMacros(serialiseMacros([m]));
  assert.deepEqual(back, [m]);
  assert.deepEqual(parseMacros("not json"), []);
  assert.deepEqual(parseMacros(JSON.stringify([{ version: 1, id: "x", name: "bad", steps: [{ t: 0, action: { type: "nope" } }] }])), []);

  h.jumpTo(-1);
  h.clear();
  assert.equal(s.masterVolume, 1);

  // replay with a fake clock; played steps are not recorded again
  const queue: { fn: () => void; ms: number }[] = [];
  rec.start();
  let ended = false;
  playMacro(h, m, { schedule: (fn, ms) => { queue.push({ fn, ms }); return () => undefined; }, onEnd: () => { ended = true; } });
  queue.sort((a, b) => a.ms - b.ms).forEach((q) => q.fn());
  assert.equal(ended, true);
  assert.equal(rec.stepCount, 0);
  assert.equal(s.masterVolume, 0.4);
  assert.equal(s.playing, true);
  assert.equal(s.channels[0].muted, true);
  assert.equal(h.getState().entries.length, 3);
  h.undo();
  assert.equal(s.masterVolume, 1);
  assert.equal(s.playing, false);
  assert.equal(s.channels[0].muted, false);
  assert.equal(h.getState().cursor, 0);
  assert.equal(rec.stop("x"), null);
});

test("macro playback can be cancelled", () => {
  const { s, t } = fake();
  const h = new ActionHistory(t);
  const queue: (() => void)[] = [];
  const cancelled: boolean[] = [];
  const cancel = playMacro(h, { version: 1, id: "c", name: "c", createdAt: 0, duration: 10, steps: [{ t: 0, action: { type: "playback.set", on: true } }, { t: 10, action: { type: "master.volume", value: 0.2 } }] }, {
    schedule: (fn) => { queue.push(fn); let dead = false; cancelled.push(false); const i = cancelled.length - 1; return () => { dead = true; cancelled[i] = true; void dead; }; },
  });
  queue[0]();
  cancel();
  assert.equal(s.playing, true);
  assert.deepEqual(cancelled, [true, true]);
});
