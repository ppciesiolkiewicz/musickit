import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { positionsFor } from "./scalePositions";
import { INTERVAL_STEPS, degreeOfNumeral, diatonicDyads, dyadLadder, intervalFits, intervalPairs, intervalWalk, type IntervalSize, dyadPairId, dyadPairOf, dyadPairs, dyadWalk, positionTriads, stringGroupOf, voicingKeys } from "./scaleChords";
import { STRING_GROUPS } from "./triads";

const C_MAJOR = makeKeyContext(0, 0, 0);
const A_MINOR = makeKeyContext(9, 0, 5);
const G321 = STRING_GROUPS.find((g) => g.id === "321")!;

describe("diatonic double stops", () => {
  it("3rds of C major on the B and e strings: C-E at frets 1-0, then D-F at 3-1", () => {
    const d = diatonicDyads(C_MAJOR, 3, [4, 5]);
    assert.deepEqual(d.filter((x) => x.degree === 0).map((x) => x.frets), [[1, 0], [13, 12]]);
    assert.deepEqual(d.find((x) => x.degree === 1)!.frets, [3, 1]);
  });
  it("a diatonic 3rd is major or minor as the scale says", () => {
    const d = diatonicDyads(C_MAJOR, 3, [4, 5]);
    const size = (deg: number) => d.find((x) => x.degree === deg)!.semis;
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(size), [4, 3, 3, 4, 4, 3, 3]);
  });
  it("6ths sit on strings one apart; a 4th from the 4th degree is the tritone", () => {
    assert.deepEqual(dyadPairs(6), [[0, 2], [1, 3], [2, 4], [3, 5]]);
    assert.deepEqual(dyadPairs(3).length, 5);
    assert.ok(diatonicDyads(C_MAJOR, 4, [3, 4]).filter((x) => x.degree === 3).every((x) => x.semis === 6));
    assert.ok(diatonicDyads(C_MAJOR, 6, [3, 5]).every((x) => x.semis === 8 || x.semis === 9));
  });
  it("every pair stays within 4 frets", () => {
    for (const [lo, hi] of dyadPairs(6)) for (const x of diatonicDyads(A_MINOR, 6, [lo, hi])) assert.ok(Math.abs(x.frets[0] - x.frets[1]) <= 4);
  });
});

describe("double stops walked up two strings", () => {
  const G_MAJOR = makeKeyContext(7, 0, 0);
  it("the ladder climbs the scale one note at a time, each pair above the last", () => {
    const l = dyadLadder(G_MAJOR, 3, [3, 4]);
    assert.deepEqual(l[0].frets, [0, 0]);
    l.slice(1).forEach((d, i) => {
      assert.equal(d.degree, (l[i].degree + 1) % 7);
      assert.ok(d.midi[0] > l[i].midi[0]);
    });
    // every pair is one `diatonicDyads` found
    const all = diatonicDyads(G_MAJOR, 3, [3, 4]).map((d) => d.frets.join("-"));
    assert.ok(l.every((d) => all.includes(d.frets.join("-"))));
  });
  it("a walk is the ladder between two frets: G major 3rds on the G and B strings, frets 0 to 7", () => {
    assert.deepEqual(dyadWalk(G_MAJOR, 3, [3, 4], 0, 7).map((d) => d.frets), [[0, 0], [2, 1], [4, 3], [5, 5], [7, 7]]);
    assert.deepEqual(dyadWalk(G_MAJOR, 3, [3, 4]), dyadLadder(G_MAJOR, 3, [3, 4]));
    const mid = dyadWalk(G_MAJOR, 3, [3, 4], 5, 12);
    assert.ok(mid.length > 0 && mid.every((d) => Math.min(...d.frets) >= 5 && Math.max(...d.frets) <= 12));
    assert.deepEqual(dyadWalk(C_MAJOR, 6, [3, 5], 0, 7).map((d) => d.frets), dyadLadder(C_MAJOR, 6, [3, 5]).filter((d) => Math.max(...d.frets) <= 7).map((d) => d.frets));
  });
  it("a string pair by its guitar numbers, the lower string first", () => {
    assert.equal(dyadPairId([3, 4]), "32");
    assert.deepEqual(dyadPairOf("32", 3), [3, 4]);
    assert.deepEqual(dyadPairOf("31", 6), [3, 5]);
    assert.equal(dyadPairOf("32", 6), null);
    assert.equal(dyadPairOf("31", 3), null);
    assert.deepEqual(dyadPairs(3).map(dyadPairId), ["65", "54", "43", "32", "21"]);
    assert.deepEqual(dyadPairs(6).map(dyadPairId), ["64", "53", "42", "31"]);
  });
});

