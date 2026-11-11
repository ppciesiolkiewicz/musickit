import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_BPM as BACKING_MAX_BPM } from "@/features/backing/model";
import { parseChoiceDiag, choiceSchema, parseTool, toolsOf, TOOLS, toolInterface, type Cell, type Choice, type ChoiceOption, type PlanTool } from "./tools";
import { applyChoice, applyUnder, choiceWarnings, follows, layoutParts, partsOf, resolvedChoice, valueOf } from "./choice";

const diag = () => ({ notes: [] as string[] });

describe("parseChoiceDiag", () => {
  it("options: 2 to 4 options holding the same parts, as step-choice read them", () => {
    const d = diag();
    const { choice } = parseChoiceDiag({ label: "stage", options: [{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }] }, d);
    assert.deepEqual(choice, { label: "stage", options: [{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }] });
    const two = parseChoiceDiag({ options: [{ key: "g", position: 1 }, { key: "c", position: 4 }] }, diag());
    assert.deepEqual(two.choice, { label: "variant", options: [{ key: 7, position: 1 }, { key: 0, position: 4 }] });
  });
  it("options: one option, or options of different parts, is dropped", () => {
    const d = diag();
    const { choice, dropped } = parseChoiceDiag({ options: [{ key: "g" }, { bpm: 80 }] }, d);
    assert.equal(choice, null);
    assert.match(dropped ?? "", /2 to 4 different options/);
    assert.ok(d.notes.some((n) => n.includes("every option needs the same parts (key, scale, bpm, position, level)")), d.notes.join("|"));
  });
  it("open: the parts themselves, any value; a scale is a slug the app knows", () => {
    assert.deepEqual(parseChoiceDiag({ key: "a", scale: "minor-pentatonic" }, diag()).choice, { open: { key: 9, scale: "minor-pentatonic" } });
    assert.deepEqual(parseChoiceDiag({ bpm: 72 }, diag()).choice, { open: { bpm: 72 } });
    const d = diag();
    const bad = parseChoiceDiag({ scale: "nope" }, d);
    assert.equal(bad.choice, null);
    assert.ok(d.notes.some((n) => n.includes('"nope"')), d.notes.join("|"));
  });
  it("open: a tempo out of range is clamped and noted; nothing readable is dropped", () => {
    const d = diag();
    assert.deepEqual(parseChoiceDiag({ bpm: 500 }, d).choice, { open: { bpm: 240 } });
    assert.ok(d.notes.some((n) => n.includes("bpm")), d.notes.join("|"));
    assert.match(parseChoiceDiag({}, diag()).dropped ?? "", /no part it could read/);
    assert.match(parseChoiceDiag("x", diag()).dropped ?? "", /isn.t an object/);
  });
  it("step-choice is no longer a tool, and the schema offers both shapes", () => {
    assert.equal(Object.hasOwn(TOOLS, "step-choice"), false);
    assert.ok(!toolInterface().some((l) => l.startsWith("- step-choice :")));
    const s = choiceSchema() as { oneOf: unknown[] };
    assert.equal(s.oneOf.length, 2);
  });
});

const tool = (raw: Record<string, unknown>): PlanTool => {
  const t = parseTool(raw);
  assert.ok(t, JSON.stringify(raw));
  return t;
};
const cell = (raw: Record<string, unknown>): Cell => ({ type: "tool", tool: tool(raw) });
const options = (options: ChoiceOption[], label?: "stage" | "variant"): Choice => ({ ...(label ? { label } : {}), options });
const open = (open: ChoiceOption): Choice => ({ open });
const tools = (c: Cell[]) => toolsOf(c) as (Record<string, unknown> & PlanTool)[];

