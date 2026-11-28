import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyChoiceSet, choiceSetProblems, isEmptyChoiceSet, paramsUsed, readChoiceSet } from "./choiceSet";

const block = {
  title: "Breathe {{=count}}",
  cells: [
    { type: "text", text: "Count to {{=count}}. In {{=key}}." },
    { type: "tool", tool: { type: "breathwork", level: "beginner", seconds: 4 } },
    {
      type: "section",
      heading: "Longer: {{=count}}",
      cells: [
        { type: "list", items: ["Hold {{=count}}", "Out"] },
        { type: "tool", tool: { type: "breathwork", level: "beginner", rounds: 3 } },
        { type: "tool", tool: { type: "staff", notes: "C4" } },
      ],
    },
  ],
};

describe("a choice's set", () => {
  it("lays tool props over every tool of a type, and over the n-th tool by #n, after the type's", () => {
    const out = applyChoiceSet(block, { tools: { breathwork: { level: "advanced" }, "#1": { rounds: 5, level: "intermediate" } } });
    const tools = [out.cells[1], ...(out.cells[2] as { cells: unknown[] }).cells.slice(1)].map((c) => (c as { tool: Record<string, unknown> }).tool);
    assert.deepEqual(tools[0], { type: "breathwork", level: "advanced", seconds: 4 });
    assert.deepEqual(tools[1], { type: "breathwork", level: "intermediate", rounds: 5 });
    assert.deepEqual(tools[2], { type: "staff", notes: "C4" });
  });

  it("takes a prop set to null out, and never changes a tool's type", () => {
    const out = applyChoiceSet(block, { tools: { breathwork: { seconds: null, type: "staff" } } });
    assert.deepEqual((out.cells[1] as { tool: unknown }).tool, { type: "breathwork", level: "beginner" });
  });

  it("fills params in the title, text, headings and lists, and leaves key and bpm to the moves", () => {
    const out = applyChoiceSet(block, { params: { count: "eight" } });
    assert.equal(out.title, "Breathe eight");
    assert.equal((out.cells[0] as { text: string }).text, "Count to eight. In {{=key}}.");
    const s = out.cells[2] as { heading: string; cells: { items?: string[] }[] };
    assert.equal(s.heading, "Longer: eight");
    assert.deepEqual(s.cells[0].items, ["Hold eight", "Out"]);
  });

  it("an empty set gives the block back as it is, and the input is never changed", () => {
    assert.equal(applyChoiceSet(block, {}), block);
    const before = JSON.stringify(block);
    applyChoiceSet(block, { tools: { breathwork: { level: "x" } }, params: { count: "two" } });
    assert.equal(JSON.stringify(block), before);
  });

  it("reads a stored set, keeping only tool objects and one-word params that are not key or bpm", () => {
    assert.deepEqual(readChoiceSet({ tools: { a: { b: 1 }, c: 2 }, params: { tip: "x", key: "C", Bad: "y", n: 3 } }), { tools: { a: { b: 1 } }, params: { tip: "x" } });
    assert.deepEqual(readChoiceSet("junk"), {});
    assert.equal(isEmptyChoiceSet(readChoiceSet({})), true);
  });

  it("names the params a block's words use", () => {
    assert.deepEqual([...paramsUsed(block)], ["count"]);
  });
});

describe("choiceSetProblems", () => {
  it("passes a set that names real tools and fills every param", () => {
    assert.deepEqual(choiceSetProblems(block, { set: { breathwork: { level: "new" }, "#2": { notes: "D4" } }, params: { count: "four" } }, "b/new"), []);
  });

  it("names a tool the block lacks, a #n past its tools, a type, a missing, unused or bad param", () => {
    const out = choiceSetProblems(block, { set: { metronome: { bpm: 60 }, "#3": {}, breathwork: { type: "staff" } }, params: { tip: "x", key: "C" } }, "b/x");
    assert.ok(out.some((p) => p.includes('"metronome"')));
    assert.ok(out.some((p) => p.includes('"#3"') && p.includes("3 tools")));
    assert.ok(out.some((p) => p.includes('sets "type"')));
    assert.ok(out.some((p) => p.includes('"tip" is set but')));
    assert.ok(out.some((p) => p.includes('"key" is not one lowercase word')));
    assert.ok(out.some((p) => p.includes("{{=count}}") && p.includes("gives no")));
  });
});
