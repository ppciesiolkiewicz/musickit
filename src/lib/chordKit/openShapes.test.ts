import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPEN_SHAPES } from "./openShapes";
import { SHAPES, type Shape } from "./shapes";
import { ALL_SHAPES, OPEN_RICH, RICH_SHAPES, ROOT_INDEX, fitsRoot, openRootPc, rootFretFor, shapeSemitones } from "./shapeTools";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const label = (s: Shape) => `${NAMES[openRootPc(s) ?? 0]}${s.suf}`;

describe("open chords", () => {
  it("are the chords the course teaches, by name", () => {
    const names = OPEN_SHAPES.map((s) => label(s)).sort();
    assert.deepEqual(names, ["A", "A7", "Am", "Am7", "Asus2", "B7", "C", "C7", "Cadd9", "D", "D7", "Dm", "Dsus2", "Dsus4", "E", "E7", "Em", "Em7", "Esus4", "Fmaj7", "G", "G7"].sort());
  });
  it("stage 1 is the eight first chords", () => {
    assert.deepEqual(OPEN_SHAPES.filter((s) => s.stage === 1).map((s) => label(s)).sort(), ["A", "Am", "C", "D", "Dm", "E", "Em", "G"]);
  });
  it("each fingering sounds its expected intervals, root offset 0, no fret below 0", () => {
    for (const s of OPEN_SHAPES) {
      assert.equal(s.f[ROOT_INDEX[s.rs]], 0, label(s));
      assert.ok(s.at !== undefined && s.f.every((v) => v === null || s.at! + v >= 0), label(s));
      const got = [...new Set(shapeSemitones(s).filter((v): v is number => v !== null))].sort((a, b) => a - b);
      assert.deepEqual(got, [...s.exp].sort((a, b) => a - b), label(s));
      assert.ok(s.tags.includes("open"), label(s));
    }
  });
  it("are easy, carry ids from 1000, and only fit their own root", () => {
    OPEN_RICH.forEach((s, i) => {
      assert.equal(s.diff, "easy");
      assert.equal(s.id, 1000 + i);
      const pc = openRootPc(s)!;
      for (let r = 0; r < 12; r++) assert.equal(fitsRoot(s, r), r === pc);
      assert.equal(rootFretFor(s, pc), s.at);
    });
  });
  it("RICH_SHAPES stays movable-only; ALL_SHAPES has both", () => {
    assert.ok(RICH_SHAPES.every((s) => s.at === undefined));
    assert.equal(ALL_SHAPES.length, RICH_SHAPES.length + OPEN_RICH.length);
    assert.ok(RICH_SHAPES.every((s) => [0, 5, 11].every((pc) => fitsRoot(s, pc))));
  });
  it("adds 6th- and 5th-string power chords", () => {
    const p = SHAPES.filter((s) => s.suf === "5");
    assert.deepEqual(p.map((s) => s.rs).sort(), [5, 6]);
    p.forEach((s) => { assert.equal(s.fam, "power"); assert.deepEqual(s.exp, [0, 7]); });
  });
});

import { shapesForChord, shapesForTones, shapeTier } from "./chordShapes";
import { makeKeyContext } from "@/features/theory/theory";
import { modeChords } from "@/features/theory/scales";

const pickName = (ctx: ReturnType<typeof makeKeyContext>, d: number) => {
  const p = shapesForChord(ctx, d, ["easy", "medium", "hard"], { fit: "triad" })[0];
  return { tier: shapeTier(p.shape), fret: p.fret, suf: p.shape.suf, v: p.shape.v, open: p.shape.at !== undefined, rs: p.shape.rs };
};