const staff = (key = "d", extra: Record<string, unknown> = {}) => cell({ type: "staff", scale: "major-ionian", key, voice: "tenor", ...extra });
const band = (bpm = 60, key = "d") => cell({ type: "backing-band", bpm, key, parts: { click: "on", drone: "on" } });
const strum = (bpm = 60) => cell({ type: "strum-along", chords: ["G", "C"], bpm });
const neck = (extra: Record<string, unknown> = {}) => cell({ type: "scale-neck", scale: "minor-pentatonic", key: "g", boxes: [1], ...extra });
const posNeck = (extra: Record<string, unknown> = {}) => cell({ type: "position-neck", scale: "major-ionian", key: "g", positions: [1], ...extra });
const finder = () => cell({ type: "note-finder" });
const section = (heading: string, cells: Cell[], choice?: Choice): Cell => ({ type: "section", heading, ...(choice ? { choice } : {}), cells: cells as Exclude<Cell, { type: "section" }>[] });

describe("applyChoice", () => {
  it("key: moves every tool by the distance from option 1; option 1 leaves them as written", () => {
    const step = [staff("d"), band(60, "d")];
    const c = options([{ key: 2 }, { key: 9 }]);
    assert.deepEqual(tools(applyChoice(step, c, 1)).map((t) => t.key), [9, 9]);
    assert.deepEqual(applyChoice(step, c, 0), step);
  });
  it("key: a tool written in another key than option 1 still lands on the chip's key", () => {
    const c = options([{ key: 7 }, { key: 9 }]);
    assert.equal(tools(applyChoice([staff("a")], c, 0))[0].key, 7);
    assert.equal(tools(applyChoice([staff("a")], c, 1))[0].key, 9);
    // a tool with no key of its own (chord names) moves by the distance from option 1
    assert.deepEqual(tools(applyChoice([strum()], c, 1))[0].chords, ["A", "D"]);
  });
  it("bpm: sets the tempo on every tool that has one; a backing-track keeps to its own range", () => {
    const step = [band(60), strum(60), staff("d", { click: true, bpm: 60 }), staff("d")];
    const [b, s, clicked, plain] = tools(applyChoice(step, options([{ bpm: 60 }, { bpm: 80 }]), 1));
    assert.equal(b.bpm, 80);
    assert.equal(s.bpm, 80);
    assert.equal(clicked.bpm, 80);
    assert.deepEqual(plain, tools(step)[3]);
    assert.equal(tools(applyChoice([band(70)], options([{ bpm: 60 }, { bpm: 80 }]), 0))[0].bpm, 60);
    const track = cell({ type: "backing-track", progression: "blues", key: "a", bpm: 90 });
    assert.equal(tools(applyChoice([track], options([{ bpm: 90 }, { bpm: 240 }]), 1))[0].bpm, BACKING_MAX_BPM);
  });
  it("position: a scale-neck and a position-neck show that one position; a crossing stays; several parts move together", () => {
    const cross = posNeck({ positions: undefined, cross: { from: 1, to: 2 } });
    const out = tools(applyChoice([neck(), posNeck(), cross], options([{ position: 1 }, { position: 4 }]), 1));
    assert.deepEqual(out[0].boxes, [4]);
    assert.deepEqual(out[1].positions, [4]);
    assert.deepEqual(out[2], tools([cross])[0]);
    const [n] = tools(applyChoice([neck()], options([{ key: 7, position: 1 }, { key: 0, position: 4 }]), 1));
    assert.equal(n.key, 0);
    assert.deepEqual(n.boxes, [4]);
  });
  it("open: moves an unpinned tool's key and scale, and leaves a pinned part; an index is ignored", () => {
    const c = open({ key: 9, scale: "major-pentatonic" });
    const [moved] = tools(applyChoice([neck()], c, 3));
    assert.equal(moved.key, 9);
    assert.equal(moved.scale, "major-pentatonic");
    const [pinned] = tools(applyChoice([neck({ pinned: ["key"] })], c, 0));
    assert.equal(pinned.key, 7);
    assert.equal(pinned.scale, "major-pentatonic");
    assert.deepEqual(valueOf(c, 5), { key: 9, scale: "major-pentatonic" });
    assert.deepEqual(partsOf(c), ["key", "scale"]);
  });
  it("leaves text, sections and non-followers; an index outside the options is option 1", () => {
    const c = options([{ key: 2 }, { key: 9 }]);
    const cells: Cell[] = [{ type: "text", text: "t" }, section("S", [staff("d")]), finder(), staff("d")];
    const out = applyChoice(cells, c, 1);
    assert.deepEqual(out.slice(0, 3), cells.slice(0, 3));
    assert.equal(tools(out)[2].key, 9);
    assert.deepEqual(applyChoice([staff("d")], c, 7), [staff("d")]);
  });
  it("a choice of levels moves the tool, up and back down", () => {
    const step = [cell({ type: "interval-singer", level: "intermediate", key: "d" }), cell({ type: "picking-drill", level: "intermediate", bpm: 80 }), staff("d")];
    const c = options([{ level: 2 }, { level: 3 }]);
    const [singer, pick, plain] = tools(applyChoice(step, c, 1));
    assert.deepEqual(singer.intervals, [3, 6, 8, 10, 11]);
    assert.equal((singer.keys as number[]).length, 12);
    assert.equal(pick.skip, true);
    assert.deepEqual(plain, tools(step)[2]);
    assert.deepEqual(applyChoice(step, c, 0), step);
    assert.deepEqual(tools(applyChoice(applyChoice(step, c, 1), c, 0)), tools(step));
  });
});

