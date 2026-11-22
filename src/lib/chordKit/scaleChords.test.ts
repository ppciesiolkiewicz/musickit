import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext } from "@/features/theory/theory";
import { positionsFor } from "./scalePositions";
import { degreeOfNumeral, diatonicDyads, dyadLadder, dyadPairId, dyadPairOf, dyadPairs, dyadWalk, positionTriads, stringGroupOf, voicingKeys } from "./scaleChords";
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
