import { test } from "node:test";
import assert from "node:assert/strict";
import { arpTypeOf } from "./arpeggios";

test("arpTypeOf: a chord's arpeggio quality, or null when the arpeggios page has none", () => {
  assert.equal(arpTypeOf("Am"), "min");
  assert.equal(arpTypeOf("C"), "maj");
  assert.equal(arpTypeOf("G7"), "7");
  assert.equal(arpTypeOf("Cmaj7"), "maj7");
  assert.equal(arpTypeOf("Bm7b5"), "m7b5");
  assert.equal(arpTypeOf("Cmaj9"), "ninth");
  assert.equal(arpTypeOf("Am9"), "ninth");
  assert.equal(arpTypeOf("G9"), null);
  assert.equal(arpTypeOf("C13"), null);
  assert.equal(arpTypeOf("nonsense"), null);
});
