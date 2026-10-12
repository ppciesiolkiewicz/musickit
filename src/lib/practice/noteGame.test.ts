import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_NOTE_SETTINGS, isCorrect, nextNoteQuestion, noteSettingsQuery, parseNoteSettings, pcName, positionsOf, recordHeat, stablePitch, type NoteQuestion } from "./noteGame";

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const q = (s: string) => parseNoteSettings(new URLSearchParams(s));

describe("note game settings", () => {
  it("defaults and parsing", () => {
    assert.deepEqual(q(""), DEFAULT_NOTE_SETTINGS);
    assert.deepEqual(q("strings=E,A").strings, [0, 1]);
    assert.deepEqual(q("strings=e,B").strings, [5, 4]);
    assert.deepEqual(q("strings=0,3").strings, [0, 3]);
    assert.deepEqual(q("strings=9").strings, DEFAULT_NOTE_SETTINGS.strings);
    const s = q("from=8&to=3");
    assert.ok(s.from <= s.to && s.from >= 0 && s.to <= 15);
    assert.equal(q("from=-4&to=99").to, 15);
    assert.equal(q("mode=every").mode, "every");
    assert.equal(q("mode=zzz").mode, "find");
    assert.equal(q("naturals=0").naturals, false);
    assert.deepEqual(q(noteSettingsQuery({ ...DEFAULT_NOTE_SETTINGS, strings: [2, 3], from: 5, to: 9, naturals: false, flats: true, mode: "name" })), { mode: "name", strings: [2, 3], from: 5, to: 9, naturals: false, flats: true });
  });
  it("names notes with sharps or flats", () => {
    assert.equal(pcName(1, false), "C♯");
    assert.equal(pcName(1, true), "D♭");
    assert.equal(pcName(0, true), "C");
  });
});

describe("note game questions", () => {
  it("are answerable, natural when asked, and never repeat back to back", () => {
    const s = DEFAULT_NOTE_SETTINGS;
    const rand = seeded(7);
    let prev: NoteQuestion | undefined;
    for (let i = 0; i < 200; i++) {
      const n = nextNoteQuestion(s, rand, prev);
      assert.ok(positionsOf(n.pc, s).some((p) => p.string === n.string), "answerable");
      assert.ok([0, 2, 4, 5, 7, 9, 11].includes(n.pc));
      if (prev) assert.ok(!(prev.pc === n.pc && prev.string === n.string), "no repeat");
      prev = n;
    }
  });
  it("name mode gives a fret inside the range", () => {
    const s = { ...DEFAULT_NOTE_SETTINGS, mode: "name" as const, from: 3, to: 7 };
    const n = nextNoteQuestion(s, seeded(3));
    assert.ok(n.fret !== undefined && n.fret >= 3 && n.fret <= 7);
  });
  it("one string, one fret does not hang", () => {
    const s = { ...DEFAULT_NOTE_SETTINGS, strings: [0], from: 0, to: 0, naturals: true };
    const a = nextNoteQuestion(s, seeded(1));
    const b = nextNoteQuestion(s, seeded(2), a);
    assert.deepEqual([a.pc, b.pc], [4, 4]);
  });
  it("checks answers", () => {
    const s = DEFAULT_NOTE_SETTINGS;
    assert.equal(isCorrect({ pc: 7, string: 0 }, s, 0, 3), true);
    assert.equal(isCorrect({ pc: 7, string: 0 }, s, 1, 10), false);
    assert.equal(isCorrect({ pc: 7, string: 0 }, { ...s, mode: "every" }, 1, 10), true);
    assert.equal(isCorrect({ pc: 7, string: 0 }, s, 0, 4), false);
  });
});

describe("mic and heat", () => {
  it("needs a pitch class held long enough", () => {
    const held = Array.from({ length: 11 }, (_, i) => ({ midi: 55, t: i * 20 }));
    assert.equal(stablePitch(held), 7);
    const short = [{ midi: 50, t: 0 }, { midi: 50, t: 80 }, { midi: 55, t: 100 }, { midi: 55, t: 200 }];
    assert.equal(stablePitch(short), null);
    assert.equal(stablePitch([{ midi: 43, t: 0 }, { midi: 55, t: 100 }, { midi: 43, t: 160 }]), 7);
    assert.equal(stablePitch([]), null);
  });
  it("accumulates heat", () => {
    let h = recordHeat({}, 0, 3, true, 1200);
    h = recordHeat(h, 0, 3, false, 3000);
    assert.deepEqual(h["0:3"], { tries: 2, misses: 1, ms: 4200 });
  });
});
