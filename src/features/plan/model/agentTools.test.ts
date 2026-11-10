import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listToolsReply, showToolReply, toolNames } from "./agentTools";

describe("agent tools", () => {
  it("names every exercise tool, no shapes", () => {
    const names = toolNames();
    assert.ok(names.includes("scale-neck") && names.includes("backing-band"));
    assert.ok(!names.includes("arpeggio-part"));
  });
  it("lists all tools, or only the named ones", () => {
    assert.ok(listToolsReply().includes("- scale-neck :"));
    const one = listToolsReply(["backing-band"]);
    assert.ok(one.includes("- backing-band :") && !one.includes("- scale-neck :"));
    assert.match(listToolsReply(["nope"]), /No tool named nope/);
  });
  it("shows a good tool and says so", () => {
    const r = showToolReply({ type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [2] });
    assert.equal(r.tool?.type, "scale-neck");
    assert.equal(r.reply, "Showing scale-neck to the student.");
  });
  it("reads a tool sent as JSON text and names what it defaulted", () => {
    const r = showToolReply(JSON.stringify({ type: "backing-band", bpm: 70, parts: { drone: "on" } }));
    assert.equal(r.tool?.type, "backing-band");
    assert.match(r.reply, /changed some things:\n- backing-band had no key/);
  });
  it("refuses what it can't show, pointing at the list", () => {
    const r = showToolReply({ type: "kazoo" });
    assert.equal(r.tool, null);
    assert.match(r.reply, /Not shown: a tool of unknown type "kazoo".*list_exercise_tools/);
  });
});
