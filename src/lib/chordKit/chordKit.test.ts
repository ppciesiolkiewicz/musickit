import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SHAPES } from "./shapes";
import { RICH_SHAPES, ROOT_INDEX, OPEN_PITCH, rootFretFor, shapeSemitones, keyEntries, matchesTags, tagCount, plainEntries } from "./shapeTools";
import { FAMILIES, makeKeyContext, rotate, spell, TONICS, MODE_LIST } from "./theory";
import { PROG_LIST, resolveProgression, progressionSteps, chordInstances, NECK_FRETS } from "./progressions";
import { STRING_ORDER } from "./shapeTools";

describe("shapes", () => {
  it("every shape has its root on the root string and the expected intervals", () => {
    for (const s of SHAPES) {
      const ri = ROOT_INDEX[s.rs];
      assert.equal(s.f[ri], 0, `root string offset for ${s.rs} ${s.suf} ${s.v ?? ""}`);
      const got = [...new Set(shapeSemitones(s).filter((v): v is number => v !== null))].sort((a, b) => a - b);
      assert.deepEqual(got, [...s.exp].sort((a, b) => a - b), `${s.rs} ${s.suf} ${s.v ?? ""}`);
    }
  });
  it("has 90 shapes and a sensible difficulty mix", () => {
    assert.equal(SHAPES.length, 90);
    const by = (d: string) => RICH_SHAPES.filter((s) => s.diff === d).length;
    assert.ok(by("easy") > 0 && by("medium") > 0 && by("hard") > 0);
  });
  it("rootFretFor keeps every fret playable (>= 1)", () => {
    for (const s of SHAPES) for (let pc = 0; pc < 12; pc++) {
      const r = rootFretFor(s, pc);
      assert.ok(r + Math.min(...s.f.filter((v): v is number => v !== null)) >= 1);
    }
  });
  it("fit lists include the Ionian mode for a major triad", () => {
    const maj = RICH_SHAPES.find((s) => s.suf === "" && s.rs === 6)!;
    assert.ok(maj.fit.includes("Ionian"));
  });
});

describe("theory", () => {
  it("spells G major with F sharp", () => {
    const G = TONICS.find((t) => t.name === "G")!;
    assert.deepEqual(spell(G.letter, G.pc, FAMILIES[0].parent), ["G", "A", "B", "C", "D", "E", "F♯"]);
  });
  it("spells E♭ Dorian with one letter per degree", () => {
    const k = makeKeyContext(3, 0, 1);
    assert.deepEqual(k.names, ["E♭", "F", "G♭", "A♭", "B♭", "C", "D♭"]);
  });
  it("has 21 modes and rotates correctly", () => {
    assert.equal(MODE_LIST.length, 21);
    assert.deepEqual(rotate(FAMILIES[0].parent, 5), [0, 2, 3, 5, 7, 8, 10]);
  });
  it("names diatonic chords in E Aeolian", () => {
    const k = makeKeyContext(4, 0, 5);
    assert.deepEqual(k.chords.map((c) => c.seventhName), ["Em7", "F♯m7♭5", "Gmaj7", "Am7", "Bm7", "Cmaj7", "D7"]);
    assert.deepEqual(k.chords.map((c) => c.roman), ["i", "ii°", "♭III", "iv", "v", "♭VI", "♭VII"]);
  });
  it("names the chords of E harmonic minor, including V7 and the augmented III", () => {
    const k = makeKeyContext(4, 1, 0);
    assert.equal(k.chords[4].seventhName, "B7");
    assert.equal(k.chords[2].triadName, "Gaug");
    assert.equal(k.chords[6].seventhName, "D♯dim7");
  });
});

