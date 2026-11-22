import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arpeggioPart, chordSteps, expandShape, interval, melody, numeralChord, progression, soloOver, twoScales } from "./index";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { makeKeyContext } from "@/features/theory/theory";
import { intervalWalk } from "@/lib/chordKit/scaleChords";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { BOOK, octaveLeap } from "@/features/theory/singingMelodies";
import { cuesOf } from "../cues/cues";
import { melodyTonic } from "../timeline/degrees";
import { INTERVAL_NAMES, intervalLine, intervalStep } from "./interval";

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
  it("comps the backing chord for the whole timeline, and is free", () => {
    const t = twoScales({ shape: "two-scales", bpm: 80, a, b, bars: 8, backingChord: "Am" })!;
    assert.deepEqual(of(t, "chord").map((c) => [c.at, c.beats, c.backing]), [[0, 32, "bass-chord"]]);
    assert.equal(t.free, "switch");
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
    assert.equal(t.free, "over-chords");
    assert.deepEqual(of(t, "chord").map((c) => c.backing), ["bass-chord", "bass-chord"]);
  });
  it("the exercise's scale from the key, first", () => {
    const t = soloOver({ shape: "solo-over", bpm: 80, key: "c", scale: "minor-pentatonic", backing: "block", chords: [{ chord: "Cm7", target: ["1"] }, { chord: "Fm7", target: ["1"] }] })!;
    assert.deepEqual(of(t, "scale").map((s) => [s.at, s.key, s.scale]), [[0, 0, "minor-pentatonic"]]);
    assert.deepEqual(of(t, "chord").map((c) => c.backing), ["block", "block"]);
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

describe("melody an octave higher", () => {
  it("every note 12 semitones up, on the neck", () => {
    const low = of(melody({ shape: "melody", bpm: 80, tune: 100, key: "g" })!, "step");
    const high = of(melody({ shape: "melody", bpm: 80, tune: 100, key: "g", octave: 1 })!, "step");
    assert.deepEqual(high.map((s) => (s.step.kind === "note" ? s.step.semis : null)), low.map((s) => (s.step.kind === "note" ? s.step.semis + 12 : null)));
    const cues = cuesOf(melody({ shape: "melody", bpm: 80, tune: 100, key: "g", octave: 1 })!);
    assert.ok(cues.length === high.length && cues.every((c) => c.frets.length === 1 && c.frets[0].fret <= 17));
  });
  it("refused where a note would leave the neck, or for another octave", () => {
    assert.equal(melody({ shape: "melody", bpm: 80, tune: 100, key: "c", octave: 1 }), null);
    assert.equal(melody({ shape: "melody", bpm: 80, tune: 100, key: "g", octave: 2 }), null);
    for (const key of ["f-sharp", "g", "a-flat", "a"]) assert.ok(melody({ shape: "melody", bpm: 80, tune: 100, key, octave: 1 }), key);
  });
  it("the tunes that leap an octave are the octave stage's", () => {
    assert.deepEqual(BOOK.filter((b) => octaveLeap(b.notes)).map((b) => b.stage.id).filter((s, i, all) => all.indexOf(s) === i), ["octave"]);
    assert.ok(octaveLeap(BOOK.find((b) => b.n === 100)!.notes));
    assert.ok(!octaveLeap(BOOK[0].notes));
  });
});

describe("interval", () => {
  const G = makeKeyContext(7, 0, 0);
  const shape = (props: Record<string, unknown>) => ({ shape: "interval", bpm: 80, key: "g", ...props });
  /** each cue of the timeline as [string index, fret] */
  const cells = (props: Record<string, unknown>) => cuesOf(expandShape(shape(props))!).map((c) => [c.frets[0].string, c.frets[0].fret]);

  it("through the scale, up: each pair low note first, climbing; every fret is chordKit's", () => {
    const pairs = intervalWalk(G, 8, [0, 2], 0, 7);
    assert.deepEqual(cells({ intervals: ["octave"], strings: "64", direction: "up", to: 7 }), pairs.flatMap((d) => [[0, d.frets[0]], [2, d.frets[1]]]));
    // G on the low E string, then its octave on the D string
    assert.deepEqual(cells({ intervals: ["octave"], strings: "64", direction: "up", from: 3, to: 3 }), [[0, 3], [2, 5]]);
  });
  it("down: each pair high note first, coming back down; both: there and back", () => {
    const pairs = intervalWalk(G, 5, [1, 2], 0, 5);
    const up = pairs.flatMap((d) => [[1, d.frets[0]], [2, d.frets[1]]]);
    const down = [...pairs].reverse().flatMap((d) => [[2, d.frets[1]], [1, d.frets[0]]]);
    assert.deepEqual(cells({ intervals: ["5th"], strings: "54", direction: "down", to: 5 }), down);
    assert.deepEqual(cells({ intervals: ["5th"], strings: "54", to: 5 }), [...up, ...down]);
  });
  it("along one string and across strings 3 and 2 the frets follow the same code", () => {
    assert.deepEqual(cells({ intervals: ["3rd"], strings: "33", direction: "up", to: 4 }), intervalWalk(G, 3, [3, 3], 0, 4).flatMap((d) => [[3, d.frets[0]], [3, d.frets[1]]]));
    assert.deepEqual(cells({ intervals: ["4th"], strings: "32", direction: "up", to: 5 }), intervalWalk(G, 4, [3, 4], 0, 5).flatMap((d) => [[3, d.frets[0]], [4, d.frets[1]]]));
  });
  it("a note sounds where it is drawn, one note a beat, each interval from a new bar, with a cue where the way turns", () => {
    const t = interval(shape({ intervals: ["5th", "4th"], strings: "65", to: 3 }))!;
    const steps = of(t, "step");
    const cues = cuesOf(t);
    for (const c of cues) assert.equal(c.midi[0], OPEN_MIDI[c.frets[0].string] + c.frets[0].fret);
    assert.ok(steps.every((s) => s.beats === 1 && s.chord === ""));
    const second = steps.findIndex((s) => s.cue === "4ths up");
    assert.ok(second > 0 && steps[second].at % 4 === 0);
    assert.deepEqual(steps.filter((s) => s.cue).map((s) => s.cue), ["5ths up", "5ths down", "4ths up", "4ths down"]);
    assert.equal(t.bars, Math.ceil((steps[steps.length - 1].at + 1) / 4));
    assert.deepEqual(of(t, "scale").map((s) => [s.key, s.scale]), [[7, "major-ionian"]]);
    assert.equal(melodyTonic(7), 55);
  });
  it("from one note: the key note, the note above on the second string, the note below the same way down", () => {
    // G on the D string (fret 5): a 5th up is D on the G string, a 5th down is C on the A string
    assert.deepEqual(cells({ intervals: ["5th"], strings: "43", walk: "note" }), [[2, 5], [3, 7], [2, 5], [1, 3]]);
    assert.deepEqual(cells({ intervals: ["5th"], strings: "43", walk: "note", direction: "up" }), [[2, 5], [3, 7]]);
    assert.deepEqual(cells({ intervals: ["5th"], strings: "43", walk: "note", direction: "down" }), [[2, 5], [1, 3]]);
    const t = interval(shape({ intervals: ["5th", "octave"], strings: "42", walk: "note" }))!;
    assert.deepEqual(of(t, "step").filter((s) => s.cue).map((s) => s.cue), ["A 5th up", "A 5th down", "An octave up", "An octave down"]);
    // one place for the key note through every interval
    const home = cuesOf(t).filter((_, i) => i % 2 === 0).map((c) => `${c.frets[0].string}:${c.frets[0].fret}`);
    assert.equal(new Set(home).size, 1);
  });
  it("in every key each interval has a line on the strings that hold it, and every line is on the neck", () => {
    for (let key = 0; key < 12; key++) for (const name of INTERVAL_NAMES) for (const strings of ["66", "65", "64", "32", "42", "11"]) {
      const line = intervalLine({ shape: "interval", key: String(key), intervals: [name], strings });
      if ("error" in line) { assert.match(line.error, /don't hold/, `${key} ${name} ${strings}: ${line.error}`); continue; }
      const t = expandShape({ shape: "interval", bpm: 80, key: String(key), intervals: [name], strings })!;
      assert.ok(t, `${key} ${name} ${strings}`);
      for (const c of cuesOf(t)) assert.ok(c.frets.length === 1 && c.frets[0].fret >= 0 && c.frets[0].fret <= 17);
    }
  });
  it("says why a shape can't be played", () => {
    const why = (props: Record<string, unknown>) => { const l = intervalLine(shape(props)); return "error" in l ? l.error : null; };
    assert.equal(why({ intervals: ["octave"], strings: "64" }), null);
    assert.match(why({ intervals: ["octave"], strings: "65" })!, /strings 65 don't hold octaves within 4 frets/);
    assert.match(why({ intervals: ["9th"], strings: "65" })!, /"intervals" is a list/);
    assert.match(why({ intervals: [], strings: "65" })!, /"intervals" is a list/);
    assert.match(why({ intervals: ["5th"], strings: "56" })!, /"strings" is two guitar numbers/);
    assert.match(why({ intervals: ["5th"], strings: "65", direction: "sideways" })!, /"direction"/);
    assert.match(why({ intervals: ["5th"], strings: "65", walk: "run" })!, /"walk"/);
    assert.match(why({ intervals: ["5th"], strings: "65", from: 9, to: 4 })!, /"from" and "to"/);
    assert.match(why({ intervals: ["octave"], strings: "64", walk: "note" })!, /no string two strings lower/);
    assert.match(why({ intervals: ["octave"], strings: "66", walk: "note" })!, /no place on string 6/);
    assert.equal(interval(shape({ intervals: ["octave"], strings: "65" })), null);
    assert.equal(expandShape(shape({ intervals: ["octave"], strings: "64", walk: "note" })), null);
    assert.ok(expandShape(shape({ intervals: ["octave"], strings: "64", walk: "note", direction: "up" })));
  });
  it("the step of the intervals-on-neck track a shape stands for", () => {
    const step = (props: Record<string, unknown>) => intervalStep({ shape: "interval", key: "g", ...props });
    assert.equal(step({ intervals: ["octave"], strings: "64" }), "octaves");
    assert.equal(step({ intervals: ["octave"], strings: "31", to: 7 }), "octaves");
    assert.equal(step({ intervals: ["octave"], strings: "64", direction: "up" }), null);
    assert.equal(step({ intervals: ["octave"], strings: "66" }), null);
    assert.equal(step({ intervals: ["5th", "4th"], strings: "65" }), "fifths-fourths");
    assert.equal(step({ intervals: ["4th"], strings: "55", direction: "up" }), "fifths-fourths");
    assert.equal(step({ intervals: ["5th"], strings: "64" }), null);
    assert.equal(step({ intervals: ["3rd"], strings: "32" }), "thirds-sixths");
    assert.equal(step({ intervals: ["3rd", "6th"], strings: "43" }), "thirds-sixths");
    assert.equal(step({ intervals: ["6th"], strings: "31" }), "thirds-sixths");
    assert.equal(step({ intervals: ["5th"], strings: "43", walk: "note" }), "one-note");
    assert.equal(step({ intervals: ["5th"], strings: "43", walk: "note", direction: "up" }), null);
    assert.equal(step({ intervals: ["2nd", "3rd", "4th", "5th"], strings: "32" }), "every");
    assert.equal(step({ intervals: ["7th"], strings: "42" }), "every");
    assert.equal(step({ intervals: ["7th"], strings: "42", direction: "down" }), null);
    assert.equal(step({ intervals: ["5th", "3rd"], strings: "65" }), null);
    assert.equal(step({ intervals: ["octave"], strings: "65" }), null);
    assert.equal(step({ shape: "melody", tune: 1 }), null);
  });
});
