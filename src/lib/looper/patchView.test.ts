import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connect, type Patch } from "./patch";
import { SOURCE_COLOURS, linkColour, sourceColours, stripPatchId, upstreamSources } from "./patchView";

const node = (id: string, kind: Patch["nodes"][number]["kind"]) => ({ id, kind, x: 0, y: 0, muted: false, ...(kind === "switch" ? { selected: 0 } : {}) });
const base = (): Patch => ({ nodes: [node("in:1", "input"), node("in:2", "piano"), node("sw", "switch"), node("fx", "fx"), node("group:a", "group"), node("master", "master")], links: [] });

describe("patch view", () => {
  it("gives each sound maker its own colour, in order", () => {
    const c = sourceColours(base());
    assert.equal(c["in:1"], SOURCE_COLOURS[0]);
    assert.equal(c["in:2"], SOURCE_COLOURS[1]);
    assert.equal(c.sw, undefined);
  });
  it("follows a connection back to the sound maker behind it", () => {
    let p = base();
    p = connect(p, "in:2", "fx", "a");
    p = connect(p, "fx", "sw", "b");
    p = connect(p, "sw", "group:a", "c", "rec");
    assert.deepEqual(upstreamSources(p, "sw"), ["in:2"]);
    const c = sourceColours(p);
    assert.equal(linkColour(p, p.links[2], c), c["in:2"]);
    assert.equal(linkColour(base(), { id: "x", from: "fx", to: "sw", muted: false }, c), "#64748b");
  });
  it("names mixer strips for the patch", () => {
    assert.equal(stripPatchId({ id: 4, kind: "device" }), "in:4");
    assert.equal(stripPatchId({ id: 5, kind: "sequencer", sourceId: "q1" }), "seq:q1");
  });
});
