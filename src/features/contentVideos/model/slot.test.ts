import { test } from "node:test";
import assert from "node:assert/strict";
import { LADDERS } from "@/features/plan/model/ladders";
import { TOOLS, type Cell, type PlainCell, type PlanTool } from "@/features/plan/model/tools";
import { NO_LEVEL, TOOL_LADDERS, asksOf, isToolKey, stepOf, stepsOfTool, toolCells, toolKeyOf } from "./slot";

const make = (name: keyof typeof TOOLS, raw: Record<string, unknown>): PlanTool => {
  const tool = TOOLS[name].parse({ type: name, ...raw });
  assert.ok(tool, `${name} parses`);
  return tool;
};
const playAlong = (shape: Record<string, unknown>) => make("guitar-play-along", { shape });
const chordSteps = () => playAlong({ shape: "chord-steps", chords: [{ chord: "A", steps: [{ grip: ["1", "3", "5"], strings: "321" }] }] });
const pickingDrill = (level: string) => make("picking-drill", { level, bpm: 60 });
const ears = (query: string) => make("interval-ears", { query });
const backingBand = () => make("backing-band", { bpm: 60, key: "a", parts: { drone: "always" } });
const cell = (tool: PlanTool): PlainCell => ({ type: "tool", tool });

test("a play-along is one tool per shape", () => {
  assert.equal(toolKeyOf(chordSteps()), "guitar-play-along:chord-steps");
  assert.equal(toolKeyOf(pickingDrill("beginner")), "picking-drill");
  assert.equal(isToolKey("guitar-play-along"), false);
  assert.equal(isToolKey("guitar-play-along:riff"), true);
  assert.equal(isToolKey("guitar-play-along:nonsense"), false);
  assert.equal(isToolKey("picking-drill"), true);
  assert.equal(isToolKey("nonsense"), false);
  assert.equal(isToolKey("picking-drill:beginner"), false);
});

test("a step is the ladder's id and the step's key", () => {
  assert.equal(stepOf(pickingDrill("beginner")), "picking-drill:beginner");
  assert.equal(stepOf(ears("level=1")), "interval-ears:1");
  assert.equal(stepOf(ears("kind=change&level=1")), "chord-changes:1");
});

test("a laddered tool with no readable step is No level", () => {
  // a clap-along with its own pattern beside the level; breathwork that is not farinelli
  const clap = make("clap-along", { level: "beginner", pattern: "not-the-levels-own", bpm: 60 });
  const breath = make("breathwork", { drill: "box" });
  assert.equal(NO_LEVEL, "none");
  assert.equal(stepOf(clap), NO_LEVEL);
  assert.equal(stepOf(breath), NO_LEVEL);
});

test("a tool with no ladder has no step", () => {
  assert.equal(stepOf(backingBand()), null);
  assert.equal(stepOf(chordSteps()), null);
  assert.equal(stepsOfTool("scale-neck"), null);
  assert.equal(stepsOfTool("guitar-play-along:chord-steps"), null);
});

test("a tool's steps are its ladders' in order, then No level", () => {
  assert.deepEqual(stepsOfTool("picking-drill"), ["picking-drill:new", "picking-drill:beginner", "picking-drill:intermediate", "picking-drill:advanced", NO_LEVEL]);
  const steps = stepsOfTool("interval-ears")!;
  assert.equal(steps[0], "interval-ears:1");
  assert.ok(steps.includes("chord-changes:1"));
  assert.equal(steps.at(-1), NO_LEVEL);
});

test("every ladder that reads a tool belongs to exactly one tool", () => {
  const listed = Object.values(TOOL_LADDERS).flat();
  assert.deepEqual([...listed].sort(), LADDERS.filter((l) => l.read).map((l) => l.id).sort());
  for (const key of Object.keys(TOOL_LADDERS)) assert.ok(isToolKey(key), key);
});

test("tool cells count through sections", () => {
  const [a, b, c, d] = [pickingDrill("new"), backingBand(), chordSteps(), ears("level=2")];
  const cells: Cell[] = [
    { type: "text", text: "Start." }, cell(a),
    { type: "section", heading: "Then", cells: [{ type: "text", text: "Next." }, cell(b), cell(c)] },
    cell(d),
  ];
  assert.deepEqual(toolCells(cells), [a, b, c, d]);
  assert.deepEqual(asksOf(cells), [
    { cell: 0, tool: "picking-drill", step: "picking-drill:new" },
    { cell: 1, tool: "backing-band", step: null },
    { cell: 2, tool: "guitar-play-along:chord-steps", step: null },
    { cell: 3, tool: "interval-ears", step: "interval-ears:2" },
  ]);
});
