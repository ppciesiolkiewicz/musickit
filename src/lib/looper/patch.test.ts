import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeLinks, addNode, feeds, isPatched, layoutAll, moveNode, place, connect, defaultPatch, disconnect, emptyPatch, pathTo, removeNode, sanitisePatch, setLinkMuted, setNodeMuted, setSwitchMode, switchChoice, whyNot, type Patch } from "./patch";

const base = (): Patch => {
  let p = emptyPatch();
  const add = (id: string, kind: Patch["nodes"][number]["kind"]) => (p = { ...p, nodes: [...p.nodes, { id, kind, x: 0, y: 0, muted: false, ...(kind === "switch" ? { inMulti: false, outMulti: false } : {}) }] });
  add("gtr", "input");
  add("sw", "switch");
  add("clean", "fx");
  add("lead", "fx");
  add("bus", "group");
  add("master", "master");
  add("loop", "loop");
  return p;
};

describe("patch rules", () => {
  it("only allows outputs to feed inputs", () => {
    const p = base();
    assert.ok(whyNot(p, "master", "gtr"));
    assert.ok(whyNot(p, "gtr", "loop"), "a loop has no input");
    assert.ok(whyNot(p, "loop", "bus"), "a loop joins its bus by position");
    assert.ok(whyNot(p, "gtr", "gtr"));
    assert.equal(whyNot(p, "gtr", "sw"), null);
  });
  it("refuses duplicates and feedback loops", () => {
    let p = connect(base(), "clean", "lead");
    assert.equal(p.links.length, 1);
    assert.equal(connect(p, "clean", "lead"), p);
    assert.ok(whyNot(p, "lead", "clean"));
    p = connect(p, "lead", "bus");
    assert.ok(whyNot(p, "bus", "clean"));
  });
  it("a switch lets one output through at a time (radio)", () => {
    let p = base();
    p = connect(p, "gtr", "sw", "a");
    p = connect(p, "sw", "clean", "b");
    p = connect(p, "sw", "lead", "c");
    p = connect(p, "clean", "master", "d");
    p = connect(p, "lead", "master", "e");
    assert.deepEqual(activeLinks(p).map((l) => l.id), ["a", "b", "d", "e"], "the second output starts closed");
    assert.deepEqual(pathTo(p, "gtr", "master"), ["gtr", "sw", "clean", "master"]);
    for (const c of switchChoice(p, "sw", "c")) p = setLinkMuted(p, c.id, c.muted);
    assert.deepEqual(pathTo(p, "gtr", "master"), ["gtr", "sw", "lead", "master"]);
    assert.deepEqual(switchChoice(p, "sw", "c"), [], "choosing the open one changes nothing");
  });
  it("a switch can let any combination through (checkboxes), on each side by itself", () => {
    let p = base();
    p = connect(p, "gtr", "sw", "a");
    p = connect(p, "sw", "clean", "b");
    p = connect(p, "sw", "lead", "c");
    p = setSwitchMode(p, "sw", "out", true);
    for (const c of switchChoice(p, "sw", "c")) p = setLinkMuted(p, c.id, c.muted);
    assert.deepEqual(p.links.filter((l) => !l.muted).map((l) => l.id), ["a", "b", "c"]);
    for (const c of switchChoice(p, "sw", "b")) p = setLinkMuted(p, c.id, c.muted);
    assert.deepEqual(p.links.filter((l) => !l.muted).map((l) => l.id), ["a", "c"]);
    // two inputs stay one at a time while the input side is a radio
    p = { ...p, nodes: [...p.nodes, { id: "gtr2", kind: "input", x: 0, y: 0, muted: false }] };
    p = connect(p, "gtr2", "sw", "z");
    assert.equal(p.links.find((l) => l.id === "z")?.muted, true);
    p = setSwitchMode(p, "sw", "in", true);
    p = setLinkMuted(p, "z", false);
    p = setSwitchMode(p, "sw", "in", false);
    assert.deepEqual(p.links.filter((l) => l.to === "sw" && !l.muted).map((l) => l.id), ["a"], "back to one at a time keeps the first open one");
  });
  it("muting a link or an element cuts the path", () => {
    let p = connect(connect(base(), "gtr", "bus", "a"), "bus", "master", "b");
    assert.equal(pathTo(p, "gtr", "master").length, 3);
    assert.deepEqual(pathTo(setLinkMuted(p, "a", true), "gtr", "master"), []);
    assert.deepEqual(pathTo(setNodeMuted(p, "bus", true), "gtr", "master"), []);
    assert.deepEqual(pathTo(setNodeMuted(p, "gtr", true), "gtr", "master"), []);
  });
  it("removing an element drops its links; disconnect keeps one open on a radio side", () => {
    let p = connect(connect(base(), "gtr", "bus", "a"), "bus", "master", "b");
    assert.deepEqual(removeNode(p, "bus").links, []);
    p = connect(connect(base(), "sw", "clean", "x"), "sw", "lead", "y");
    p = disconnect(p, "x");
    assert.equal(p.links.find((l) => l.id === "y")?.muted, false);
  });
});

describe("group recorder", () => {
  it("a group records what reaches its recorder port, through effects and a switch", () => {
    let p = base();
    p = connect(p, "gtr", "sw", "a");
    p = connect(p, "sw", "clean", "b");
    p = connect(p, "sw", "lead", "c");
    p = connect(p, "clean", "bus", "d", "rec");
    p = connect(p, "lead", "bus", "e", "rec");
    assert.deepEqual(feeds(p, "bus", "rec"), ["gtr"]);
    assert.deepEqual(feeds(p, "bus", "bus"), [], "the bus port hears nothing yet");
    assert.deepEqual(feeds(setNodeMuted(p, "gtr", true), "bus", "rec"), []);
    p = setSwitchMode(p, "sw", "out", true);
    assert.deepEqual(feeds(p, "bus", "rec"), ["gtr"]);
  });
  it("only a group has a recorder, and ports are separate links", () => {
    let p = base();
    assert.ok(whyNot(p, "gtr", "master", "rec"));
    p = connect(p, "gtr", "bus", "r", "rec");
    p = connect(p, "gtr", "bus", "b");
    assert.equal(p.links.length, 2);
    assert.equal(connect(p, "gtr", "bus", "r2", "rec"), p);
  });
});

