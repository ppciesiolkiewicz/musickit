import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arpeggioPart, chordSteps, expandShape, melody, numeralChord, progression, soloOver, twoScales } from "./index";
import type { Timeline, TimelineEvent } from "../timeline/types";

const of = <T extends TimelineEvent["type"]>(t: Timeline, type: T) => t.events.filter((e) => e.type === type) as Extract<TimelineEvent, { type: T }>[];

describe("numeralChord", () => {
  it("maps major-key numerals", () => {
    assert.equal(numeralChord("IV", 7), "C");
    assert.equal(numeralChord("vi", 7), "Em");
    assert.equal(numeralChord("V7", 0), "G7");
    assert.equal(numeralChord("bVII", 0), "Bb");
    assert.equal(numeralChord("vii°", 0), "Bdim");
    assert.equal(numeralChord("X", 0), null);
  });
});

describe("chordSteps", () => {
  it("G barre root-6-root, D barre 4-5-4", () => {
    const t = chordSteps({ shape: "chord-steps", bpm: 70, voicing: "barre", chords: [{ chord: "G", steps: ["strum", "1", "6", "1"] }, { chord: "D", steps: ["strum", "4", "5", "4"] }] })!;
    const chords = of(t, "chord");
    assert.deepEqual(chords.map((c) => [c.name, c.at, c.voicing]), [["G", 0, "barre"], ["D", 4, "barre"]]);
    const steps = of(t, "step");
    assert.deepEqual(steps.slice(0, 4).map((s) => s.at), [0, 1, 2, 3]);
    assert.deepEqual(steps.map((s) => (s.step.kind === "strum" ? "strum" : s.step.semis)), ["strum", 0, 9, 0, "strum", 5, 7, 5]);
    assert.equal(t.bars, 2);
  });
});

describe("progression", () => {
  it("I IV V in G cycles over 4 bars", () => {
    const t = progression({ shape: "progression", bpm: 70, key: "g", numerals: ["I", "IV", "V"], steps: ["1", "3", "5"], bars: 4, beatsPerChord: 4 })!;
    assert.deepEqual(of(t, "chord").map((c) => [c.name, c.at]), [["G", 0], ["C", 4], ["D", 8], ["G", 12]]);
    assert.equal(of(t, "step").length, 16);
  });
  it("drops invalid chords, null when none", () => {
    const t = progression({ shape: "progression", bpm: 70, key: "c", chords: ["C", "Hx"], bars: 2 })!;
    assert.deepEqual(of(t, "chord").map((c) => c.name), ["C", "C"]);
    assert.equal(progression({ shape: "progression", bpm: 70, key: "c", chords: ["Hx"], bars: 2 }), null);
  });
  it("backing becomes choices, first set on chords", () => {
    const t = progression({ shape: "progression", bpm: 70, key: "c", chords: ["C"], bars: 1, backing: ["strum", "block"] })!;
    assert.deepEqual(t.backingChoices, ["strum", "block"]);
    assert.equal(of(t, "chord")[0].backing, "strum");
  });
});

describe("twoScales", () => {
  const a = { key: "a", scale: "minor-pentatonic" }, b = { key: "a", scale: "dorian" };
  it("switches halfway by default", () => {
    assert.deepEqual(of(twoScales({ shape: "two-scales", bpm: 80, a, b, bars: 8 })!, "scale").map((s) => s.at), [0, 16]);
  });
  it("clamps switchBar", () => {
    assert.deepEqual(of(twoScales({ shape: "two-scales", bpm: 80, a, b, bars: 8, switchBar: 99 })!, "scale").map((s) => s.at), [0, 28]);
  });
});

describe("expandShape", () => {
  it("unknown shape is null", () => {
    assert.equal(expandShape({ shape: "nonsense" }), null);
    assert.equal(expandShape(null), null);
  });
  it("dispatches", () => {
    assert.ok(expandShape({ shape: "melody", bpm: 80, tune: 1, key: "c" }));
  });
});

describe("arpeggioPart", () => {
  const place = [{ box: 1, part: "lower" }, { box: 1, part: "upper" }, { box: 2, part: "lower" }, { box: 2, part: "upper" }] as const;
  const base = { shape: "arpeggio-part" as const, bpm: 70, chords: ["C", "Am", "F", "G"], degrees: ["1", "3", "5"], bars: 4, place: [...place] };
  it("copies places, default cue on box change", () => {
    const steps = of(arpeggioPart(base)!, "step");
    assert.deepEqual(steps.filter((s) => s.at === 8)[0].place, { box: 2, part: "lower" });
    assert.deepEqual(steps.filter((s) => s.cue).map((s) => [s.at, s.cue]), [[8, "Box 2, lower part"]]);
  });
  it("guide replaces the first cues", () => {
    const steps = of(arpeggioPart({ ...base, guide: ["one", "two"] })!, "step");
    assert.deepEqual(steps.filter((s) => s.cue).map((s) => [s.at, s.cue]), [[0, "one"], [1, "two"], [8, "Box 2, lower part"]]);
  });
});

describe("soloOver", () => {
  it("scale + chord events with highlights, no steps", () => {
    const t = soloOver({ shape: "solo-over", bpm: 90, key: "g", chords: [{ chord: "Am7", scale: "dorian", target: ["1", "b3", "9th"], approach: "land on b3" }, { chord: "D7", scale: "mixolydian", target: ["3"] }] })!;
    assert.deepEqual(of(t, "scale").map((s) => [s.at, s.key, s.scale]), [[0, 9, "dorian"], [4, 2, "mixolydian"]]);
    assert.deepEqual(of(t, "chord").map((c) => c.highlight), [[0, 3], [4]]);
    assert.equal(of(t, "step").length, 0);
    assert.deepEqual(t.hints, [{ at: 0, text: "land on b3" }]);
  });
});

describe("melody", () => {
  it("book tune as key-relative steps", () => {
    const t = melody({ shape: "melody", bpm: 80, tune: 1, key: "c" })!;
    const steps = of(t, "step");
    assert.ok(steps.length > 0);
    assert.deepEqual(steps[steps.length - 1].step, { kind: "note", semis: 0, from: "key" });
    assert.equal(melody({ shape: "melody", bpm: 80, tune: 99999, key: "c" }), null);
  });
});
