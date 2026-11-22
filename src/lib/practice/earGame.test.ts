import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHANGE_LEVELS, CHORD_QUALITIES, DEFAULT_QUALITIES, EAR_LEVELS, KEY_CHORDS, activeAnswers, earKindOf, levelChords, nextEarQuestion, parseEarSettings, recordScore, type EarQuestion } from "./earGame";
import { analyseDegree } from "@/features/theory/theory";
import { INTERVALS } from "@/lib/chordKit/intervals";

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const q = (s: string) => parseEarSettings(new URLSearchParams(s));
const semisOf = (short: string) => INTERVALS.find((i) => i.short === short)!.semis;

describe("ear game settings", () => {
  it("levels are cumulative", () => {
    assert.deepEqual(EAR_LEVELS.map((l) => l.n), [1, 2, 3, 4, 5]);
    assert.equal(activeAnswers(q("level=5")).length, 12);
    // an older link or plan's level 6 is the top level
    assert.equal(q("level=6").level, 5);
    assert.deepEqual(activeAnswers(q("level=1")).sort(), ["P5", "P8"]);
    assert.deepEqual(activeAnswers(q("level=3")).map(semisOf).sort((a, b) => a - b), [2, 3, 4, 5, 7, 12]);
    assert.equal(activeAnswers(q("level=6")).length, 12);
  });
  it("parses and falls back", () => {
    assert.deepEqual(q(""), { level: 1, custom: null, direction: "up", kind: "interval", wide: false, qualities: null });
    assert.equal(q("level=9").level, 1);
    assert.deepEqual(q("set=7,12,99").custom, [7, 12]);
    assert.equal(q("set=abc").custom, null);
    assert.equal(q("dir=down").direction, "down");
    assert.equal(q("kind=chord").kind, "chord");
    assert.equal(q("wide=1").wide, true);
    assert.deepEqual(activeAnswers(q("kind=chord")), ["maj", "min", "7", "maj7", "m7"]);
    assert.deepEqual(DEFAULT_QUALITIES, CHORD_QUALITIES.slice(0, 5).map((c) => c.id));
  });
});

describe("ear game questions", () => {
  it("intervals: right size and direction, answer in the set, no repeats", () => {
    for (const dir of ["up", "down", "together"]) {
      const s = q(`level=4&dir=${dir}`);
      const rand = seeded(11);
      let prev: EarQuestion | undefined;
      for (let i = 0; i < 200; i++) {
        const n = nextEarQuestion(s, rand, prev);
        assert.ok(activeAnswers(s).includes(n.answer));
        const d = n.midi[1] - n.midi[0];
        assert.equal(Math.abs(d), semisOf(n.answer));
        assert.equal(d < 0, dir === "down");
        assert.equal(n.together, dir === "together");
        assert.ok(n.midi.every((m) => m >= 55 && m <= 84), `out of range: ${n.midi}`);
        if (prev) assert.notEqual(n.answer, prev.answer);
        prev = n;
      }
    }
  });
  it("wide intervals and chords stay between G3 and C6, where a phone speaker plays them", () => {
    for (const set of ["level=6&wide=1&dir=up", "level=6&wide=1&dir=down", "kind=chord"]) {
      const rand = seeded(3);
      for (let i = 0; i < 300; i++) assert.ok(nextEarQuestion(q(set), rand).midi.every((m) => m >= 55 && m <= 84), set);
    }
  });
  it("a single-interval set does not hang", () => {
    const s = q("set=7");
    const a = nextEarQuestion(s, seeded(1));
    assert.equal(nextEarQuestion(s, seeded(2), a).answer, "P5");
  });
  it("chords are played together with the right notes", () => {
    const s = q("kind=chord");
    const n = nextEarQuestion(s, seeded(5));
    const c = CHORD_QUALITIES.find((x) => x.id === n.answer)!;
    assert.equal(n.together, true);
    assert.deepEqual(n.midi.map((m) => m - n.midi[0]), c.semis);
  });
  it("keeps a score per answer", () => {
    let sc = recordScore({}, "P5", true);
    sc = recordScore(sc, "P5", false);
    assert.deepEqual(sc.P5, { right: 1, total: 2 });
  });
});

