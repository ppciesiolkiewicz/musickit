import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, type Cell, type PlainCell, type PlanTool } from "@/features/plan/model/tools";
import { keptCells } from "./keptCells";

const make = (name: keyof typeof TOOLS, raw: Record<string, unknown>): PlanTool => {
  const tool = TOOLS[name].parse({ type: name, ...raw });
  assert.ok(tool, `${name} parses`);
  return tool;
};
const cell = (tool: PlanTool): PlainCell => ({ type: "tool", tool });
const text = (t: string): PlainCell => ({ type: "text", text: t }) as PlainCell;
const drill = (level: string) => cell(make("picking-drill", { level, bpm: 60 }));
const ears = () => cell(make("interval-ears", { query: "m3" }));
const chordSteps = () => cell(make("guitar-play-along", { shape: { shape: "chord-steps", chords: [{ chord: "A", steps: [{ grip: ["1", "3", "5"], strings: "321" }] }] } }));
const riff = () => cell(make("guitar-play-along", { bpm: 60, shape: { shape: "interval", key: "g", intervals: ["octave"], strings: "64", from: 0, to: 7 } }));

const map = { "0": "v0", "1": "v1" };

test("same tools in the same places: kept, also when a text cell is added or a level changes", () => {
  const before: Cell[] = [drill("beginner"), ears()];
  assert.deepEqual(keptCells(map, before, [text("new"), drill("advanced"), text("x"), ears()]), { kept: map, dropped: [] });
});

test("a key that is not a canonical index is dropped", () => {
  const r = keptCells({ "0": "v0", "01": "v1" }, [drill("beginner"), ears()], [drill("beginner"), ears()]);
  assert.deepEqual(r.kept, { "0": "v0" });
  assert.deepEqual(r.dropped.map((d) => d.videoId), ["v1"]);
});

test("another tool at the index: that entry is dropped, the others kept", () => {
  const r = keptCells(map, [drill("beginner"), ears()], [drill("beginner"), chordSteps()]);
  assert.deepEqual(r, { kept: { "0": "v0" }, dropped: [{ cell: 1, videoId: "v1" }] });
});

test("a play-along given another shape is another tool", () => {
  const r = keptCells({ "0": "v0" }, [chordSteps()], [riff()]);
  assert.deepEqual(r, { kept: {}, dropped: [{ cell: 0, videoId: "v0" }] });
});

test("a tool cell added or removed: every entry is dropped", () => {
  const dropAll = [{ cell: 0, videoId: "v0" }, { cell: 1, videoId: "v1" }];
  assert.deepEqual(keptCells(map, [drill("beginner"), ears()], [drill("beginner")]), { kept: {}, dropped: dropAll });
  assert.deepEqual(keptCells(map, [drill("beginner"), ears()], [drill("beginner"), ears(), ears()]), { kept: {}, dropped: dropAll });
});

test("an entry with no tool cell at its index is dropped", () => {
  assert.deepEqual(keptCells({ "5": "v5" }, [drill("beginner")], [drill("beginner")]).dropped, [{ cell: 5, videoId: "v5" }]);
});
