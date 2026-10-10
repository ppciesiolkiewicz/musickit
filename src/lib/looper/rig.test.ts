import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PIANO_PRESETS, PIANO_STARTS, SEQUENCER_STARTS, pianoRig, starterRig } from "./rig";
import { BASS, DRUMS } from "./sequencer";
import { DEFAULT_GROUPS } from "./layout";
import { INPUT_PRESETS } from "./inputPresets";
import { EFFECT_DEFS } from "./effects";

const links = (actions: { type: string }[]) => actions.flatMap((a) => (a.type === "patch.link" ? [(a as { link: { id: string; from: string; to: string; port?: string; muted?: boolean } }).link] : []));
const nodes = (actions: { type: string }[]) => actions.flatMap((a) => (a.type === "patch.node" ? [(a as { node: { id: string; kind: string; owner?: string; effects?: { kind: keyof typeof EFFECT_DEFS }[] } }).node] : []));

describe("starter rig", () => {
  const r = starterRig({ input: "in:3", groups: ["g1", "g2", "g3"], directLinks: ["rec:3:g1", "rec:3:g2", "rec:3:g3"] });
  it("removes the direct recorder links, then gives the input four buses of its own", () => {
    assert.deepEqual(r.actions.slice(0, 3).map((a) => a.type), ["patch.unlink", "patch.unlink", "patch.unlink"]);
    const n = nodes(r.actions);
    assert.equal(n.length, 4);
    assert.ok(n.every((x) => x.kind === "fx" && x.owner === "in:3"), "no separate switch: the buses belong to the input");
    const l = links(r.actions);
    const mine = l.filter((x) => x.from === "in:3");
    assert.equal(mine.length, 4);
    assert.deepEqual(mine.map((x) => x.muted), [false, true, true, true], "the first bus is open, the rest closed");
  });
  it("sends every bus to the master and into every group's recorder", () => {
    const l = links(r.actions);
    r.buses.forEach((b) => {
      assert.deepEqual(l.filter((x) => x.from === b).map((x) => x.to), ["master", "group:g1", "group:g2", "group:g3"]);
      assert.ok(l.filter((x) => x.from === b && x.to.startsWith("group:")).every((x) => x.port === "rec"));
    });
    assert.equal(new Set(l.map((x) => x.id)).size, l.length, "unique link ids");
  });
  it("uses real guitar presets with known effects", () => {
    nodes(r.actions).forEach((n) => (n.effects ?? []).forEach((e) => assert.ok(EFFECT_DEFS[e.kind], e.kind)));
    assert.ok(INPUT_PRESETS.guitar.length >= 4);
  });
});

describe("piano rig", () => {
  it("gives each piano the reverb buses, the dry one open", () => {
    const r = pianoRig({ inputs: ["in:2", "in:3", "in:4"], groups: ["g1", "g2"], directLinks: ["rec:2:g1"] });
    const l = links(r.actions);
    assert.equal(r.buses.length, 3 * PIANO_PRESETS.length);
    assert.equal(nodes(r.actions).filter((n) => n.owner === "in:3").length, PIANO_PRESETS.length);
    assert.deepEqual(l.filter((x) => x.from === "in:3").map((x) => x.muted), PIANO_PRESETS.map((_, i) => i > 0));
    assert.equal(new Set(l.map((x) => x.id)).size, l.length);
    assert.equal(r.actions[0].type, "patch.unlink");
    PIANO_PRESETS.forEach((p) => p.effects.forEach((e) => assert.ok(EFFECT_DEFS[e.kind], e.kind)));
    assert.ok(PIANO_PRESETS.some((p) => p.effects.some((e) => e.kind === "reverb")));
    assert.ok(PIANO_STARTS.length >= 3 && new Set(PIANO_STARTS.map((s) => `${s.root}${s.scale}${s.octave}`)).size === PIANO_STARTS.length, "different settings");
  });
});

describe("default sequencers", () => {
  it("gives every default group its own drum and bass grooves, all of them real presets", () => {
    assert.equal(SEQUENCER_STARTS.length, DEFAULT_GROUPS);
    for (const s of SEQUENCER_STARTS) {
      assert.ok(DRUMS.presets.some((p) => p.id === s.drums && p.id !== "empty"), s.drums);
      assert.ok(BASS.presets.some((p) => p.id === s.bass && p.id !== "empty"), s.bass);
    }
    assert.equal(new Set(SEQUENCER_STARTS.map((s) => s.drums)).size, SEQUENCER_STARTS.length);
    assert.equal(new Set(SEQUENCER_STARTS.map((s) => s.bass)).size, SEQUENCER_STARTS.length);
  });
  it("has presets with one row of sixteen steps per lane", () => {
    for (const inst of [DRUMS, BASS]) for (const p of inst.presets) {
      assert.equal(p.rows.length, inst.lanes.length, `${inst.id} ${p.id}`);
      assert.ok(p.rows.every((r) => r.length === 16), `${inst.id} ${p.id}`);
    }
  });
});
