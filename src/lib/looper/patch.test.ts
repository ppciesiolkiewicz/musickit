import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeLinks, feeds, connect, defaultPatch, disconnect, emptyPatch, pathTo, removeNode, sanitisePatch, setLinkMuted, setNodeMuted, setSwitch, whyNot, type Patch } from "./patch";

const base = (): Patch => {
  let p = emptyPatch();
  const add = (id: string, kind: Patch["nodes"][number]["kind"]) => (p = { ...p, nodes: [...p.nodes, { id, kind, x: 0, y: 0, muted: false, ...(kind === "switch" ? { selected: 0 } : {}) }] });
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
  it("a switch lets one output through", () => {
    let p = base();
    p = connect(p, "gtr", "sw", "a");
    p = connect(p, "sw", "clean", "b");
    p = connect(p, "sw", "lead", "c");
    p = connect(p, "clean", "master", "d");
    p = connect(p, "lead", "master", "e");
    assert.deepEqual(activeLinks(p).map((l) => l.id), ["a", "b", "d", "e"]);
    assert.deepEqual(pathTo(p, "gtr", "master"), ["gtr", "sw", "clean", "master"]);
    p = setSwitch(p, "sw", 1);
    assert.deepEqual(pathTo(p, "gtr", "master"), ["gtr", "sw", "lead", "master"]);
    assert.equal(setSwitch(p, "sw", 9).nodes.find((n) => n.id === "sw")?.selected, 1, "clamped to the last output");
  });
  it("muting a link or an element cuts the path", () => {
    let p = connect(connect(base(), "gtr", "bus", "a"), "bus", "master", "b");
    assert.equal(pathTo(p, "gtr", "master").length, 3);
    assert.deepEqual(pathTo(setLinkMuted(p, "a", true), "gtr", "master"), []);
    assert.deepEqual(pathTo(setNodeMuted(p, "bus", true), "gtr", "master"), []);
    assert.deepEqual(pathTo(setNodeMuted(p, "gtr", true), "gtr", "master"), []);
  });
  it("removing an element drops its links; disconnect keeps the switch selection valid", () => {
    let p = connect(connect(base(), "gtr", "bus", "a"), "bus", "master", "b");
    assert.deepEqual(removeNode(p, "bus").links, []);
    p = connect(connect(base(), "sw", "clean", "x"), "sw", "lead", "y");
    p = setSwitch(p, "sw", 1);
    p = disconnect(p, "y");
    assert.equal(p.nodes.find((n) => n.id === "sw")?.selected, 0);
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
    assert.deepEqual(feeds(setSwitch(p, "sw", 1), "bus", "rec"), ["gtr"]);
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