describe("degrees from numerals", () => {
  it("reads numerals in any case, with flats and ° marks, and 1-7", () => {
    assert.deepEqual(["i", "iv", "bVII", "♭VII", "ii°", "V", "7"].map(degreeOfNumeral), [0, 3, 6, 6, 1, 4, 6]);
    assert.equal(degreeOfNumeral("x"), null);
    assert.equal(degreeOfNumeral("8"), null);
  });
});

describe("triads inside a position", () => {
  // A minor position 1 (frets 4-8): the theory calculator's E shape of Am
  const box = positionsFor(A_MINOR, "scale").find((p) => p.from <= 5 && p.to >= 8 && p.notes.some((c) => c.string === 0 && c.fret === 5))!;
  it("finds Am, Dm, F and G on the top strings of A minor at the 5th fret", () => {
    const t = positionTriads(A_MINOR, box, G321);
    const at = (name: string) => t.find((x) => x.name === name)!.voicings.map((v) => v.frets.join("-"));
    assert.ok(at("Am").includes("5-5-5"));
    assert.ok(at("Dm").includes("7-6-5"));
    assert.ok(at("F").includes("5-6-5"));
    assert.ok(at("G").includes("7-8-7"));
  });
  it("keeps only voicings drawn in the position, and the degrees asked for", () => {
    const have = new Set(box.notes.map((c) => `${c.string}-${c.fret}`));
    const t = positionTriads(A_MINOR, box, G321, [0, 3, 6]);
    assert.deepEqual(t.map((x) => x.roman), ["i", "iv", "♭VII"]);
    for (const x of t) for (const v of x.voicings) assert.ok(voicingKeys(v).every((k) => have.has(k)));
  });
  it("a pentatonic position has no iv chord in A minor (no F)", () => {
    const pent = positionsFor(A_MINOR, "pentatonic")[0];
    const iv = positionTriads(A_MINOR, pent, G321, [3])[0];
    assert.equal(iv.voicings.length, 0);
  });
  it("reads string sets by guitar numbers", () => {
    assert.equal(stringGroupOf("432")?.strings.join(), "2,3,4");
    assert.equal(stringGroupOf("21"), null);
  });
});

describe("5ths", () => {
  it("are perfect but for one: the 7th degree's is diminished", () => {
    const d = diatonicDyads(C_MAJOR, 5, [3, 4]);
    const size = (deg: number) => d.find((x) => x.degree === deg)!.semis;
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(size), [7, 7, 7, 7, 7, 7, 6]);
    assert.deepEqual(dyadPairs(5).length, 5);
  });
});

