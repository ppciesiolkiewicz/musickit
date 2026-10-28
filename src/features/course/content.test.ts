import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { THEORY_SECTIONS } from "../theory/sections";
import { lessonShape } from "./visuals";
import { tabFor } from "@/lib/chordKit/tab";
import { ALL_SECTIONS, findSection } from "./course";
import { pcAt, type CourseSection } from "./model";
import { STRUMS } from "./strum";

/** Stages whose content is written; each content task adds its stages here. Sections with no blocks yet are planned. */
const DONE = ["0-1", "0-2", "0-3", "0-4", "1", "2", "3", "4", "5", "6", "7"];

const sec = (stage: string, section: string) => {
  const r = findSection(stage, section);
  assert.ok(r, `${stage}/${section}`);
  return r.section;
};
const visuals = (s: CourseSection) => s.blocks.flatMap((b) => (b.kind === "visual" ? [b.visual] : []));
const necks = (s: CourseSection) => visuals(s).flatMap((v) => (v.kind === "neck" ? [v] : []));
const chordNames = (s: CourseSection) => visuals(s).flatMap((v) => (v.kind === "chords" ? v.chords.map((c) => c.name) : []));
const pcs = (s: CourseSection) => necks(s).flatMap((n) => n.dots.map((d) => pcAt(d.string, d.fret)));
const linkOk = (href: string) => {
  const path = href.split(/[?#]/)[0];
  const m = /^\/course\/([^/]+)\/([^/]+)$/.exec(path);
  if (m) return !!findSection(m[1], m[2]);
  return THEORY_SECTIONS.some((s) => { const p = s.href.split("#")[0]; return path === p || path.startsWith(`${p}/`); });
};

describe("course content: every stage", () => {
  it("neck dots and path points sit on the drawn frets; paths have at least two points", () => {
    ALL_SECTIONS.forEach(({ stage, section }) => necks(section).forEach((n) => {
      [...n.dots, ...(n.paths ?? []).flatMap((p) => p.points)].forEach((d) =>
        assert.ok(d.string >= 0 && d.string < 6 && d.fret >= n.from && d.fret <= n.to, `${stage.slug}/${section.slug} ${d.string}:${d.fret}`));
      (n.paths ?? []).forEach((p) => assert.ok(p.points.length >= 2, `${stage.slug}/${section.slug}`));
    }));
  });
  it("every chord box has a shape, of the asked-for kind", () => {
    ALL_SECTIONS.forEach(({ section }) => visuals(section).forEach((v) => {
      if (v.kind !== "chords") return;
      v.chords.forEach((c) => {
        const shape = lessonShape(c.name, c.prefer, c.voicing, c.rootString);
        assert.ok(shape, c.name);
        if (c.prefer && !c.voicing) assert.ok(shape.shape.tags.includes(c.prefer), `${c.name} ${c.prefer}`);
        if (c.voicing) assert.equal(shape.shape.v, c.voicing, c.name);
      });
    }));
  });
  it("strum blocks name real patterns, melodies fit the guitar", () => {
    ALL_SECTIONS.forEach(({ section }) => section.blocks.forEach((b) => {
      if (b.kind === "strum") assert.ok(b.pattern in STRUMS);
      if (b.kind === "melody") assert.doesNotThrow(() => tabFor(b.melody.notes, b.melody.position), b.melody.title);
    }));
  });
  it("links go to real pages", () => {
    ALL_SECTIONS.forEach(({ section }) => section.blocks.forEach((b) => {
      if (b.kind === "links") [...b.explore, ...b.practise].forEach((l) => assert.ok(linkOk(l.href), l.href));
    }));
  });
  it("written sections have text and something to look at or do", () => {
    ALL_SECTIONS.filter((r) => DONE.includes(r.stage.slug) && r.section.blocks.length).forEach(({ stage, section }) => {
      assert.ok(section.blocks.some((b) => b.kind === "text"), `${stage.slug}/${section.slug} text`);
      assert.ok(section.blocks.some((b) => b.kind !== "text" && b.kind !== "links"), `${stage.slug}/${section.slug} non-text`);
    });
  });
});

describe("course content: stage 0", () => {
  it("the 16th section uses the 16th pattern", () => {
    assert.ok(sec("0-2", "sixteenths").blocks.some((b) => b.kind === "strum" && b.pattern === "sixteenths"));
  });
  it("downstrums go quarter then eighth; island strum is over G C D", () => {
    const d = sec("0-2", "all-downstrums").blocks.flatMap((b) => (b.kind === "strum" ? [b.pattern] : []));
    assert.deepEqual(d, ["downs-quarter", "downs-eighth"]);
    const i = sec("0-2", "island-strum").blocks.find((b) => b.kind === "strum");
    assert.ok(i?.kind === "strum" && i.pattern === "island");
    assert.deepEqual(i.chords, ["G", "C", "D"]);
  });
  it("first songs use only the stage 0 chords", () => {
    const allowed = new Set(["Em", "Am", "C", "D", "G", "B7"]);
    const songs = sec("0-2", "first-songs").blocks.flatMap((b) => (b.kind === "songs" ? b.songs : []));
    assert.ok(songs.length >= 3);
    songs.forEach((s) => s.chords.forEach((c) => assert.ok(allowed.has(c), `${s.title}: ${c}`)));
  });
  it("open chord sections show their chords", () => {
    assert.deepEqual(chordNames(sec("0-2", "em-and-am")), ["Em", "Am"]);
    assert.deepEqual(chordNames(sec("0-2", "c-d-g")), ["C", "D", "G"]);
  });
  it("do-re-mi is G major in position 1, with solfège under each degree", () => {
    const s = sec("0-3", "do-re-mi");
    const g = new Set([7, 9, 11, 0, 2, 4, 6]);
    assert.ok(pcs(s).length >= 7);
    pcs(s).forEach((pc) => assert.ok(g.has(pc), String(pc)));
    necks(s).forEach((n) => n.dots.forEach((d) => { assert.ok(d.fret <= 3); assert.ok(d.sub); }));
  });
  it("piano and guitar shows a piano", () => {
    assert.ok(visuals(sec("0-3", "piano-and-guitar")).some((v) => v.kind === "piano"));
  });
});

const pathPcs = (pts: { string: number; fret: number }[]) => pts.map((p) => pcAt(p.string, p.fret));

describe("course content: stage 1", () => {
  it("1 → 4 → 5 → 1 starts with the G C D G roots in position 1", () => {
    const first = necks(sec("1", "one-four-five"))[0].paths![0].points;
    assert.deepEqual(first, [{ string: 0, fret: 3 }, { string: 1, fret: 3 }, { string: 2, fret: 0 }, { string: 3, fret: 0 }]);
    assert.deepEqual(pathPcs(first), [7, 0, 2, 7]);
  });
  it("then the same idea in E minor: E A B E", () => {
    const second = necks(sec("1", "one-four-five"))[1].paths![0].points;
    assert.deepEqual(second, [{ string: 0, fret: 0 }, { string: 1, fret: 0 }, { string: 1, fret: 2 }, { string: 2, fret: 2 }]);
  });
  it("the Em arpeggio path climbs E G B E G B E, all chord tones", () => {
    const em = necks(sec("1", "arpeggios"))[0].paths![0].points;
    assert.deepEqual(em.map((p) => [p.string, p.fret]), [[0, 0], [0, 3], [1, 2], [2, 2], [3, 0], [4, 0], [5, 0]]);
    pathPcs(em).forEach((pc) => assert.ok([4, 7, 11].includes(pc)));
  });
  it("move it: the 3–6 neck is G natural minor", () => {
    const n = necks(sec("1", "move-it")).find((x) => x.from >= 3)!;
    const gm = new Set([7, 9, 10, 0, 2, 3, 5]);
    n.dots.forEach((d) => { assert.ok(gm.has(pcAt(d.string, d.fret))); assert.ok(d.fret >= 3 && d.fret <= 6); });
  });
  it("E minor pentatonic has only its five notes", () => {
    const pent = new Set([4, 7, 9, 11, 2]);
    pcs(sec("1", "pentatonic")).forEach((pc) => assert.ok(pent.has(pc), String(pc)));
  });
  it("position 1 chords are the open chords of the key plus B7", () => {
    assert.deepEqual(chordNames(sec("1", "chords")), ["Em", "Am", "C", "D", "G", "B7"]);
  });
  it("every path in position 1 stays in frets 0–3 except where a neck says otherwise", () => {
    ["arpeggios", "one-four-five", "triads"].forEach((x) => necks(sec("1", x)).forEach((n) => assert.ok(n.to <= 4, x)));
  });
});

describe("course content: stage 2", () => {
  it("drop 3 chords are true drop 3s: root on the low E, the A string muted, starting with the open Em7", () => {
    const v = visuals(sec("2", "drop-3")).flatMap((x) => (x.kind === "chords" ? x.chords : [])).filter((c) => c.tag !== "drop 2");
    assert.equal(v[0].name, "Em7");
    assert.ok(v.length >= 5);
    v.forEach((c) => {
      const sh = lessonShape(c.name, c.prefer, c.voicing, c.rootString)!;
      assert.equal(sh.shape.rs, 6, c.name);
      assert.equal(sh.shape.f[1], null, `${c.name} skips the A string`);
    });
  });
  it("the A-string cousins are shown as drop 2, not drop 3", () => {
    const cousins = visuals(sec("2", "drop-3")).flatMap((x) => (x.kind === "chords" ? x.chords : [])).filter((c) => c.tag === "drop 2");
    assert.ok(cousins.length >= 2);
    cousins.forEach((c) => assert.equal(lessonShape(c.name, c.prefer, c.voicing, c.rootString)!.shape.rs, 5, c.name));
  });
  it("lesson text tells the truth about fingerings", () => {
    const all = (st: string, x: string) => sec(st, x).blocks.flatMap((b) => (b.kind === "text" ? b.paras : [])).join(" ");
    assert.ok(!/partial barre|flat across/.test(all("2", "easier-bm")), "small Bm needs no barre");
    assert.ok(!/top three strings/.test(all("0-4", "melodies")), "both tunes sit on the top two strings");
    assert.ok(!/Am7 are drop 3/.test(all("2", "drop-3")), "open Am7 is a drop 2 shape");
  });
  it("the Bm barre is the A shape at the 2nd fret", () => {
    assert.equal(lessonShape("Bm", "barre")!.fret, 2);
    assert.ok(visuals(sec("2", "bm-barre")).some((x) => x.kind === "chords" && x.chords.some((c) => c.name === "Bm" && c.prefer === "barre")));
  });
  it("position 2 arpeggios stay in frets 2–5 on their chord's notes", () => {
    const tones: Record<string, number[]> = { Bm: [11, 2, 6], G: [7, 11, 2] };
    const ns = necks(sec("2", "arpeggios"));
    assert.equal(ns.length, 2);
    ns.forEach((n, i) => n.paths!.flatMap((p) => p.points).forEach((pt) => {
      assert.ok(pt.fret >= 2 && pt.fret <= 5);
      assert.ok(tones[i === 0 ? "Bm" : "G"].includes(pcAt(pt.string, pt.fret)));
    }));
  });
});

describe("course content: stage 3", () => {
  it("every chord box in stage 3 is in position 1", () => {
    ALL_SECTIONS.filter((r) => r.stage.slug === "3").forEach(({ section }) => visuals(section).forEach((v) => {
      if (v.kind === "chords") v.chords.forEach((c) => assert.ok(lessonShape(c.name, c.prefer, c.voicing)!.fret <= 3, c.name));
    }));
  });
  it("every neck in stage 3 stays in position 1", () => {
    ALL_SECTIONS.filter((r) => r.stage.slug === "3").forEach(({ section }) => necks(section).forEach((n) => n.dots.forEach((d) => assert.ok(d.fret <= 3, section.slug))));
  });
  it("6 chords show G6, C6, Em6 and D6, each dot a note of its chord", () => {
    const six: Record<string, number[]> = { G6: [7, 11, 2, 4], C6: [0, 4, 7, 9], Em6: [4, 7, 11, 1], D6: [2, 6, 9, 11] };
    const ns = necks(sec("3", "six-chords"));
    assert.equal(ns.length, 4);
    Object.values(six).forEach((tones, i) => ns[i].dots.forEach((d) => assert.ok(tones.includes(pcAt(d.string, d.fret)))));
  });
  it("colour paths keep the G C D G root path", () => {
    const roots = necks(sec("3", "colour-paths")).flatMap((n) => n.paths ?? []).map((p) => p.points.map((x) => [x.string, x.fret]));
    assert.ok(roots.some((p) => JSON.stringify(p) === JSON.stringify([[0, 3], [1, 3], [2, 0], [3, 0]])));
  });
});

describe("course content: stages 4–6", () => {
  it("one arpeggio through five shapes is all G, B and D, with five paths", () => {
    const s = sec("4", "one-arpeggio");
    pcs(s).forEach((pc) => assert.ok([7, 11, 2].includes(pc), String(pc)));
    assert.equal(necks(s)[0].paths!.length, 5);
    necks(s)[0].paths!.flatMap((p) => p.points).forEach((pt) => assert.ok([7, 11, 2].includes(pcAt(pt.string, pt.fret))));
  });
  it("the D, C and A shape necks hold only G major", () => {
    const g = new Set([7, 9, 11, 0, 2, 4, 6]);
    const ns = necks(sec("4", "d-c-a-shapes"));
    assert.equal(ns.length, 3);
    ns.forEach((n) => n.dots.forEach((d) => assert.ok(g.has(pcAt(d.string, d.fret)))));
  });
  it("E harmonic minor in position 1 includes its raised 7th, D♯", () => {
    const hm = new Set([4, 6, 7, 9, 11, 0, 3]);
    const p = pcs(sec("5", "harmonic-minor"));
    p.forEach((pc) => assert.ok(hm.has(pc), String(pc)));
    assert.ok(p.includes(3));
  });
  it("modes compare Aeolian, Dorian and Phrygian on wheels", () => {
    const w = visuals(sec("5", "modes")).find((v) => v.kind === "wheels");
    assert.ok(w && w.kind === "wheels");
    ["Aeolian", "Dorian", "Phrygian"].forEach((m) => assert.ok(w.wheels.some((x) => x.name === m), m));
  });
  it("the circle map shows the circle", () => {
    assert.ok(visuals(sec("6", "circle-map")).some((v) => v.kind === "circle"));
  });
});
