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
import { MODE_PAGES, modeChords, relativesOf, rainbow } from "./scales";

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
  it("rainbow goes from red to violet", () => {
    assert.ok(rainbow(0).startsWith("hsl(0 "));
    assert.ok(rainbow(6).startsWith("hsl(270 "));
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