describe("follows, partsOf, resolvedChoice", () => {
  it("says which tools can take a part, and a pinned part is not followed", () => {
    assert.equal(follows(tools([finder()])[0], "key"), false);
    assert.equal(follows(tool({ type: "chord-shapes", chords: ["G"] }), "bpm"), false);
    assert.equal(follows(tools([band()])[0], "bpm"), true);
    assert.equal(follows(tools([posNeck({ positions: undefined, cross: { from: 1, to: 2 } })])[0], "position"), false);
    assert.equal(follows(tools([neck()])[0], "position"), true);
    assert.equal(follows(tools([neck({ pinned: ["position"] })])[0], "position"), false);
    assert.equal(follows(tools([neck()])[0], "scale"), true);
  });
  it("the parts are option 1's, in chip order", () => {
    assert.deepEqual(partsOf(options([{ position: 1, bpm: 60, key: 0 }, { position: 2, bpm: 80, key: 0 }])), ["key", "bpm", "position"]);
    assert.deepEqual(partsOf(options([])), []);
  });
  it("a section's own choice wins; else the block's", () => {
    const block = { choice: open({ key: 0 }) };
    const own: Cell = section("S", [staff("d")], options([{ key: 2 }, { key: 9 }]));
    const plain: Cell = section("P", [staff("d")]);
    assert.deepEqual(resolvedChoice(block, own as Extract<Cell, { type: "section" }>), options([{ key: 2 }, { key: 9 }]));
    assert.deepEqual(resolvedChoice(block, plain as Extract<Cell, { type: "section" }>), open({ key: 0 }));
    assert.equal(resolvedChoice({}, plain as Extract<Cell, { type: "section" }>), undefined);
  });
});

