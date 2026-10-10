import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connect, disconnect, sanitisePatch, setSwitchMode, type Patch } from "./patch";
import { MANY_GROUPS, NO_GROUP, destinationChoice, destinationPick, destinations, drawnFrom, linkColour, outSources, reachedGroups, sidePoint, sidesFor, spread, stripPatchId } from "./patchView";

const node = (id: string, kind: Patch["nodes"][number]["kind"]) => ({ id, kind, x: 0, y: 0, muted: false, ...(kind === "switch" ? { inMulti: false, outMulti: true } : {}) });
const base = (): Patch => ({ nodes: [node("in:1", "input"), node("sw", "switch"), node("fx", "fx"), node("group:a", "group"), node("group:b", "group"), node("master", "master")], links: [] });
const colours = { "group:a": "#111111", "group:b": "#222222" };

describe("patch view colours", () => {
  it("a connection takes the colour of the one group it ends in", () => {
    let p = base();
    p = connect(p, "in:1", "fx", "a");
    p = connect(p, "fx", "sw", "b");
    p = connect(p, "sw", "group:a", "c", "rec");
    assert.deepEqual(reachedGroups(p, "fx"), ["group:a"]);
    assert.equal(linkColour(p, p.links[0], colours), "#111111");
    assert.equal(linkColour(p, p.links[2], colours), "#111111");
  });
  it("is neutral when it reaches several groups or none", () => {
    let p = base();
    p = connect(p, "in:1", "sw", "a");
    p = connect(p, "sw", "group:a", "b", "rec");
    p = connect(p, "sw", "group:b", "c", "rec");
    p = connect(p, "sw", "master", "d");
    assert.equal(linkColour(p, p.links[0], colours), MANY_GROUPS);
    assert.equal(linkColour(p, p.links[1], colours), "#111111");
    assert.equal(linkColour(p, p.links[3], colours), NO_GROUP);
  });
  it("names mixer strips for the patch", () => {
    assert.equal(stripPatchId({ id: 4, kind: "device" }), "in:4");
    assert.equal(stripPatchId({ id: 5, kind: "sequencer", sourceId: "q1" }), "seq:q1");
  });
});

describe("patch view sides", () => {
  const a = { x: 100, y: 100, w: 100, h: 50 };
  it("joins facing sides when one block is clear of the other", () => {
    assert.deepEqual(sidesFor(a, { x: 300, y: 90, w: 80, h: 60 }), { from: "right", to: "left" });
    assert.deepEqual(sidesFor(a, { x: 0, y: 90, w: 50, h: 60 }), { from: "left", to: "right" });
    assert.deepEqual(sidesFor(a, { x: 110, y: 300, w: 80, h: 60 }), { from: "bottom", to: "top" });
    assert.deepEqual(sidesFor(a, { x: 110, y: 0, w: 80, h: 60 }), { from: "top", to: "bottom" });
  });
  it("falls back to the way the centres lie when blocks overlap", () => {
    assert.deepEqual(sidesFor(a, { x: 150, y: 120, w: 100, h: 50 }), { from: "right", to: "left" });
    assert.deepEqual(sidesFor(a, { x: 110, y: 140, w: 100, h: 90 }), { from: "bottom", to: "top" });
  });
  it("finds points on a side and spreads several apart", () => {
    assert.deepEqual(sidePoint(a, "right"), { x: 200, y: 125 });
    assert.deepEqual(sidePoint(a, "top", 0.5, 10), { x: 160, y: 100 });
    assert.deepEqual([0, 1, 2, 3].map(spread), [0, 10, -10, 20]);
  });
});

describe("flowingLinks", () => {
  it("leaves out open links that lead into a closed switch output", async () => {
    const { flowingLinks } = await import("./patchView");
    const node = (id: string, kind: string) => ({ id, kind, x: 0, y: 0, muted: false } as never);
    const p = {
      nodes: [node("in:1", "input"), node("fx:a", "fx"), node("fx:b", "fx"), node("sw:1", "switch"), node("master", "master")],
      links: [
        { id: "1", from: "in:1", to: "fx:a", muted: false },
        { id: "2", from: "in:1", to: "fx:b", muted: false },
        { id: "3", from: "fx:a", to: "sw:1", muted: false },
        { id: "4", from: "fx:b", to: "sw:1", muted: true },
        { id: "5", from: "sw:1", to: "master", muted: false },
      ],
    };
    const active = new Set(["1", "2", "3", "5"]);
    assert.deepEqual([...flowingLinks(p as never, active)].sort(), ["1", "3", "5"]);
  });
  it("leaves out the output of a bus nothing reaches", async () => {
    const { flowingLinks } = await import("./patchView");
    const node = (id: string, kind: string) => ({ id, kind, x: 0, y: 0, muted: false } as never);
    const p = {
      nodes: [node("in:1", "input"), node("fx:a", "fx"), node("fx:b", "fx"), node("master", "master")],
      links: [
        { id: "1", from: "in:1", to: "fx:a", muted: false },
        { id: "2", from: "in:1", to: "fx:b", muted: true },
        { id: "3", from: "fx:a", to: "master", muted: false },
        { id: "4", from: "fx:b", to: "master", muted: false },
      ],
    };
    assert.deepEqual([...flowingLinks(p as never, new Set(["1", "3", "4"]))].sort(), ["1", "3"]);
  });
});