describe("an interval as a shape, one note after the other", () => {
  const G_MAJOR = makeKeyContext(7, 0, 0);
  const SIZES = Object.keys(INTERVAL_STEPS).map(Number) as IntervalSize[];
  it("on two strings it is the double stop's own frets: one code finds both", () => {
    for (const size of [3, 4, 5, 6] as const) for (const pair of dyadPairs(size)) {
      if (!intervalFits(G_MAJOR, size, pair)) continue;
      const frets = (list: { frets: [number, number] }[]) => list.map((d) => d.frets.join("-")).sort();
      assert.deepEqual(frets(intervalPairs(G_MAJOR, size, pair)), frets(diatonicDyads(G_MAJOR, size, pair)), `${size} on ${dyadPairId(pair)}`);
    }
  });
  it("the shapes a guitarist knows: the octave two strings over, the 5th and the 4th on the next string", () => {
    const from = (size: IntervalSize, pair: [number, number], fret: number) => intervalPairs(G_MAJOR, size, pair).find((d) => d.degree === 0 && d.frets[0] === fret)?.frets;
    // G at fret 3 of the low E: its octave two frets up on the D string, its 5th two frets up on the A string, its 4th on the same fret
    assert.deepEqual(from(8, [0, 2], 3), [3, 5]);
    assert.deepEqual(from(5, [0, 1], 3), [3, 5]);
    assert.deepEqual(from(4, [0, 1], 3), [3, 3]);
    // across the G and B strings every shape shifts a fret: the octave from G on the D string, and from the open G string
    assert.deepEqual(from(8, [2, 4], 5), [5, 8]);
    assert.deepEqual(from(8, [3, 5], 0), [0, 3]);
    // along one string an octave is 12 frets
    assert.deepEqual(from(8, [0, 0], 3), [3, 15]);
  });
  it("every pair is the scale's own notes, the right number of scale steps apart, low to high", () => {
    const pcs = new Set(G_MAJOR.steps.map((s) => (G_MAJOR.tonic.pc + s) % 12));
    for (const size of SIZES) for (let lo = 0; lo < 6; lo++) for (let hi = lo; hi < 6; hi++) {
      const pairs = intervalPairs(G_MAJOR, size, [lo, hi]);
      assert.equal(pairs.length > 0, intervalFits(G_MAJOR, size, [lo, hi]) , `${size} ${lo}${hi}`);
      for (const d of pairs) {
        assert.ok(pcs.has(d.midi[0] % 12) && pcs.has(d.midi[1] % 12));
        assert.equal(d.upper, (d.degree + INTERVAL_STEPS[size]) % 7);
        assert.ok(d.midi[1] > d.midi[0] && d.semis === d.midi[1] - d.midi[0]);
        assert.ok(lo === hi || Math.abs(d.frets[0] - d.frets[1]) <= 4);
        assert.ok(d.frets.every((f) => f >= 0 && f <= 17));
      }
      assert.deepEqual(pairs.map((d) => d.midi[0]), pairs.map((d) => d.midi[0]).sort((a, b) => a - b));
    }
  });
  it("which strings hold which interval within 4 frets", () => {
    const held = (size: IntervalSize) => [[0, 1], [3, 4], [0, 2], [2, 4]].map((p) => intervalFits(G_MAJOR, size, p as [number, number]));
    //                                   next    3 and 2  two over  4 and 2
    assert.deepEqual(held(2), [true, true, false, false]);
    assert.deepEqual(held(3), [true, true, false, false]);
    assert.deepEqual(held(4), [true, true, false, true]);
    assert.deepEqual(held(5), [true, true, true, true]);
    assert.deepEqual(held(6), [true, false, true, true]);
    assert.deepEqual(held(7), [false, false, true, true]);
    assert.deepEqual(held(8), [false, false, true, true]);
    // the upper note's string is never the lower one
    assert.equal(intervalFits(G_MAJOR, 5, [1, 0]), false);
    assert.deepEqual(intervalPairs(G_MAJOR, 8, [0, 1]), []);
  });
  it("the walk keeps the pairs whose lower note sits between two frets", () => {
    const walk = intervalWalk(G_MAJOR, 8, [0, 2], 0, 7);
    assert.deepEqual(walk.map((d) => d.frets), [[0, 2], [2, 4], [3, 5], [5, 7], [7, 9]]);
    assert.deepEqual(intervalWalk(G_MAJOR, 8, [0, 2]), intervalPairs(G_MAJOR, 8, [0, 2]));
  });
});
