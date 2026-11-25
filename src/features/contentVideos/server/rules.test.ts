import assert from "node:assert/strict";
import { test } from "node:test";
import { contentVideoPath, isMadeFor, readTarget } from "./rules";

const ID = "3f9c2a10-0000-4000-8000-000000000001";
test("the path names where it was made", () => {
  assert.equal(contentVideoPath("tool:picking-drill", ID, "video/webm;codecs=vp9,opus"), `content/videos/tool:picking-drill/${ID}.webm`);
  assert.equal(contentVideoPath("guitar-beginner-blues-boogie-pattern-in-a", ID, "video/mp4"), `content/videos/guitar-beginner-blues-boogie-pattern-in-a/${ID}.mp4`);
});
test("made_for is a tool or a block id, nothing with a slash or dots", () => {
  for (const ok of ["tool:picking-drill", "tool:guitar-play-along:riff", "guitar-beginner-x"]) assert.equal(isMadeFor(ok), true, ok);
  for (const bad of ["tool:nonsense", "tool:guitar-play-along", "../x", "a/b", "", "A", 3]) assert.equal(isMadeFor(bad), false, String(bad));
});
test("a tool target ticks steps of that tool", () => {
  assert.deepEqual(readTarget({ kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner", "none"] }, "tool:picking-drill"), { kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner", "none"] });
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: [] }, "tool:picking-drill"), null);
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: null }, "tool:picking-drill"), null);
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: ["note-finder:new"] }, "tool:picking-drill"), null);
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: ["none", "none"] }, "tool:picking-drill"), null);
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: ["none"] }, "tool:note-finder"), null);
});
test("steps come back in ladder order", () => {
  assert.deepEqual(readTarget({ kind: "tool", tool: "picking-drill", steps: ["none", "picking-drill:beginner"] }, "tool:picking-drill"), { kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner", "none"] });
});
test("a tool with no ladder takes null steps only", () => {
  assert.deepEqual(readTarget({ kind: "tool", tool: "backing-band", steps: null }, "tool:backing-band"), { kind: "tool", tool: "backing-band", steps: null });
  assert.equal(readTarget({ kind: "tool", tool: "backing-band", steps: ["none"] }, "tool:backing-band"), null);
});
test("a cell target is a block and a whole index under MAX_CELLS", () => {
  assert.deepEqual(readTarget({ kind: "cell", blockId: "riff-x", cell: 0, tool: "picking-drill" }, "riff-x"), { kind: "cell", blockId: "riff-x", cell: 0, tool: "picking-drill" });
  for (const tool of [undefined, "nope", 3]) assert.equal(readTarget({ kind: "cell", blockId: "riff-x", cell: 0, tool }, "riff-x"), null);
  for (const cell of [-1, 1.5, 24, "0"]) assert.equal(readTarget({ kind: "cell", blockId: "riff-x", cell, tool: "picking-drill" }, "riff-x"), null);
  assert.equal(readTarget({ kind: "cell", blockId: "riff-x", cell: 0, tool: "picking-drill" }, "riff-y"), null);
});
