import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VOICES } from "@/features/theory/singing";
import { docOf } from "../../docs";
import { clampCents, describeRound, makeRound, verdictOf } from "../tuning-ears/rounds";
import { OPEN_STRINGS, drillNotes, stringsInRange } from "./strings";

describe("stringsInRange", () => {
  it("keeps the strings' own octave for a bass", () => assert.deepEqual(stringsInRange(VOICES.bass), OPEN_STRINGS));
  it("puts every string inside each voice, keeping each string's note", () => {
    for (const v of Object.values(VOICES)) {
      const m = stringsInRange(v);
      m.forEach((n, i) => {
        assert.ok(n >= v.low && n <= v.high, `${v.label} ${n}`);
        assert.equal(n % 12, OPEN_STRINGS[i] % 12);
      });
    }
  });
  it("moves the whole set by octaves when it fits", () => assert.deepEqual(stringsInRange({ low: 52, high: 76 }), OPEN_STRINGS.map((m) => m + 12)));
});

describe("drillNotes", () => {
  it("strings: up and back, end to end", () => {
    const n = drillNotes("strings", VOICES.bass);
    assert.deepEqual(n.map((x) => x.midi), [40, 45, 50, 55, 59, 64, 59, 55, 50, 45, 40]);
    n.forEach((x, i) => assert.equal(x.at, i * x.beats));
  });
  it("pairs: each two neighbouring strings, fourths and a G-B third", () => {
    const n = drillNotes("pairs", VOICES.bass);
    const steps = [0, 2, 4, 6, 8].map((i) => n[i + 1].midi - n[i].midi);
    assert.deepEqual(steps, [5, 5, 5, 4, 5]);
  });
  it("fifth-fret: the same note twice, the 4th fret on G", () => {
    const n = drillNotes("fifth-fret", VOICES.bass);
    for (let i = 0; i < n.length; i += 2) assert.equal(n[i].midi, n[i + 1].midi);
    assert.equal(n[6].label, "3rd·4");
    assert.equal(n[0].label, "6th·5");
  });
});

describe("tuning-ears rounds", () => {
  it("clamps cents", () => {
    assert.equal(clampCents(undefined), 20);
    assert.equal(clampCents(1), 3);
    assert.equal(clampCents(80), 50);
  });
  it("makes flat, in-tune and sharp rounds on the 5th-fret reference", () => {
    const seq = (xs: number[]) => () => xs.shift()!;
    const flat = makeRound(10, seq([0, 0]));
    assert.deepEqual(flat, { string: 0, fret: 5, midi: 45, off: -10 });
    assert.equal(verdictOf(flat), "flat");
    const g = makeRound(10, seq([0.7, 0.5]));
    assert.deepEqual(g, { string: 3, fret: 4, midi: 59, off: 0 });
    assert.equal(verdictOf(g), "in-tune");
    assert.equal(describeRound(g), "3rd string, 4th fret → 2nd string open");
    assert.equal(verdictOf(makeRound(10, seq([0.9, 0.9]))), "sharp");
  });
  it("documents both basics", () => {
    for (const n of ["string-singer", "tuning-ears"]) assert.equal(docOf(n)?.kind, "basic", n);
  });
});