describe("one output per input", () => {
  const withBuses = (): Patch => {
    let p: Patch = { ...base(), nodes: [...base().nodes, { ...node("b1", "fx"), owner: "in:1" }, { ...node("b2", "fx"), owner: "in:1" }] };
    p = connect(p, "in:1", "b1", "i1");
    p = connect(p, "in:1", "b2", "i2");
    p = connect(p, "b1", "group:a", "a1", "rec");
    p = connect(p, "b2", "group:a", "a2", "rec");
    p = connect(p, "b1", "master", "m1");
    p = connect(p, "b2", "master", "m2", "bus", true);
    return p;
  };
  it("sends from its buses when it has some, else from itself", () => {
    assert.deepEqual(outSources(withBuses(), "in:1"), ["b1", "b2"]);
    assert.deepEqual(outSources(base(), "in:1"), ["in:1"]);
  });
  it("gathers the links of every bus into one entry per place", () => {
    const d = destinations(withBuses(), "in:1");
    assert.deepEqual(d.map((x) => [x.key, x.links.map((l) => l.id), x.on]), [["group:a|rec", ["a1", "a2"], true], ["master|bus", ["m1", "m2"], true]]);
  });
  it("ticking a place off or on sets every link to it", () => {
    const p = withBuses();
    assert.deepEqual(destinationChoice(p, "in:1", "master|bus", false), [{ id: "m1", muted: true }]);
    assert.deepEqual(destinationChoice(p, "in:1", "master|bus", true), [{ id: "m2", muted: false }]);
    assert.deepEqual(destinationChoice(p, "in:1", "nowhere|bus", true), []);
  });
  const mutes = (p: Patch) => Object.fromEntries(p.links.filter((l) => !l.id.startsWith("i")).map((l) => [l.id, l.muted]));
  it("any combination by default: choosing a place ticks it", () => {
    assert.deepEqual(destinationPick(withBuses(), "in:1", "master|bus"), [{ id: "m1", muted: true }]);
  });
  it("one place at a time keeps the first open place and closes the rest", () => {
    const p = setSwitchMode(withBuses(), "in:1", "dest", false);
    assert.equal(p.nodes.find((n) => n.id === "in:1")?.destOne, true);
    assert.deepEqual(mutes(p), { a1: false, a2: false, m1: true, m2: true });
  });
  it("one place at a time: choosing a place opens all its links and closes the others; the open one is a no-op", () => {
    const p = setSwitchMode(withBuses(), "in:1", "dest", false);
    assert.deepEqual(destinationPick(p, "in:1", "master|bus").sort((a, b) => a.id.localeCompare(b.id)), [{ id: "a1", muted: true }, { id: "a2", muted: true }, { id: "m1", muted: false }, { id: "m2", muted: false }]);
    assert.deepEqual(destinationPick(p, "in:1", "group:a|rec"), []);
  });
  it("one place at a time: a new place starts closed, removing the open one opens the next", () => {
    let p = setSwitchMode(withBuses(), "in:1", "dest", false);
    p = connect(p, "b1", "group:a", "g1");
    assert.equal(p.links.find((l) => l.id === "g1")?.muted, true);
    p = disconnect(disconnect(p, "a1"), "a2");
    assert.deepEqual(destinations(p, "in:1").filter((d) => d.on).map((d) => d.key), ["master|bus"]);
    assert.deepEqual(mutes(p), { m1: false, m2: false, g1: true });
  });
  it("keeps the mode across a save", () => {
    const p = setSwitchMode(withBuses(), "in:1", "dest", false);
    assert.equal(sanitisePatch(JSON.parse(JSON.stringify(p))).nodes.find((n) => n.id === "in:1")?.destOne, true);
  });
  it("draws a bus's link from its input", () => {
    const p = withBuses();
    assert.equal(drawnFrom(p, p.links.find((l) => l.id === "a2")!), "in:1");
    assert.equal(drawnFrom(p, p.links.find((l) => l.id === "i1")!), "in:1");
  });
});