describe("key entries and tags", () => {
  const ctx = makeKeyContext(7, 0, 0); // G major
  it("only returns shapes whose notes are all in the key", () => {
    const e = keyEntries(ctx);
    assert.ok(e.length > 0);
    for (const x of e) {
      const d = x.degree!;
      const rel = new Set(ctx.steps.map((_, i) => (ctx.steps[(d + i) % 7] - ctx.steps[d] + 12) % 12));
      assert.ok(x.shape.exp.every((v) => rel.has(v)));
    }
  });
  it("tag matching is OR within a row and AND between rows", () => {
    const all = plainEntries();
    const easy = all.filter((e) => matchesTags(e, ["x:easy"]));
    const easyOrMedium = all.filter((e) => matchesTags(e, ["x:easy", "x:medium"]));
    assert.ok(easyOrMedium.length > easy.length);
    const jazzEasy = all.filter((e) => matchesTags(e, ["x:easy", "jazz"]));
    assert.ok(jazzEasy.every((e) => e.shape.diff === "easy" && e.shape.tags.includes("jazz")));
    assert.equal(tagCount(all, "x:easy", []), easy.length);
  });
});

describe("progressions", () => {
  it("resolves every progression with no undefined or NaN names", () => {
    for (const P of PROG_LIST) {
      const D = resolveProgression(P);
      assert.ok(D.uniq.length > 0, P.title);
      for (const c of D.seq) {
        assert.ok(!/undefined|NaN|\?/.test(c.name), `${P.title}: ${c.name}`);
        assert.ok(c.rootPc >= 0 && c.rootPc < 12);
      }
      for (const [a, b] of progressionSteps(D)) assert.ok(D.uniq[a] && D.uniq[b]);
    }
  });
  it("neck instances stay inside frets 0..17 and the shape sounds the chord root", () => {
    for (const P of PROG_LIST) {
      const D = resolveProgression(P);
      D.uniq.forEach((c, ci) => STRING_ORDER.forEach((rs) => {
        const list = chordInstances(c, ci, rs);
        if (!list) return;
        for (const inst of list) {
          for (const p of inst.pts) assert.ok(p.a >= 0 && p.a <= NECK_FRETS, `${c.name} fret ${p.a}`);
          const ri = ROOT_INDEX[rs];
          // root string pitch class (C = 0) must equal the chord root
          const openPc = [4, 9, 2, 7, 11, 4][ri];
          assert.equal((openPc + inst.rootFret) % 12, c.rootPc, `${c.name} root fret ${inst.rootFret}`);
        }
      }));
    }
  });
  it("includes the user's tune in G with drop 3 chords on the 6th string", () => {
    const P = PROG_LIST.find((p) => p.group === "Your tune in G")!;
    const D = resolveProgression(P);
    assert.deepEqual(D.sections[0].chords.map((c) => c.name), ["Gmaj7", "Am7", "Bm7"]);
    assert.equal(D.sections[0].chords[2].x, 2);
    assert.ok(D.sections.filter((s) => !s.loop).length >= 2);
    const g = chordInstances(D.sections[0].chords[0], 0, 6)!;
    assert.ok(g.some((i) => i.rootFret === 3));
  });
});

import { triadVoicings, STRING_GROUPS, TRIAD_QUALITIES, INVERSIONS } from "./triads";
import { MODE_PAGES, modeChords, relativesOf, degreeColour, DEGREE_COLOURS } from "./scales";

describe("triads by string group", () => {
  it("every voicing is closed, has the right chord tones and stays on the neck", () => {
    for (const g of STRING_GROUPS) for (const q of TRIAD_QUALITIES) for (const inv of INVERSIONS) {
      for (let pc = 0; pc < 12; pc++) {
        const list = triadVoicings(pc, q.id, inv.id as 0 | 1 | 2, g);
        assert.ok(list.length > 0, `${g.id} ${q.id} ${inv.id} root ${pc}`);
        for (const v of list) {
          assert.ok(v.midi[2] - v.midi[0] < 12);
          assert.ok(Math.min(...v.frets) >= 0 && Math.max(...v.frets) <= 17);
          const pcs = v.midi.map((m) => m % 12).sort((a, b) => a - b);
          const want = q.semis.map((s) => (pc + s) % 12).sort((a, b) => a - b);
          assert.deepEqual(pcs, want);
          assert.equal((v.midi[0]) % 12, (pc + q.semis[inv.order[0]]) % 12);
        }
      }
    }
  });
  it("C major root position on strings 5-4-3 includes x32010-style frets 3-2-0 at the bottom", () => {
    const list = triadVoicings(0, "maj", 0, STRING_GROUPS[1]);
    assert.ok(list.some((v) => v.frets.join() === "3,2,0"));
  });
});

