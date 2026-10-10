import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GROUP_STARTS, GUITAR_AMPS, PIANO_PRESETS, PIANO_STARTS, RIG_PRESETS, SEQUENCER_STARTS, pianoRig, starterRig } from "./rig";
import { addNode, connect, feeds, type Patch, type PatchNode } from "./patch";
import { BASS, DRUMS } from "./sequencer";
import { DEFAULT_GROUPS } from "./layout";
import { INPUT_PRESETS } from "./inputPresets";
import { EFFECT_DEFS } from "./effects";

const links = (actions: { type: string }[]) => actions.flatMap((a) => (a.type === "patch.link" ? [(a as { link: { id: string; from: string; to: string; port?: string; muted?: boolean } }).link] : []));
const nodes = (actions: { type: string }[]) => actions.flatMap((a) => (a.type === "patch.node" ? [(a as { node: { id: string; kind: string; owner?: string; effects?: { kind: keyof typeof EFFECT_DEFS }[] } }).node] : []));

describe("starter rig", () => {
  const r = starterRig({ input: "in:3", groups: ["g1", "g2", "g3"], directLinks: ["rec:3:g1", "rec:3:g2", "rec:3:g3"] });
  const busCount = RIG_PRESETS.length + GUITAR_AMPS.length;
  it("removes the direct recorder links, then gives the input its buses and a tuner", () => {
    assert.deepEqual(r.actions.slice(0, 3).map((a) => a.type), ["patch.unlink", "patch.unlink", "patch.unlink"]);
    const n = nodes(r.actions);
    assert.equal(n.filter((x) => x.kind === "tuner").length, 1);
    const buses = n.filter((x) => x.kind === "fx");
    assert.equal(buses.length, busCount);
    assert.ok(buses.every((x) => x.owner === "in:3"), "the buses belong to the input");
    assert.ok(n.findIndex((x) => x.kind === "tuner") < n.findIndex((x) => x.kind === "fx"), "the tuner exists before anything links to it");
    const mine = links(r.actions).filter((x) => x.from === "in:3");
    assert.equal(mine.length, busCount);
    assert.deepEqual(mine.map((x) => x.muted), buses.map((_, i) => i > 0), "the first bus is open, the rest closed");
  });
  it("sends every bus to the master and into the tuner, and the tuner into every group's recorder", () => {
    const l = links(r.actions);
    r.buses.forEach((b) => assert.deepEqual(l.filter((x) => x.from === b).map((x) => x.to), ["master", r.tuner]));
    assert.deepEqual(l.filter((x) => x.from === r.tuner).map((x) => x.to), ["group:g1", "group:g2", "group:g3"]);
    assert.ok(l.filter((x) => x.from === r.tuner).every((x) => x.port === "rec"));
    assert.equal(new Set(l.map((x) => x.id)).size, l.length, "unique link ids");
  });
  it("names each amp bus after its amp and asks for that amp's model", () => {
    const n = nodes(r.actions).filter((x) => x.kind === "fx");
    GUITAR_AMPS.forEach((a) => {
      const bus = n.find((x) => (x as { name?: string }).name === a.name);
      assert.ok(bus, a.name);
      const amp = (bus!.effects ?? []).find((e) => e.kind === "nam") as { amp?: string } | undefined;
      assert.equal(amp?.amp, a.find);
    });
    assert.equal(new Set(GUITAR_AMPS.map((a) => a.name)).size, GUITAR_AMPS.length, "different names");
    assert.ok(!(n[0].effects ?? []).some((e) => e.kind === "nam"), "the open bus needs no download");
  });
  it("uses real guitar presets with known effects", () => {
    nodes(r.actions).forEach((n) => (n.effects ?? []).forEach((e) => assert.ok(EFFECT_DEFS[e.kind], e.kind)));
    RIG_PRESETS.forEach((id) => assert.ok(INPUT_PRESETS.guitar.some((p) => p.id === id), id));
  });
  it("is a patch the rules accept: every link is made", () => {
    let p: Patch = { nodes: [{ id: "in:3", kind: "input", x: 0, y: 0, muted: false }, { id: "master", kind: "master", x: 0, y: 0, muted: false }, ...["g1", "g2", "g3"].map((g) => ({ id: `group:${g}`, kind: "group" as const, x: 0, y: 0, muted: false }))], links: [] };
    for (const a of r.actions) {
      if (a.type === "patch.node") p = addNode(p, { ...a.node, muted: false, effects: undefined } as PatchNode);
      if (a.type === "patch.link") p = connect(p, a.link.from, a.link.to, a.link.id, a.link.port ?? "bus", a.link.muted);
    }
    assert.equal(p.links.length, links(r.actions).length);
    assert.deepEqual(feeds(p, "group:g2", "rec"), ["in:3"], "the guitar records through its bus and the tuner");
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
    assert.equal(PIANO_STARTS.length, 1, "one default Scale Piano");
  });
});

describe("default groups", () => {
  it("names every default group and gives each its own real effects", () => {
    assert.equal(GROUP_STARTS.length, DEFAULT_GROUPS);
    assert.equal(new Set(GROUP_STARTS.map((g) => g.name)).size, GROUP_STARTS.length, "unique names");
    assert.equal(new Set(GROUP_STARTS.map((g) => g.effects.map((e) => e.kind).join())).size, GROUP_STARTS.length, "different effects");
    GROUP_STARTS.forEach((g) => {
      assert.ok(g.name.length > 0 && g.name.length <= 24, g.name);
      assert.ok(g.effects.length > 0, g.name);
      g.effects.forEach((e) => {
        assert.ok(EFFECT_DEFS[e.kind], e.kind);
        Object.keys(e.params ?? {}).forEach((k) => assert.ok(EFFECT_DEFS[e.kind].params.some((p) => p.key === k), `${e.kind}.${k}`));
      });
    });
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
