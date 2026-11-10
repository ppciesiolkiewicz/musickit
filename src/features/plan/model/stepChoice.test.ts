import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_BPM as BACKING_MAX_BPM } from "@/features/backing/model";
import { parseTool, type PlanTool, type Section, type StepOption } from "./tools";
import { stepsOf } from "./transpose";
import { applyOption, canFollow, choiceWarnings, partsOf, stepChoice } from "./stepChoice";

const tool = (raw: Record<string, unknown>): PlanTool => {
  const t = parseTool(raw);
  assert.ok(t, JSON.stringify(raw));
  return t;
};
const sec = (raw: Record<string, unknown>): Section => ({ type: "tool", tool: tool(raw) });
const choice = (options: StepOption[], label?: "stage" | "variant"): Section => ({ type: "tool", tool: { type: "step-choice", ...(label ? { label } : {}), options } });
const toolsOf = (s: Section[]) => s.flatMap((x) => (x.type === "tool" ? [x.tool as Record<string, unknown> & PlanTool] : []));

const staff = (key = "d", extra: Record<string, unknown> = {}) => sec({ type: "staff", scale: "major-ionian", key, voice: "tenor", ...extra });
const band = (bpm = 60, key = "d") => sec({ type: "backing-band", bpm, key, parts: { click: "on", drone: "on" } });
const strum = (bpm = 60) => sec({ type: "strum-along", chords: ["G", "C"], bpm });
const neck = (extra: Record<string, unknown> = {}) => sec({ type: "scale-neck", scale: "minor-pentatonic", key: "g", boxes: [1], ...extra });
const posNeck = (extra: Record<string, unknown> = {}) => sec({ type: "position-neck", scale: "major-ionian", key: "g", positions: [1], ...extra });
const finder = () => sec({ type: "note-finder" });

describe("applyOption", () => {
  it("key: moves every tool by the distance from option 1; option 1 leaves them as written", () => {
    const step = [staff("d"), band(60, "d")];
    const options = [{ key: 2 }, { key: 9 }];
    assert.deepEqual(toolsOf(applyOption(step, options, 1)).map((t) => t.key), [9, 9]);
    assert.deepEqual(applyOption(step, options, 0), step);
  });
  it("key: a tool written in another key than option 1 still lands on the chip's key", () => {
    const options = [{ key: 7 }, { key: 9 }];
    assert.equal(toolsOf(applyOption([staff("a")], options, 0))[0].key, 7);
    assert.equal(toolsOf(applyOption([staff("a")], options, 1))[0].key, 9);
    // a tool with no key of its own (chord names) moves by the distance from option 1
    assert.deepEqual(toolsOf(applyOption([strum()], options, 1))[0].chords, ["A", "D"]);
  });
  it("bpm: sets the tempo on every tool that has one", () => {
    const step = [band(60), strum(60), staff("d", { click: true, bpm: 60 }), staff("d")];
    const [b, s, clicked, plain] = toolsOf(applyOption(step, [{ bpm: 60 }, { bpm: 80 }], 1));
    assert.equal(b.bpm, 80);
    assert.equal(s.bpm, 80);
    assert.equal(clicked.bpm, 80);
    assert.deepEqual(plain, toolsOf(step)[3]);
  });
  it("bpm: option 1 is what the screen shows, also over tools written at another tempo", () => {
    assert.equal(toolsOf(applyOption([band(70)], [{ bpm: 60 }, { bpm: 80 }], 0))[0].bpm, 60);
  });
  it("bpm: a backing-track keeps to its own range", () => {
    const track = sec({ type: "backing-track", progression: "blues", key: "a", bpm: 90 });
    assert.equal(toolsOf(applyOption([track], [{ bpm: 90 }, { bpm: 240 }], 1))[0].bpm, BACKING_MAX_BPM);
  });
  it("position: a scale-neck and a position-neck show that one position; a crossing stays", () => {
    const cross = posNeck({ positions: undefined, cross: { from: 1, to: 2 } });
    const out = toolsOf(applyOption([neck(), posNeck(), cross], [{ position: 1 }, { position: 4 }], 1));
    assert.deepEqual(out[0].boxes, [4]);
    assert.deepEqual(out[1].positions, [4]);
    assert.deepEqual(out[2], toolsOf([cross])[0]);
  });
  it("several parts move together", () => {
    const [n] = toolsOf(applyOption([neck()], [{ key: 7, position: 1 }, { key: 0, position: 4 }], 1));
    assert.equal(n.key, 0);
    assert.deepEqual(n.boxes, [4]);
  });
  it("leaves text, headings and the chooser itself", () => {
    const options = [{ key: 2 }, { key: 9 }];
    const step: Section[] = [{ type: "heading", text: "A" }, { type: "text", text: "t" }, choice(options), staff("d")];
    const out = applyOption(step, options, 1);
    assert.deepEqual(out.slice(0, 3), step.slice(0, 3));
  });
  it("an index outside the options is option 1", () => {
    const step = [staff("d")];
    assert.deepEqual(applyOption(step, [{ key: 2 }, { key: 9 }], 7), step);
  });
});

