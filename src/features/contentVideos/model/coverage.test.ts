import { test } from "node:test";
import assert from "node:assert/strict";
import { coverage, coveredCount, seedUse, stepGroups, videoTools } from "./coverage";
import { stepsOfTool } from "./slot";

test("every tool but video, a guitar-play-along once per shape", () => {
  const tools = videoTools();
  assert.ok(tools.includes("picking-drill"));
  assert.ok(tools.includes("guitar-play-along:riff"));
  assert.ok(!tools.includes("guitar-play-along"));
  assert.ok(!tools.includes("video"));
  assert.equal(new Set(tools).size, tools.length);
});

test("a laddered tool's groups hold exactly its steps, No level last; a tool with no ladder is the tool", () => {
  for (const tool of videoTools()) {
    const steps = stepGroups(tool).flatMap((g) => g.steps.map((s) => s.step));
    const all = stepsOfTool(tool);
    assert.deepEqual(steps, all ?? [null], tool);
  }
  assert.deepEqual(stepGroups("interval-ears").map((g) => g.ladder), ["interval-ears", "chord-changes", null]);
});

test("seed use counts each block once per tool and step", () => {
  const use = seedUse([
    { id: "b", asks: [{ cell: 0, tool: "picking-drill", step: "picking-drill:beginner" }, { cell: 1, tool: "picking-drill", step: "picking-drill:beginner" }] },
    { id: "a", asks: [{ cell: 0, tool: "picking-drill", step: "picking-drill:beginner" }, { cell: 1, tool: "backing-band", step: null }] },
  ]);
  assert.deepEqual(use, { "picking-drill": { "picking-drill:beginner": ["a", "b"] }, "backing-band": { "": ["a"] } });
});

test("coverage gives each step its video and blocks; counts what is covered", () => {
  const videos = [
    { id: "all", tool: "picking-drill", steps: ["picking-drill:new", "none"] },
    { id: "beg", tool: "picking-drill", steps: ["picking-drill:beginner"] },
    { id: "band", tool: "backing-band", steps: null },
    { id: "loose", tool: null, steps: null },
  ];
  const use = { "picking-drill": { "picking-drill:beginner": ["a"] } };
  const got = coverage("picking-drill", videos, use).flatMap((g) => g.steps.map((s) => [s.step, s.video, s.blocks.length]));
  assert.deepEqual(got, [
    ["picking-drill:new", "all", 0],
    ["picking-drill:beginner", "beg", 1],
    ["picking-drill:intermediate", null, 0],
    ["picking-drill:advanced", null, 0],
    ["none", "all", 0],
  ]);
  assert.deepEqual(coveredCount("picking-drill", videos), { covered: 3, of: 5 });
  assert.deepEqual(coveredCount("backing-band", videos), { covered: 1, of: 1 });
  assert.deepEqual(coverage("backing-band", videos, {})[0].steps[0].video, "band");
});

test("wouldLose names the videos a save takes steps from", async () => {
  const { wouldLose } = await import("./coverage");
  const videos = [
    { id: "all", tool: "picking-drill", steps: ["picking-drill:new", "picking-drill:beginner", "none"] },
    { id: "adv", tool: "picking-drill", steps: ["picking-drill:advanced"] },
    { id: "band", tool: "backing-band", steps: null },
  ];
  assert.deepEqual(wouldLose("picking-drill", ["picking-drill:beginner", "none"], videos), [{ id: "all", steps: ["picking-drill:beginner", "none"] }]);
  assert.deepEqual(wouldLose("picking-drill", ["picking-drill:intermediate"], videos), []);
  assert.deepEqual(wouldLose("picking-drill", ["picking-drill:advanced"], videos, "adv"), []);
  assert.deepEqual(wouldLose("backing-band", null, videos), [{ id: "band", steps: null }]);
});
