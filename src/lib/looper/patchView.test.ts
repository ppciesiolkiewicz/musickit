import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connect, type Patch } from "./patch";
import { MANY_GROUPS, NO_GROUP, linkColour, reachedGroups, sidePoint, sidesFor, spread, stripPatchId } from "./patchView";

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
