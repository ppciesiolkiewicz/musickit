import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VOICES } from "@/features/theory/singing";
import { longName, nextAsk, placeDo, shortName, signedOf, solfegeOf } from "./asks";

describe("names", () => {
  it("short", () => {
    assert.equal(shortName(7), "P5");
    assert.equal(shortName(-4), "M3");
    assert.equal(shortName(12), "P8");
  });
  it("long", () => {
    assert.equal(longName(7), "perfect 5th up");
    assert.equal(longName(-3), "minor 3rd down");
  });
  it("solfège from Do", () => {
    assert.equal(solfegeOf(7), "Sol");
    assert.equal(solfegeOf(-5), "Sol");
    assert.equal(solfegeOf(12), "Do");
    assert.equal(solfegeOf(3), "Me");
  });
});

describe("signedOf", () => {
  it("by direction", () => {
    assert.deepEqual(signedOf([4, 7], "up"), [4, 7]);
    assert.deepEqual(signedOf([4, 7], "down"), [-4, -7]);
    assert.deepEqual(signedOf([7], "both"), [7, -7]);
  });
});

describe("placeDo", () => {
  it("puts Do on the key's note with every interval in the range", () => {
    for (const v of Object.values(VOICES))
      for (let pc = 0; pc < 12; pc++)
        for (const dir of ["up", "down", "both"] as const) {
          // an octave up and down at once fits a two-octave range only from its middle, and a 5th both ways leaves one key out, so "both" asks up to a 4th
          const p = placeDo(pc, v, dir === "both" ? [3, 4, 5] : [3, 4, 7, 12], dir)!;
          assert.equal(((p.midi % 12) + 12) % 12, pc);
          assert.equal(p.asks.length, dir === "both" ? 6 : 4, `${v.label} ${pc} ${dir}`);
          for (const s of p.asks) assert.ok(p.midi + s >= v.low && p.midi + s <= v.high);
        }
  });
  it("keeps C in the middle of a tenor's range for a fifth up", () => assert.equal(placeDo(0, VOICES.tenor, [7], "up")!.midi, 60));
  it("drops what can't fit", () => {
    // two octaves up and down do not fit in a two-octave range at once
    const p = placeDo(0, VOICES.tenor, [24], "both")!;
    assert.equal(p.asks.length, 1);
  });
});

describe("nextAsk", () => {
  it("never repeats when there is a choice", () => {
    for (let i = 0; i < 20; i++) assert.notEqual(nextAsk([4, 7], Math.random, 7), 7);
  });
  it("repeats the only one", () => assert.equal(nextAsk([7], Math.random, 7), 7));
  it("null for nothing", () => assert.equal(nextAsk([], Math.random, null), null));
});