describe("saved patches", () => {
  it("drops what the rules refuse and keeps the rest", () => {
    const p = sanitisePatch({
      nodes: [{ id: "a", kind: "input", x: 1, y: 2 }, { id: "a", kind: "input" }, { id: "m", kind: "master" }, { id: "z", kind: "nonsense" }],
      links: [{ id: "1", from: "a", to: "m", muted: true }, { id: "2", from: "m", to: "a" }, { id: "3", from: "a", to: "nope" }],
    });
    assert.equal(p.nodes.length, 2);
    assert.deepEqual(p.links.map((l) => [l.id, l.muted]), [["1", true]]);
    assert.deepEqual(sanitisePatch(null), { nodes: [], links: [] });
  });
  it("builds the patch that matches today's routing", () => {
    const p = defaultPatch({ inputs: [{ id: 0, kind: "device" }, { id: 1, kind: "scalepiano" }, { id: 2, kind: "sequencer", sourceId: "s1" }], groups: ["g1", "g2"], sequencers: [{ id: "s1", group: "g2" }, { id: "s2", group: null }] });
    assert.deepEqual(feeds(p, "group:g2", "rec").sort(), ["in:0", "in:1"]);
    assert.deepEqual(feeds(p, "group:g1", "bus"), []);
    assert.deepEqual(pathTo(p, "seq:s1", "master"), ["seq:s1", "group:g2", "master"]);
    assert.deepEqual(pathTo(p, "seq:s2", "master"), ["seq:s2", "master"]);
    assert.equal(p.nodes.filter((n) => n.kind === "group").length, 2);
  });
});

describe("canvas helpers", () => {
  it("places elements in a column per kind, stacked", () => {
    let p = emptyPatch();
    const a = place(p, "input");
    p = addNode(p, { id: "f1", kind: "fx", x: 0, y: 0, muted: false });
    assert.ok(place(p, "fx").y > a.y - 1);
    assert.ok(place(p, "fx").x > a.x);
    assert.equal(place(p, "master").x > place(p, "fx").x, true);
  });
  it("adds effect chains and switches only, with fresh ids", () => {
    let p = addNode(emptyPatch(), { id: "f1", kind: "fx", x: 1, y: 2, muted: false });
    assert.deepEqual(p.nodes[0].effects, []);
    assert.equal(addNode(p, { id: "f1", kind: "fx", x: 0, y: 0, muted: false }), p);
    assert.equal(addNode(p, { id: "m", kind: "master", x: 0, y: 0, muted: false }), p);
    p = addNode(p, { id: "s1", kind: "switch", x: 0, y: 0, muted: false });
    assert.equal(p.nodes[1].inMulti, false);
    assert.equal(moveNode(p, "s1", -5, 99999).nodes[1].y, 3000);
  });
  it("lays a whole patch out afresh", () => {
    const p = layoutAll(base());
    assert.equal(new Set(p.nodes.map((n) => `${n.x},${n.y}`)).size, p.nodes.length, "no two on the same spot");
  });
  it("tells a patched source from one that is only recordable", () => {
    let p = connect(base(), "gtr", "bus", "r", "rec");
    assert.equal(isPatched(p, "gtr"), false);
    p = connect(p, "gtr", "sw", "a");
    assert.equal(isPatched(p, "gtr"), true);
    assert.equal(isPatched(connect(base(), "gtr", "master", "m"), "gtr"), true);
  });
  it("keeps the effects of a chain when a save is loaded", () => {
    const p = sanitisePatch({ nodes: [{ id: "f", kind: "fx", x: 1, y: 1, name: "Amp A", effects: [{ id: "e1", kind: "reverb", params: { mix: 0.4 } }, { kind: "nonsense" }] }], links: [] });
    assert.equal(p.nodes[0].name, "Amp A");
    assert.equal(p.nodes[0].effects?.length, 1);
  });
  it("keeps groups, sequencers and generators to the routing that exists", () => {
    let p = base();
    p = { ...p, nodes: [...p.nodes, { id: "seq", kind: "sequencer", x: 0, y: 0, muted: false }, { id: "syn", kind: "synth", x: 0, y: 0, muted: false }] };
    assert.ok(whyNot(p, "bus", "sw"));
    assert.equal(whyNot(p, "bus", "master"), null);
    assert.ok(whyNot(p, "seq", "sw"));
    assert.equal(whyNot(p, "seq", "bus"), null);
    assert.ok(whyNot(p, "syn", "master"));
  });
});

describe("old switch saves", () => {
  it("keep every input open and only the chosen output", () => {
    const raw = { nodes: [{ id: "gtr", kind: "input", x: 0, y: 0 }, { id: "sw", kind: "switch", x: 0, y: 0, selected: 1 }, { id: "clean", kind: "fx", x: 0, y: 0 }, { id: "lead", kind: "fx", x: 0, y: 0 }], links: [{ id: "a", from: "gtr", to: "sw" }, { id: "b", from: "sw", to: "clean" }, { id: "c", from: "sw", to: "lead" }] };
    const p = sanitisePatch(raw);
    assert.deepEqual(p.links.filter((l) => !l.muted).map((l) => l.id), ["a", "c"]);
  });
});
