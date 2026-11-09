import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSection, parseTool, type PlanTool, type Section } from "./tools";
import { canTranspose, keyWarnings, transposeChord, transposeStep, transposeTool } from "./transpose";

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

describe("a heading's keys", () => {
  it("parses 2-3 different keys, in order", () => {
    assert.deepEqual(parseSection({ type: "heading", text: "Do Mi Sol", minutes: 3, keys: ["d", "a", "c", "e"] }), { type: "heading", text: "Do Mi Sol", minutes: 3, keys: [2, 9, 0] });
    assert.deepEqual(parseSection({ type: "heading", text: "x", keys: ["d", "d", "nope"] }), { type: "heading", text: "x" });
  });
  it("reads back from a stored plan (pitch classes)", () => {
    assert.deepEqual(parseSection({ type: "heading", text: "x", keys: [2, 9] }), { type: "heading", text: "x", keys: [2, 9] });
  });
  it("moves a step's tools from its first key, text untouched", () => {
    const step: Section[] = [
      { type: "text", text: "Sing {{1}} {{3}} {{5}}." },
      { type: "tool", tool: tool({ type: "staff", scale: "major-ionian", key: "d", voice: "tenor", notes: ["1", "3", "5"] }) },
      { type: "tool", tool: tool({ type: "backing-track", key: "d", numerals: ["I", "V"], bpm: 70 }) },
    ];
    const moved = transposeStep(step, [2, 9, 0], 0);
    assert.equal(moved[0], step[0]);
    assert.ok(moved[1].type === "tool" && moved[1].tool.type === "staff" && moved[1].tool.key === 0);
    assert.ok(moved[2].type === "tool" && moved[2].tool.type === "backing-track" && moved[2].tool.key === 0);
  });
});

describe("keyWarnings", () => {
  const staff = (key: string): Section => ({ type: "tool", tool: tool({ type: "staff", scale: "major-ionian", key, voice: "tenor" }) });
  it("is quiet when the first key is the tools' key", () => {
    assert.deepEqual(keyWarnings([{ type: "heading", text: "A", keys: [2, 9] }, staff("d"), { type: "heading", text: "B" }, staff("f")]), []);
  });
  it("flags a first key that isn't the tools' key, and a tool that can't move", () => {
    const w = keyWarnings([{ type: "heading", text: "A", keys: [9, 2] }, staff("d"), { type: "tool", tool: tool({ type: "interval-ears", level: 1 }) }]);
    assert.equal(w.length, 2);
    assert.match(w[0], /interval-ears/);
    assert.match(w[1], /first key/);
  });
});
