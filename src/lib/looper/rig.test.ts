import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { starterRig } from "./rig";
import { INPUT_PRESETS } from "./inputPresets";
import { EFFECT_DEFS } from "./effects";

describe("starter rig", () => {
  const r = starterRig({ input: "in:3", groups: ["g1", "g2", "g3"], directLinks: ["rec:3:g1", "rec:3:g2", "rec:3:g3"] });
  it("removes the direct recorder links, then adds chains, a switch and the wiring", () => {
    assert.deepEqual(r.actions.slice(0, 3).map((a) => a.type), ["patch.unlink", "patch.unlink", "patch.unlink"]);
    assert.equal(r.chains.length, 4);
    assert.equal(r.actions.filter((a) => a.type === "patch.node").length, 5);
    const links = r.actions.flatMap((a) => (a.type === "patch.link" ? [a.link] : []));
    assert.equal(links.filter((l) => l.from === "in:3").length, 4, "the input feeds every chain");
    assert.equal(links.filter((l) => l.to === r.switchId).length, 4, "every chain feeds the switch");
    assert.deepEqual(links.filter((l) => l.from === r.switchId).map((l) => l.to), ["master", "group:g1", "group:g2", "group:g3"]);
    assert.ok(links.filter((l) => l.to.startsWith("group:")).every((l) => l.port === "rec"), "groups record it");
    assert.equal(new Set(links.map((l) => l.id)).size, links.length, "unique link ids");
  });
  it("uses real guitar presets with known effects", () => {
    const nodes = r.actions.flatMap((a) => (a.type === "patch.node" ? [a.node] : []));
    nodes.filter((n) => n.kind === "fx").forEach((n) => (n.effects ?? []).forEach((e) => assert.ok(EFFECT_DEFS[e.kind], e.kind)));
    assert.ok(INPUT_PRESETS.guitar.length >= 4);
    assert.equal(nodes.find((n) => n.kind === "switch")?.outMulti, true);
  });
});

describe("piano rig", () => {
  it("feeds every bus from every piano, then a switch to the master and the groups", async () => {
    const { pianoRig, PIANO_PRESETS, PIANO_STARTS } = await import("./rig");
    const r = pianoRig({ inputs: ["in:2", "in:3", "in:4"], groups: ["g1", "g2"], directLinks: ["rec:2:g1"] });
    const links = r.actions.flatMap((a) => (a.type === "patch.link" ? [a.link] : []));
    assert.equal(r.buses.length, PIANO_PRESETS.length);
    assert.equal(links.filter((l) => l.from.startsWith("in:")).length, 3 * PIANO_PRESETS.length);
    assert.equal(links.filter((l) => l.to === r.switchId).length, PIANO_PRESETS.length);
    assert.deepEqual(links.filter((l) => l.from === r.switchId).map((l) => l.to), ["master", "group:g1", "group:g2"]);
    assert.equal(new Set(links.map((l) => l.id)).size, links.length);
    assert.equal(r.actions[0].type, "patch.unlink");
    PIANO_PRESETS.forEach((p) => p.effects.forEach((e) => assert.ok(EFFECT_DEFS[e.kind], e.kind)));
    assert.ok(PIANO_PRESETS.some((p) => p.effects.some((e) => e.kind === "reverb")));
    assert.ok(PIANO_STARTS.length >= 3 && new Set(PIANO_STARTS.map((s) => `${s.root}${s.scale}${s.octave}`)).size === PIANO_STARTS.length, "different settings");
  });
});