describe("chord qualities", () => {
  it("a set replaces the default five, in the game's own order; unknown ones are left out", () => {
    assert.deepEqual(q("kind=chord&qualities=aug,dim,nope,maj").qualities, ["maj", "dim", "aug"]);
    assert.deepEqual(activeAnswers(q("kind=chord&qualities=aug,dim,nope,maj")), ["maj", "dim", "aug"]);
    assert.equal(q("kind=chord&qualities=nope").qualities, null);
    assert.deepEqual(activeAnswers(q("kind=chord&qualities=nope")), DEFAULT_QUALITIES);
  });
  it("has the kinds MissingTools3 names, each with its own notes, the root lowest", () => {
    for (const id of ["dim", "aug", "sus2", "sus4", "add9", "9", "13", "dim7"]) assert.ok(CHORD_QUALITIES.some((c) => c.id === id), id);
    assert.equal(new Set(CHORD_QUALITIES.map((c) => c.id)).size, CHORD_QUALITIES.length);
    assert.equal(new Set(CHORD_QUALITIES.map((c) => c.semis.join())).size, CHORD_QUALITIES.length);
    for (const c of CHORD_QUALITIES) assert.ok(c.semis[0] === 0 && c.semis.every((v, i) => !i || v > c.semis[i - 1]), c.id);
  });
  it("every kind is asked with its notes, between G3 and C6", () => {
    const s = q(`kind=chord&qualities=${CHORD_QUALITIES.map((c) => c.id).join(",")}`);
    const rand = seeded(9);
    const seen = new Set<string>();
    let prev: EarQuestion | undefined;
    for (let i = 0; i < 400; i++) {
      const n = nextEarQuestion(s, rand, prev);
      assert.deepEqual(n.midi.map((m) => m - n.midi[0]), CHORD_QUALITIES.find((c) => c.id === n.answer)!.semis);
      assert.ok(n.midi.every((m) => m >= 55 && m <= 84), `${n.answer}: ${n.midi}`);
      assert.equal(n.chords, undefined);
      seen.add(n.answer);
      prev = n;
    }
    assert.equal(seen.size, CHORD_QUALITIES.length);
  });
});

describe("chord changes", () => {
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const NAMES = ["C", "D", "E", "F", "G", "A", "B"];
  it("the chords of the key are the ones the theory pages work out", () => {
    assert.deepEqual(KEY_CHORDS.map((c) => c.numeral), ["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    KEY_CHORDS.forEach((c, d) => {
      const a = analyseDegree(MAJOR, NAMES, d);
      assert.equal(c.numeral, a.roman);
      assert.equal(c.degree, d + 1);
      assert.equal(c.semis, MAJOR[d]);
      assert.deepEqual(c.triad, { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6] }[a.tri as "maj" | "min" | "dim"]);
    });
  });
  it("levels are cumulative: IV and V, then vi, then the rest; never I", () => {
    assert.deepEqual(CHANGE_LEVELS.map((l) => l.n), [1, 2, 3, 4, 5]);
    assert.deepEqual(activeAnswers(q("kind=change")), ["IV", "V"]);
    assert.deepEqual(activeAnswers(q("kind=change&level=2")), ["IV", "V", "vi"]);
    assert.deepEqual(activeAnswers(q("kind=change&level=3")), ["ii", "IV", "V", "vi"]);
    assert.deepEqual(activeAnswers(q("kind=change&level=5")), ["ii", "iii", "IV", "V", "vi", "vii°"]);
    assert.deepEqual(activeAnswers(q("kind=change&level=6")), activeAnswers(q("kind=change&level=5")));
    assert.deepEqual(levelChords(2).map((c) => c.degree), [4, 5, 6]);
    assert.equal(earKindOf("kind=change&level=2"), "change");
    assert.equal(earKindOf("level=2"), "interval");
    assert.equal(earKindOf("kind=nope"), "interval");
  });
  it("a question is the I chord, then the answer's chord in the same key, between G3 and C6, no answer twice in a row", () => {
    const s = q("kind=change&level=5");
    const rand = seeded(7);
    const seen = new Set<string>(), homes = new Set<number>();
    let prev: EarQuestion | undefined;
    for (let i = 0; i < 400; i++) {
      const n = nextEarQuestion(s, rand, prev);
      const c = KEY_CHORDS.find((x) => x.numeral === n.answer)!;
      assert.equal(n.chords?.length, 2);
      const [home, second] = n.chords!;
      assert.deepEqual(home.map((m) => m - home[0]), [0, 4, 7]);
      assert.equal(second[0] - home[0], c.semis);
      assert.deepEqual(second.map((m) => m - second[0]), c.triad);
      assert.deepEqual(n.midi, [...home, ...second]);
      assert.ok(n.midi.every((m) => m >= 55 && m <= 84), `${n.answer}: ${n.midi}`);
      // every note is in the key
      assert.ok(n.midi.every((m) => MAJOR.includes((m - home[0]) % 12)), n.answer);
      if (prev) assert.notEqual(n.answer, prev.answer);
      seen.add(n.answer);
      homes.add(home[0]);
      prev = n;
    }
    assert.deepEqual([...seen].sort(), activeAnswers(s).sort());
    assert.ok(homes.size > 3, "the key changes between questions");
  });
  it("level 1 asks only IV and V", () => {
    const rand = seeded(2);
    for (let i = 0; i < 50; i++) assert.ok(["IV", "V"].includes(nextEarQuestion(q("kind=change"), rand).answer));
  });
});

describe("ear game span", () => {
  it("stays inside an octave unless wide", () => {
    for (let i = 0; i < 200; i++) {
      const n = nextEarQuestion(q("level=6"), seeded(i + 1));
      assert.ok(Math.abs(n.midi[1] - n.midi[0]) <= 12);
    }
  });
  it("wide sometimes adds an octave and keeps the simple name", () => {
    const spans = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const n = nextEarQuestion(q("level=6&wide=1"), seeded(i + 1));
      const d = Math.abs(n.midi[1] - n.midi[0]);
      assert.equal(d % 12 === 0 ? 12 : d % 12, semisOf(n.answer));
      spans.add(d > 12 ? 1 : 0);
    }
    assert.equal(spans.size, 2);
  });
});