describe("scale pages", () => {
  it("has 21 unique slugs", () => {
    assert.equal(MODE_PAGES.length, 21);
    assert.equal(new Set(MODE_PAGES.map((m) => m.slug)).size, 21);
  });
  it("lists the notes of D Dorian chords and the relatives", () => {
    const ctx = makeKeyContext(2, 0, 1);
    const ch = modeChords(ctx);
    assert.deepEqual(ch[0].notes.slice(0, 4).map((n) => n.name), ["D", "F", "A", "C"]);
    assert.deepEqual(ch[0].notes.map((n) => n.role), ["R", "♭3", "5", "♭7", "9", "11", "13"]);
    const rel = relativesOf(ctx);
    assert.equal(rel.relativeMajor?.tonic, "C");
    assert.equal(rel.relativeMinor?.tonic, "A");
    assert.equal(rel.siblings.length, 7);
    assert.deepEqual(rel.vsMajor, ["♭3", "♭7"]);
  });
  it("gives each of the seven degrees its own colour", () => {
    assert.equal(new Set(DEGREE_COLOURS).size, 7);
    assert.equal(degreeColour(7), degreeColour(0));
  });
});

import { buildArpeggio, neckCells, arpeggioMidi, ARP_QUALITIES } from "./arpeggios";

describe("arpeggios", () => {
  it("builds the diatonic arpeggios of D Dorian", () => {
    const ctx = makeKeyContext(2, 0, 1);
    assert.deepEqual(buildArpeggio(ctx, 0, "seventh").notes.map((n) => n.name), ["D", "F", "A", "C"]);
    assert.deepEqual(buildArpeggio(ctx, 0, "triad").notes.map((n) => n.role), ["R", "♭3", "5"]);
    assert.deepEqual(buildArpeggio(ctx, 1, "seventh").notes.map((n) => n.name), ["E", "G", "B", "D"]);
    assert.equal(buildArpeggio(ctx, 0, "ninth").notes.length, 5);
  });
  it("spells custom qualities with one letter per chord tone and flags outside notes", () => {
    const ctx = makeKeyContext(7, 0, 0); // G major
    const a = buildArpeggio(ctx, 0, "dim7");
    assert.deepEqual(a.notes.map((n) => n.name), ["G", "B♭", "D♭", "F♭"]);
    assert.ok(a.notes[1].outside);
    const m = buildArpeggio(ctx, 3, "maj7"); // Cmaj7
    assert.deepEqual(m.notes.map((n) => n.name), ["C", "E", "G", "B"]);
    assert.ok(m.notes.every((n) => !n.outside));
  });
  it("covers every quality and mode without bad names", () => {
    for (let fam = 0; fam < 3; fam++) for (let mode = 0; mode < 7; mode++) {
      const ctx = makeKeyContext(4, fam, mode);
      for (let d = 0; d < 7; d++) {
        for (const kind of ["triad", "seventh", "ninth", ...ARP_QUALITIES.map((q) => q.id)]) {
          const a = buildArpeggio(ctx, d, kind);
          for (const n of a.notes) assert.ok(!/\?|undefined/.test(n.name), `${fam}/${mode}/${d}/${kind}: ${n.name}`);
        }
      }
    }
  });
  it("marks every neck cell of the arpeggio and plays the notes upward", () => {
    const ctx = makeKeyContext(0, 0, 0);
    const a = buildArpeggio(ctx, 0, "triad");
    const cells = neckCells(ctx, a);
    assert.equal(cells.length, 6 * 18);
    assert.ok(cells.filter((c) => c.arp).every((c) => [0, 4, 7].includes(c.pc)));
    const m = arpeggioMidi(a);
    for (let i = 1; i <= a.notes.length; i++) assert.ok(m[i] > m[i - 1]);
  });
});

