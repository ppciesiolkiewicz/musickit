import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SINGING_SCALE, parseSingingLink, singingQuery } from "./singingLink";
import { DEFAULT_KEY_PC } from "./theory";
import { BOOK, RUNS } from "./singingMelodies";

const parse = (s: string) => parseSingingLink(new URLSearchParams(s));

describe("the singing page's link", () => {
  it("reads a melody in a key and a scale", () => {
    assert.deepEqual(parse("melody=3&key=f-sharp&scale=dorian"), { tonicPc: 6, scale: "dorian", melody: 3, full: false });
    assert.equal(parse("melody=3&full=1").full, true);
    assert.equal(parse("full=1").full, false);
  });

  it("falls back to the defaults on anything unreadable", () => {
    const fallback = { tonicPc: DEFAULT_KEY_PC, scale: DEFAULT_SINGING_SCALE, melody: null, full: false };
    assert.deepEqual(parse(""), fallback);
    assert.deepEqual(parse("melody=0&key=h&scale=nope"), fallback);
    assert.deepEqual(parse(`melody=${BOOK.length + RUNS.length + 1}`), fallback);
    assert.deepEqual(parse("melody=1.5"), fallback);
  });

  it("writes what it reads back", () => {
    for (const l of [
      { tonicPc: 10, scale: "natural-minor-aeolian", melody: 7, full: true },
      { tonicPc: 10, scale: "natural-minor-aeolian", melody: 7, full: false },
      { tonicPc: 0, scale: DEFAULT_SINGING_SCALE, melody: null, full: false },
    ])
      assert.deepEqual(parseSingingLink(new URLSearchParams(singingQuery(l))), l);
    assert.equal(singingQuery({ tonicPc: 2, scale: "major-ionian", melody: 12, full: true }), "melody=12&full=1&key=d&scale=major-ionian");
  });
});
