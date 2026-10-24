import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, makeKeyContext } from "./theory";
import { ICONIC, iconicChords, iconicFor } from "./iconicProgressions";

describe("iconic progressions", () => {
  it("every one of the 21 modes has a few", () => {
    for (let f = 0; f < 3; f++) for (let m = 0; m < 7; m++) {
      const n = ICONIC[`${f}-${m}`]?.length ?? 0;
      assert.ok(n >= 2 && n <= 4, `${f}-${m} has ${n}`);
    }
  });
  it("only uses degrees that exist, with one quality per chord, and says why", () => {
    for (const [k, list] of Object.entries(ICONIC)) for (const p of list) {
      assert.ok(p.degs.length >= 2 && p.degs.every((d) => Number.isInteger(d) && d >= 0 && d < 7), k);
      if (Array.isArray(p.q)) assert.equal(p.q.length, p.degs.length, k);
      assert.ok(p.why.length > 40, k);
    }
  });
  it("names the chords in the key picked", () => {
    const ctx = makeKeyContext(7, 0, 0);
    const [pop] = iconicFor(ctx);
    assert.deepEqual(iconicChords(ctx, pop).map((c) => c.name), ["G", "D", "Em", "C"]);
    assert.deepEqual(iconicChords(ctx, pop).map((c) => c.roman), ["I", "V", "vi", "IV"]);
    const jazz = iconicChords(ctx, iconicFor(ctx)[2]);
    assert.deepEqual(jazz.map((c) => c.name), ["Am7", "D7", "Gmaj7"]);
    assert.ok(jazz.every((c) => c.notes === 4));
  });
  it("gives the other scales none", () => {
    assert.equal(iconicFor(makeKeyContext(0, 3, 0)).length, 0);
    assert.equal(FAMILIES.length, 4);
  });
});
