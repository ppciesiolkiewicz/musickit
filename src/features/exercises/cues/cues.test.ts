import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandShape } from "../shapes";
import { cuesOf } from "./cues";
import { tabOf } from "./tab";
import { chordShapeFor } from "./voicing";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { buildArpeggio, neckCells, arpPositions } from "@/lib/chordKit/arpeggios";
import { makeKeyContext } from "@/features/theory/theory";

const pc = (m: number) => ((m % 12) + 12) % 12;

describe("chordShapeFor", () => {
  it("G barre: E-shape at fret 3, root on string 0", () => {
    const v = chordShapeFor("G", "barre")!;
    assert.equal(v.fret, 3);
    assert.equal(v.fellBack, false);
    assert.equal(v.shape.rs, 6);
    assert.equal(v.midi[0], 43);
  });
  it("F# barre does not fall back", () => assert.equal(chordShapeFor("F#", "barre")!.fellBack, false));
  it("C9 has no barre: falls back to the open choice", () => {
    const v = chordShapeFor("C9", "barre")!;
    const q = parseChordQuery("C9")!;
    const open = shapesForTones(q.rootPc, q.semis, ["easy", "medium", "hard"]).find((r) => r.full)!.choice;
    assert.equal(v.fellBack, true);
    assert.equal(v.shape, open.shape);
    assert.equal(v.fret, open.fret);
  });
  it("open is today's choice; unknown chord is null", () => {
    assert.equal(chordShapeFor("C", "open")!.shape.at, 3);
    assert.equal(chordShapeFor("zz", "open"), null);
  });
});

describe("cuesOf: chord steps", () => {
  const t = expandShape({ shape: "chord-steps", bpm: 70, voicing: "barre", chords: [{ chord: "G", steps: ["strum", "1", "6", "1"] }, { chord: "D", steps: ["strum", "4", "5", "4"] }] })!;
  const cues = cuesOf(t);
  it("sorted by at", () => assert.deepEqual(cues.map((c) => c.at), [...cues.map((c) => c.at)].sort((a, b) => a - b)));
  it("G root on string 0 fret 3", () => {
    const root = cues.find((c) => c.at === 1)!;
    assert.equal(root.kind, "note");
    assert.deepEqual(root.frets, [{ string: 0, fret: 3 }]);
  });
  it("the 6th over G is an E with one fret", () => {
    const six = cues.find((c) => c.at === 2)!;
    assert.equal(pc(six.midi[0]), 4);
    assert.equal(six.frets.length, 1);
  });
  it("strum column has 6 cells", () => {
    const cols = tabOf(cues);
    assert.equal(cols.find((c) => c.at === 0)!.cells.length, 6);
    assert.equal(cols.length, cues.filter((c) => c.kind !== "backing").length);
  });
});

describe("cuesOf: boxes", () => {
  const boxes = (name: string) => {
    const q = parseChordQuery(name)!;
    const ctx = makeKeyContext(q.rootPc, 0, 0);
    return arpPositions(neckCells(ctx, buildArpeggio(ctx, 0, q.semis.includes(3) ? "min" : "maj")));
  };
  it("places: strings in part, frets in box span", () => {
    const place = [{ box: 1, part: "lower" }, { box: 1, part: "upper" }, { box: 2, part: "lower" }, { box: 2, part: "upper" }];
    const t = expandShape({ shape: "arpeggio-part", bpm: 70, chords: ["C", "Am", "F", "G"], degrees: ["1", "3", "5"], bars: 4, place })!;
    const cues = cuesOf(t).filter((c) => c.kind === "note");
    assert.equal(cues.length, 16);
    for (const c of cues) {
      const bar = Math.floor(c.at / 4);
      const p = place[bar];
      const box = boxes(c.chord)[p.box - 1];
      for (const f of c.frets) {
        assert.ok(p.part === "lower" ? f.string <= 2 : f.string >= 3, `${c.chord} ${JSON.stringify(f)}`);
        assert.ok(f.fret >= box.from && f.fret <= box.to, `${c.chord} ${JSON.stringify(f)} ${box.from}-${box.to}`);
      }
    }
  });
  it("across Am box2-upper to box3-lower: up then down, shared note once", () => {
    const t = expandShape({ shape: "arpeggio-part", bpm: 70, chords: ["Am"], degrees: ["1", "b3", "5"], bars: 2, across: { from: { box: 2, part: "upper" }, to: { box: 3, part: "lower" } } })!;
    const all = cuesOf(t).filter((c) => c.kind === "note").map((c) => c.midi[0]);
    const peak = all.indexOf(Math.max(...all));
    const end = all.findIndex((m, i) => i > peak && m >= all[i - 1]);
    const midi = all.slice(0, end < 0 ? all.length : end);
    assert.ok(midi.length >= 4, `${all}`);
    const top = midi.indexOf(Math.max(...midi));
    assert.ok(top > 0 && top < midi.length - 1);
    for (let i = 1; i <= top; i++) assert.ok(midi[i] > midi[i - 1], `up ${midi}`);
    for (let i = top + 1; i < midi.length; i++) assert.ok(midi[i] < midi[i - 1], `down ${midi}`);
    assert.equal(midi.filter((m) => m === midi[top]).length, 1);
  });
});

describe("cuesOf: highlight and melody", () => {
  it("highlight [4] over C marks only E", () => {
    const t = expandShape({ shape: "chord-steps", chords: [{ chord: "C", steps: ["1", "3", "5", "3"] }] })!;
    const cues = cuesOf(t, { highlight: [4] });
    assert.ok(cues.length === 4);
    for (const c of cues) assert.equal(c.highlighted, pc(c.midi[0]) === 4);
    assert.ok(cuesOf(t).every((c) => c.highlighted));
  });
  it("melody from key: tonic near 60, steps stay close", () => {
    const t = expandShape({ shape: "melody", key: "G", tune: 1 });
    assert.ok(t);
    const cues = cuesOf(t).filter((c) => c.kind === "note");
    assert.ok(cues.length > 0);
    for (let i = 1; i < cues.length; i++) assert.ok(Math.abs(cues[i].midi[0] - cues[i - 1].midi[0]) <= 6);
    for (const c of cues) assert.equal(c.frets.length, 1);
  });
  it("backing cues from compEvents and excluded from tab", () => {
    const t = expandShape({ shape: "progression", key: "C", bars: 2, chords: ["C", "G"], backing: ["block"] })!;
    const cues = cuesOf(t);
    const back = cues.filter((c) => c.kind === "backing");
    {
      assert.equal(back.length, 8);
      assert.equal(tabOf(cues).length, cues.length - back.length);
    }
  });
});