describe("canFollow, partsOf, stepChoice", () => {
  it("says which tools can take a part", () => {
    assert.equal(canFollow(toolsOf([finder()])[0], "key"), false);
    assert.equal(canFollow(tool({ type: "chord-shapes", chords: ["G"] }), "bpm"), false);
    assert.equal(canFollow(toolsOf([band()])[0], "bpm"), true);
    assert.equal(canFollow(toolsOf([posNeck({ positions: undefined, cross: { from: 1, to: 2 } })])[0], "position"), false);
    assert.equal(canFollow(toolsOf([neck()])[0], "position"), true);
  });
  it("the parts are option 1's, in chip order", () => {
    assert.deepEqual(partsOf([{ position: 1, bpm: 60, key: 0 }, { position: 2, bpm: 80, key: 0 }]), ["key", "bpm", "position"]);
    assert.deepEqual(partsOf([]), []);
  });
  it("a step's chooser is its first; none is null", () => {
    const all: Section[] = [{ type: "text", text: "intro" }, { type: "heading", text: "A" }, choice([{ key: 2 }, { key: 9 }]), staff("d"), choice([{ key: 2 }, { key: 0 }])];
    assert.deepEqual(stepsOf(all).map((s) => stepChoice(all, s)?.options ?? null), [null, [{ key: 2 }, { key: 9 }]]);
  });
});

describe("choiceWarnings", () => {
  const head: Section = { type: "heading", text: "A" };
  it("is quiet about a step that works", () => {
    assert.deepEqual(choiceWarnings([head, choice([{ key: 2 }, { key: 9 }]), staff("d"), { type: "heading", text: "B" }, staff("c")]), []);
    assert.deepEqual(choiceWarnings([head, choice([{ bpm: 60 }, { bpm: 80 }], "stage"), band(60)]), []);
    assert.deepEqual(choiceWarnings([head, choice([{ key: 7, position: 1 }, { key: 0, position: 4 }], "variant"), neck()]), []);
  });
  it("flags a second chooser and a chooser with nothing to move", () => {
    assert.match(choiceWarnings([head, choice([{ key: 2 }, { key: 9 }]), staff("d"), choice([{ key: 2 }, { key: 0 }])])[0], /"A" has more than one step-choice/);
    assert.match(choiceWarnings([choice([{ key: 9 }, { key: 2 }]), { type: "text", text: "t" }])[0], /the intro has a step-choice, but no tool for it to move/);
  });
  it("flags a part no tool can follow", () => {
    assert.match(choiceWarnings([head, choice([{ key: 2 }, { key: 9 }]), staff("d"), finder()]).join("\n"), /note-finder can't change key/);
    assert.match(choiceWarnings([head, choice([{ bpm: 60 }, { bpm: 80 }]), staff("d")]).join("\n"), /no tool with a tempo/);
    assert.match(choiceWarnings([head, choice([{ position: 1 }, { position: 2 }]), staff("d")]).join("\n"), /no neck that shows one position/);
  });
  it("flags an option 1 that isn't how the tools are written", () => {
    assert.match(choiceWarnings([head, choice([{ key: 9 }, { key: 2 }]), staff("d")]).join("\n"), /option 1 should match the tools as written/);
    assert.match(choiceWarnings([head, choice([{ bpm: 60 }, { bpm: 80 }]), band(70)]).join("\n"), /option 1 should match the tools as written/);
  });
});