import { degreeLabels, stepPattern } from "./scales";
describe("degree labels", () => {
  it("labels Dorian and Lydian against the major scale", () => {
    assert.deepEqual(degreeLabels(makeKeyContext(0, 0, 1).steps), ["1", "2", "♭3", "4", "5", "6", "♭7"]);
    assert.deepEqual(degreeLabels(makeKeyContext(0, 0, 3).steps), ["1", "2", "3", "♯4", "5", "6", "7"]);
    assert.deepEqual(degreeLabels(makeKeyContext(0, 1, 6).steps), ["1", "♭2", "♭3", "♭4", "♭5", "♭6", "♭♭7"]);
  });
  it("gives the step pattern", () => {
    assert.deepEqual(stepPattern(makeKeyContext(0, 0, 0).steps), ["W", "W", "H", "W", "W", "W", "H"]);
    assert.deepEqual(stepPattern(makeKeyContext(0, 1, 0).steps), ["W", "H", "W", "W", "H", "W+H", "H"]);
  });
});

import { shapesForChord, carouselStep } from "./chordShapes";
import { shapeSemitones } from "./shapeTools";
describe("chord shapes for a mode chord", () => {
  it("every chord of every major-family mode in C has shapes, all containing its 3rd", () => {
    for (let m = 0; m < 7; m++) {
      const ctx = makeKeyContext(0, 0, m);
      const chords = modeChords(ctx);
      for (let d = 0; d < 7; d++) {
        const list = shapesForChord(ctx, d, ["easy", "medium", "hard"]);
        assert.ok(list.length > 0, `mode ${m} degree ${d}`);
        const third = chords[d].notes[1].semis;
        list.forEach((c) => assert.ok(shapeSemitones(c.shape).includes(third)));
      }
    }
  });
  it("puts exact chord-tone shapes first and respects difficulty", () => {
    const ctx = makeKeyContext(0, 0, 0);
    const list = shapesForChord(ctx, 0);
    assert.ok(list.every((c) => c.shape.diff !== "hard"));
    const firstInexact = list.findIndex((c) => !c.exact);
    if (firstInexact >= 0) assert.ok(list.slice(firstInexact).every((c) => !c.exact));
  });
  it("places the root on the right pitch class", () => {
    const ctx = makeKeyContext(7, 0, 0);
    const list = shapesForChord(ctx, 4); // D in G major
    assert.ok(list.every((c) => c.rootPc === 2));
  });
  it("carousel wraps", () => {
    assert.equal(carouselStep(0, -1, 5), 4);
    assert.equal(carouselStep(4, 1, 5), 0);
    assert.equal(carouselStep(0, 1, 0), 0);
  });
});

import { extensionDegree, roleWithDegree } from "./scales";
import { shapeTones } from "./chordShapes";
describe("extension degrees and shape tones", () => {
  it("maps 9/11/13 to 2/4/6", () => {
    assert.equal(extensionDegree("9"), "2");
    assert.equal(extensionDegree("11"), "4");
    assert.equal(extensionDegree("♭13"), "♭6");
    assert.equal(extensionDegree("♭3"), null);
    assert.equal(roleWithDegree("♭9"), "♭9 (♭2)");
    assert.equal(roleWithDegree("7"), "7");
  });
  it("locates every shape tone inside the mode", () => {
    const ctx = makeKeyContext(0, 0, 1);
    for (let d = 0; d < 7; d++) shapesForChord(ctx, d).slice(0, 5).forEach((c) => shapeTones(ctx, c).forEach((t) => assert.ok(t.scaleDegree >= 0)));
  });
});