describe("choiceWarnings", () => {
  const block = (cells: Cell[], choice?: Choice) => ({ ...(choice ? { choice } : {}), cells });
  it("is quiet about a block and sections that work", () => {
    assert.deepEqual(choiceWarnings(block([section("A", [staff("d")], options([{ key: 2 }, { key: 9 }])), section("B", [staff("c")])])), []);
    assert.deepEqual(choiceWarnings(block([section("A", [band(60)], options([{ bpm: 60 }, { bpm: 80 }], "stage"))])), []);
    assert.deepEqual(choiceWarnings(block([section("A", [neck()], options([{ key: 7, position: 1 }, { key: 0, position: 4 }], "variant"))])), []);
    assert.deepEqual(choiceWarnings(block([staff("a"), section("A", [staff("a")])], open({ key: 9 }))), []);
  });
  it("flags a choice with nothing to move, on the block or in a section", () => {
    assert.match(choiceWarnings(block([{ type: "text", text: "t" }], options([{ key: 9 }, { key: 2 }])))[0], /the block has a choice, but no tool for it to move/);
    assert.match(choiceWarnings(block([section("A", [{ type: "text", text: "t" }], open({ key: 9 }))]))[0], /"A" has an open choice, but no tool for it to move/);
  });
  it("flags a part no tool can follow", () => {
    assert.match(choiceWarnings(block([section("A", [staff("d"), finder()], options([{ key: 2 }, { key: 9 }]))])).join("\n"), /note-finder can't change key/);
    assert.match(choiceWarnings(block([section("A", [staff("d")], options([{ bpm: 60 }, { bpm: 80 }]))])).join("\n"), /no tool with a tempo/);
    assert.match(choiceWarnings(block([section("A", [staff("d")], options([{ position: 1 }, { position: 2 }]))])).join("\n"), /no neck that shows one position/);
    assert.match(choiceWarnings(block([section("A", [band(60)], open({ scale: "dorian" }))])).join("\n"), /no tool with a scale/);
  });
  it("flags an option 1 that isn't how the tools are written", () => {
    assert.match(choiceWarnings(block([section("A", [staff("d")], options([{ key: 9 }, { key: 2 }]))])).join("\n"), /option 1 should match the tools as written/);
    assert.match(choiceWarnings(block([section("A", [band(70)], options([{ bpm: 60 }, { bpm: 80 }]))])).join("\n"), /option 1 should match the tools as written/);
  });
  it("flags a tool written in another value than an open choice, unless pinned; the block's choice reaches sections without one", () => {
    const w = choiceWarnings(block([staff("g"), section("A", [band(60, "g")]), section("B", [band(60, "g")], options([{ key: 7 }, { key: 0 }]))], open({ key: 9 })));
    assert.deepEqual(w, ["the block: staff written in G under a choice in A; it will follow A.", "the block: backing-band written in G under a choice in A; it will follow A."]);
    assert.deepEqual(choiceWarnings(block([staff("g", { pinned: ["key"] })], open({ key: 9 }))), []);
    assert.match(choiceWarnings(block([band(70)], open({ bpm: 80 }))).join("\n"), /written in 70 bpm under a choice in 80 bpm; it will follow 80 bpm/);
  });
});

describe("per-part resolution (review fix)", () => {
  const block = (cells: Cell[], choice?: Choice) => ({ ...(choice ? { choice } : {}), cells });
  it("a section's own choice overrides only the parts it sets; the block's reach the rest", () => {
    const sec = section("S", [neck()], options([{ bpm: 60 }, { bpm: 80 }])) as Extract<Cell, { type: "section" }>;
    const out = applyUnder(sec.cells, open({ key: 9, scale: "major-pentatonic" }), 0, sec.choice, 1);
    const [t] = tools(out);
    assert.equal(t.key, 9);
    assert.equal(t.scale, "major-pentatonic");
    const w = choiceWarnings(block([sec], open({ key: 9 })));
    assert.ok(w.includes("the block: scale-neck written in G under a choice in A; it will follow A."), w.join("\n"));
    assert.ok(!w.some((x) => x.includes("no tool for it to move")), w.join("\n"));
  });
  it("layoutParts keeps the block's own cells where they were written, with cellsOf offsets", () => {
    const cells: Cell[] = [{ type: "text", text: "a" }, section("S", [{ type: "text", text: "b" }, neck()]), { type: "text", text: "c" }];
    const parts = layoutParts(cells);
    assert.deepEqual(parts.map((p) => [p.section?.heading ?? null, p.from, p.cells.length]), [[null, 0, 1], ["S", 1, 2], [null, 3, 1]]);
  });
});
