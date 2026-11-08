import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHORD_QUALITIES, EAR_LEVELS, activeAnswers, nextEarQuestion, parseEarSettings, recordScore, type EarQuestion, playedInterval, playedNotes } from "./earGame";
import { INTERVALS } from "@/lib/chordKit/intervals";

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const q = (s: string) => parseEarSettings(new URLSearchParams(s));
const semisOf = (short: string) => INTERVALS.find((i) => i.short === short)!.semis;

describe("ear game settings", () => {
  it("levels are cumulative", () => {
    assert.deepEqual(EAR_LEVELS.map((l) => l.n), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(activeAnswers(q("level=1")).sort(), ["P5", "P8"]);
    assert.deepEqual(activeAnswers(q("level=3")).map(semisOf).sort((a, b) => a - b), [2, 3, 4, 5, 7, 12]);
    assert.equal(activeAnswers(q("level=6")).length, 12);
  });
  it("parses and falls back", () => {
    assert.deepEqual(q(""), { level: 1, custom: null, direction: "up", kind: "interval", wide: false });
    assert.equal(q("level=9").level, 1);
    assert.deepEqual(q("set=7,12,99").custom, [7, 12]);
    assert.equal(q("set=abc").custom, null);
    assert.equal(q("dir=down").direction, "down");
    assert.equal(q("kind=chord").kind, "chord");
    assert.equal(q("wide=1").wide, true);
    assert.deepEqual(activeAnswers(q("kind=chord")), CHORD_QUALITIES.map((c) => c.id));
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
        assert.ok(n.midi.every((m) => m >= 36 && m <= 84));
        if (prev) assert.notEqual(n.answer, prev.answer);
        prev = n;
      }
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

const feed = (readings: [number | null, number, boolean?][], start = playedNotes.initial) =>
  readings.reduce((s, [m, at, gated]) => playedNotes.step(s, m, at, gated), start);

it("a played note counts once it has held, and a pluck's wobble does not", () => {
  assert.deepEqual(feed([[57, 0], [58, 40], [57, 80], [57, 150]]).notes, []);
  assert.deepEqual(feed([[57, 0], [57, 200]]).notes, [57]);
});

it("a note ringing on is one note, and two different notes make the answer", () => {
  assert.deepEqual(feed([[57, 0], [57, 200], [57, 400], [57, 600]]).notes, [57]);
  assert.deepEqual(feed([[57, 0], [57, 200], [null, 300], [64, 400], [64, 600]]).notes, [57, 64]);
});

it("nothing counts while the question sounds", () => {
  assert.deepEqual(feed([[60, 0, true], [64, 200, true]]).notes, []);
});

it("a string left ringing is ignored until it stops, then it counts", () => {
  const ringing: [number | null, number, boolean?][] = [[60, 0, true], [60, 100], [60, 400]];
  assert.deepEqual(feed(ringing).notes, []);
  assert.deepEqual(feed([...ringing, [null, 500], [60, 600], [60, 800]]).notes, [60]);
  assert.deepEqual(feed([...ringing, [67, 500], [67, 700]]).notes, [67]);
});

it("the gap is named the same up or down, and wide gaps as the simple interval", () => {
  assert.equal(playedInterval(57, 64), "P5");
  assert.equal(playedInterval(64, 57), "P5");
  assert.equal(playedInterval(48, 60), "P8");
  assert.equal(playedInterval(48, 62), "M2");
  assert.equal(playedInterval(48, 72), "P8");
});
