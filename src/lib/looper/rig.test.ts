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