import { cagedBoxes, boxCells, boxChords, CAGED_LETTERS, formsFor, ladderMidi, layerNotes, cagedContext } from "./caged";
describe("CAGED boxes", () => {
  it("every form is the right chord in every key", () => {
    (["major", "minor"] as const).forEach((q) => {
      for (let pc = 0; pc < 12; pc++) {
        const boxes = cagedBoxes(pc, q);
        assert.equal(boxes.length, 5);
        boxes.forEach((b) => {
          const pcs = new Set<number>();
          b.frets.forEach((f, i) => f !== null && pcs.add((OPEN_MIDI_E[i] + f) % 12));
          assert.deepEqual([...pcs].sort((x, y) => x - y), (q === "major" ? [0, 4, 7] : [0, 3, 7]).map((s) => (pc + s) % 12).sort((x, y) => x - y), `${q} ${b.letter} in ${pc}`);
          assert.ok(b.frets.every((f) => f === null || f >= 0));
          assert.ok(b.to <= 17 && b.from >= 0 && b.from <= b.lo);
        });
      }
    });
  });
  it("boxes run C A G E D up the neck from the nut, with no gaps", () => {
    for (let pc = 0; pc < 12; pc++) {
      const letters = cagedBoxes(pc, "major").map((b) => b.letter);
      const start = CAGED_LETTERS.indexOf(letters[0]);
      assert.deepEqual(letters, [0, 1, 2, 3, 4].map((i) => CAGED_LETTERS[(start + i) % 5]), `key ${pc}`);
      const bs = cagedBoxes(pc, "major");
      for (let i = 1; i < bs.length; i++) assert.ok(bs[i].lo <= bs[i - 1].hi + 1, `gap in key ${pc} before ${bs[i].letter}`);
    }
  });
  it("open C and open Am are where you expect", () => {
    const c = cagedBoxes(0, "major").find((b) => b.letter === "C")!;
    assert.deepEqual(c.frets, [null, 3, 2, 0, 1, 0]);
    const am = cagedBoxes(9, "minor").find((b) => b.letter === "A")!;
    assert.deepEqual(am.frets, [null, 0, 2, 2, 1, 0]);
    assert.equal(c.chordName, "C");
    assert.equal(am.chordName, "Am");
  });
  it("box cells carry the scale, pentatonic and arpeggio layers", () => {
    const box = cagedBoxes(0, "major")[0];
    const cells = boxCells(0, "major", box, "triad");
    assert.ok(cells.length === 6 * (box.to - box.from + 1));
    assert.ok(cells.filter((c) => c.inChord).length === box.frets.filter((f) => f !== null).length);
    cells.filter((c) => c.arpRole).forEach((c) => assert.ok([0, 4, 7].includes(c.pc)));
    cells.filter((c) => c.inPent).forEach((c) => assert.ok(c.inScale));
    cells.filter((c) => c.inChord).forEach((c) => assert.ok(c.arpRole));
    const m = boxCells(9, "minor", cagedBoxes(9, "minor")[0], "seventh");
    m.filter((c) => c.arpRole).forEach((c) => assert.ok([9, 0, 4, 7].includes(c.pc)));
  });
  it("layer notes are spelled for the key", () => {
    assert.deepEqual(layerNotes(7, "major", "triad").scale, ["G", "A", "B", "C", "D", "E", "F♯"]);
    assert.deepEqual(layerNotes(9, "minor", "triad").pent, ["A", "C", "D", "E", "G"]);
    assert.equal(cagedContext(9, "minor").modeName, "Aeolian");
  });
  it("related chords stay inside the box and ladder wraps back", () => {
    const box = cagedBoxes(0, "major")[1];
    boxChords(0, "major", box).forEach((c) => {
      const fr = c.shape.f.filter((v): v is number => v !== null).map((v) => c.rootFret + v);
      assert.ok(Math.max(...fr) <= box.to);
    });
    assert.deepEqual(ladderMidi(0, [0, 2, 4]), [48, 50, 52, 60, 52, 50, 48]);
    assert.equal(formsFor("minor").length, 5);
  });
});
const OPEN_MIDI_E = [40, 45, 50, 55, 59, 64];

describe("sus and extension slots", () => {
  it("Em in G major reaches Esus2 and Em9 through the M2", () => {
    const ctx = makeKeyContext(7, 0, 0);
    const em = ctx.chords[5];
    assert.equal(em.triadName, "Em");
    assert.equal(em.slots[0]?.label, "M2");
    assert.equal(em.slots[0]?.note, "F♯");
    assert.deepEqual(em.slots[0]?.kids.map((k) => k.text), ["Esus2", "Em9"]);
  });
});
