import { test } from "node:test";
import assert from "node:assert/strict";
import { blockVideos, firstShown, videoFor } from "./lookup";

const every = { id: "v-all", tool: "picking-drill", steps: ["picking-drill:new", "picking-drill:intermediate", "picking-drill:advanced", "none"] };
const beginner = { id: "v-beg", tool: "picking-drill", steps: ["picking-drill:beginner"] };
const band = { id: "v-band", tool: "backing-band", steps: null };
const ask = (cell: number, tool: string, step: string | null) => ({ cell, tool, step });

test("the block's own video wins", () => assert.deepEqual(videoFor(ask(1, "picking-drill", "picking-drill:beginner"), { 1: "v-own" }, [beginner]), { id: "v-own", from: "block" }));
test("the tool's video holding the step", () => assert.deepEqual(videoFor(ask(0, "picking-drill", "picking-drill:beginner"), {}, [every, beginner]), { id: "v-beg", from: "tool" }));
test("No level uses the video holding none", () => assert.equal(videoFor(ask(0, "picking-drill", "none"), {}, [every, beginner])?.id, "v-all"));
test("a step no video holds shows nothing: no borrowing", () => assert.equal(videoFor(ask(0, "picking-drill", "picking-drill:beginner"), {}, [every]), null));
test("a tool with no ladder uses its video with null steps", () => assert.equal(videoFor(ask(0, "backing-band", null), {}, [band])?.id, "v-band"));
test("null steps never match a step, and steps never match a tool with none", () => {
  assert.equal(videoFor(ask(0, "backing-band", "none"), {}, [band]), null);
  assert.equal(videoFor(ask(0, "picking-drill", null), {}, [every]), null);
});
test("a video with no tool shows nowhere", () => assert.equal(videoFor(ask(0, "picking-drill", "none"), {}, [{ id: "x", tool: null, steps: null }]), null));
test("a block shows each video once, by video and not by tool", () => {
  const asks = [ask(0, "picking-drill", "picking-drill:new"), ask(1, "picking-drill", "picking-drill:advanced"), ask(2, "picking-drill", "picking-drill:beginner")];
  assert.deepEqual(blockVideos(asks, {}, [every, beginner]).map((v) => [v.cell, v.id, v.repeat]), [[0, "v-all", false], [1, "v-all", true], [2, "v-beg", false]]);
});
test("firstShown", () => assert.deepEqual(firstShown(["a", null, "a", "b"]), [true, false, false, true]));