describe("picking the simplest shape", () => {
  const C = makeKeyContext(0, 0, 0); // C major
  it("C major triads: open C Dm Em G Am, F as the 1st-fret E-shape barre", () => {
    [0, 1, 2, 4, 5].forEach((d) => assert.equal(pickName(C, d).open, true, `degree ${d}`));
    const f = pickName(C, 3);
    assert.deepEqual([f.tier, f.rs, f.fret, f.suf], [1, 6, 1, ""]);
  });
  it("triad fit never offers 7ths, shells or added notes", () => {
    for (let d = 0; d < 7; d++) {
      const [, third, fifth] = modeChords(C)[d].notes.map((n) => n.semis);
      const triad = new Set([0, third, fifth]);
      shapesForChord(C, d, ["easy", "medium", "hard"], { fit: "triad" }).forEach((c) => {
        assert.ok(shapeSemitones(c.shape).every((t) => t === null || triad.has(t)), `${C.chords[d].triadName} got ${c.shape.suf} ${c.shape.v ?? ""}`);
      });
    }
  });
  it("Bdim (no open voicing) still gets a pick", () => {
    assert.ok(shapesForChord(C, 6, ["easy", "medium", "hard"], { fit: "triad" }).length > 0);
  });
  it("default mode fit keeps exact shapes ahead and puts open chords first among them", () => {
    const list = shapesForChord(C, 0);
    assert.equal(list[0].shape.at, 3); // open C
    const firstInexact = list.findIndex((c) => !c.exact);
    if (firstInexact >= 0) assert.ok(list.slice(firstInexact).every((c) => !c.exact));
  });
  it("shapesForTones: open chord first, never an open chord on the wrong root", () => {
    assert.equal(shapesForTones(0, [0, 4, 7])[0].choice.shape.at, 3);
    for (let pc = 0; pc < 12; pc++) for (const semis of [[0, 4, 7], [0, 3, 7], [0, 4, 7, 10]])
      shapesForTones(pc, semis, ["easy", "medium", "hard"]).forEach(({ choice }) => assert.ok(fitsRoot(choice.shape, pc)));
  });
  it("tiers: open 0, E/A-shape triad barre 1, others 2", () => {
    assert.equal(shapeTier(OPEN_RICH[0]), 0);
    assert.equal(shapeTier(RICH_SHAPES.find((s) => s.rs === 6 && s.suf === "" && !s.v)!), 1);
    assert.equal(shapeTier(RICH_SHAPES.find((s) => s.rs === 4 && s.suf === "")!), 2);
  });
});

import { keyEntries, plainEntries } from "./shapeTools";

describe("open chords in the browsers", () => {
  it("plainEntries lists every open chord once", () => {
    assert.equal(plainEntries().filter((e) => e.shape.at !== undefined).length, OPEN_SHAPES.length);
  });
  it("keyEntries places open chords only on their own root", () => {
    const G = makeKeyContext(7, 0, 0); // G major
    const open = keyEntries(G).filter((e) => e.shape.at !== undefined);
    assert.ok(open.length > 0);
    open.forEach((e) => assert.equal(openRootPc(e.shape), e.rootPc));
    const names = new Set(open.map((e) => `${e.roman}:${e.shape.suf}`));
    assert.ok(names.has("I:") && names.has("IV:") && names.has("V:") && names.has("vi:m"));
  });
});

import { diagramLowFret } from "./shapeTools";
import { filterChoices } from "./chordSearch";

describe("review fixes", () => {
  it("a diagram with an open string starts at the nut", () => {
    assert.equal(diagramLowFret([0, 2, 2, 0, 0, 0]), 1); // open Em
    assert.equal(diagramLowFret([null, null, 0, 2, 3, 2]), 1); // open D
    assert.equal(diagramLowFret([null, 5, 7, 7, 7, 5]), 5); // D, A-shape barre at 5
    assert.equal(diagramLowFret([null, null, null, null, null, null]), 1);
  });
  it("chord search results combine with the tag filters", () => {
    const am7 = shapesForTones(9, [0, 3, 7, 10], ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice);
    const jazz = filterChoices(am7, ["jazz"]);
    assert.ok(jazz.length > 0 && jazz.length < am7.length);
    assert.ok(jazz.every((c) => c.shape.tags.includes("jazz")));
    assert.deepEqual(filterChoices(am7, []), am7);
    assert.ok(filterChoices(am7, ["x:easy"]).every((c) => c.shape.diff === "easy"));
  });
});
