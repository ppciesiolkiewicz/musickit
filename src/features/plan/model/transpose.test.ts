import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liftHeadingKeys, parseSection, parseTool, parseToolDiag, type PlanTool, type Section } from "./tools";
import { canTranspose, stepsOf, transposeChord, transposeTool } from "./transpose";

const tool = (raw: Record<string, unknown>): PlanTool => {
  const t = parseTool(raw);
  assert.ok(t, JSON.stringify(raw));
  return t;
};

describe("transposeChord", () => {
  it("moves the root and keeps the suffix", () => {
    assert.equal(transposeChord("Dm7", 3), "Fm7");
    assert.equal(transposeChord("G7", 5), "C7");
    assert.equal(transposeChord("Cmaj7", 5), "Fmaj7");
    assert.equal(transposeChord("D", 7), "A");
  });
  it("spells roots as the app's keys do (B♭, F♯), written ascii", () => {
    assert.equal(transposeChord("C", 10), "Bb");
    assert.equal(transposeChord("D", 4), "F#");
    assert.equal(transposeChord("Bbmaj7", 2), "Cmaj7");
  });
  it("moves a slash bass with the chord", () => {
    assert.equal(transposeChord("G/B", 2), "A/C#");
  });
  it("leaves what isn't a chord", () => {
    assert.equal(transposeChord("nope", 2), "nope");
  });
});

describe("transposeTool", () => {
  it("moves a staff's key; degrees stay", () => {
    const t = transposeTool(tool({ type: "staff", scale: "major-ionian", key: "d", voice: "tenor", notes: ["1", "3", "5"], drone: true }), 7);
    assert.ok(t.type === "staff");
    assert.equal(t.key, 9);
    assert.deepEqual(t.notes, [0, 4, 7]);
  });
  it("moves a scale-neck's key and its added notes", () => {
    const t = transposeTool(tool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", add: ["c-sharp"] }), 3);
    assert.ok(t.type === "scale-neck");
    assert.equal(t.key, 0);
    assert.deepEqual(t.add, [4]);
  });
  it("moves a backing-track's key; its numerals go with it", () => {
    const t = transposeTool(tool({ type: "backing-track", key: "c", chords: ["Dm7", "G7", "Cmaj7"], bpm: 72 }), 5);
    assert.ok(t.type === "backing-track");
    assert.deepEqual(t.numerals, ["ii7", "V7", "Imaj7"]);
    assert.equal(t.key, 5);
  });
  it("moves a melody-singer, an arpeggio-neck and strum-along chords", () => {
    const m = transposeTool(tool({ type: "melody-singer", tune: 1, key: "d" }), 3);
    assert.ok(m.type === "melody-singer" && m.key === 5);
    const a = transposeTool(tool({ type: "arpeggio-neck", chord: "Am7" }), 2);
    assert.ok(a.type === "arpeggio-neck" && a.chord === "Bm7");
    const s = transposeTool(tool({ type: "strum-along", chords: ["G", "C", "D"], bpm: 80 }), 2);
    assert.ok(s.type === "strum-along");
    assert.deepEqual(s.chords, ["A", "D", "E"]);
  });
  it("moves a play-along shape's key and chords at any depth", () => {
    const p = transposeTool(tool({ type: "guitar-play-along", bpm: 70, shape: { shape: "solo-over", key: "a", scale: "minor-pentatonic", chords: [{ chord: "Am7", target: ["1"] }, { chord: "D7", target: ["3"] }] } }), 2);
    assert.ok(p.type === "guitar-play-along");
    const sh = p.shape as unknown as { key: string; chords: { chord: string }[] };
    assert.equal(sh.key, "b");
    assert.deepEqual(sh.chords.map((c) => c.chord), ["Bm7", "E7"]);
  });
  it("by 0 or 12 is the same tool; keyless tools can't move", () => {
    const t = tool({ type: "staff", scale: "major-ionian", key: "d", voice: "tenor" });
    assert.equal(transposeTool(t, 0), t);
    assert.equal(transposeTool(t, 12), t);
    assert.equal(canTranspose(tool({ type: "interval-ears", level: 1 })), false);
    assert.equal(canTranspose(t), true);
  });
});

describe("the key chips before step-choice", () => {
  const kc = (keys: unknown[]) => ({ type: "tool", tool: { type: "key-choice", keys } });
  const sc = (keys: unknown[]) => ({ type: "tool", tool: { type: "step-choice", options: keys.map((key) => ({ key })) } });
  it("a pasted key-choice is read as a step-choice, an option per key, without a note", () => {
    assert.deepEqual(parseSection(kc(["d", "a", "c"])), sc([2, 9, 0]));
    assert.deepEqual(parseToolDiag({ type: "key-choice", keys: ["d", "a"] }), { tool: sc([2, 9]).tool, notes: [] });
    assert.equal(parseSection(kc(["d", "d", "nope"])), null);
  });
  it("a stored key-choice (pitch classes) too", () => {
    assert.deepEqual(parseToolDiag({ type: "key-choice", keys: [2, 9] }, { stored: true }), { tool: sc([2, 9]).tool, notes: [] });
  });
  it("a heading's keys (the older form) become a step-choice before the step's first tool", () => {
    const text = { type: "text", text: "t" }, staff = { type: "tool", tool: { type: "staff" } };
    assert.deepEqual(liftHeadingKeys([{ type: "heading", text: "A", minutes: 3, keys: ["d", "a"] }, text, staff, text, { type: "heading", text: "B" }, staff]),
      [{ type: "heading", text: "A", minutes: 3 }, text, sc(["d", "a"]), staff, text, { type: "heading", text: "B" }, staff]);
    // no tool in the step: at its end; a step that has a chooser already (in either name) keeps only that one
    assert.deepEqual(liftHeadingKeys([{ type: "heading", text: "A", keys: [2, 9] }, text, { type: "heading", text: "B", keys: [0, 5] }, kc([0, 7]), staff, { type: "heading", text: "C", keys: [0, 5] }, sc([0, 7])]),
      [{ type: "heading", text: "A" }, text, sc([2, 9]), { type: "heading", text: "B" }, kc([0, 7]), staff, { type: "heading", text: "C" }, sc([0, 7])]);
    const plain = [{ type: "heading", text: "A" }, staff];
    assert.equal(liftHeadingKeys(plain), plain);
  });
  it("the steps of an exercise", () => {
    const h: Section = { type: "heading", text: "H" }, t: Section = { type: "text", text: "t" };
    assert.deepEqual(stepsOf([t, h, t, t, h]), [{ head: -1, from: 0, to: 1 }, { head: 1, from: 2, to: 4 }, { head: 4, from: 5, to: 5 }]);
  });
});
