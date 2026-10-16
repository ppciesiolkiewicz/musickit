import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKey, spellNote } from "./key";
import { place, signatureGlyphs } from "./staff";

const C = makeKey(0, "major");
const D = makeKey(2, "major");
const F = makeKey(5, "major");

test("clef choice", () => {
  assert.deepEqual(place(spellNote(C, 60), 0), { clef: "treble", step: -2, accidental: null, ledgers: [-2] });
  assert.deepEqual(place(spellNote(C, 59), 0), { clef: "bass", step: 9, accidental: null, ledgers: [] });
  assert.equal(place(spellNote(C, 64), 0).step, 0);
  assert.equal(place(spellNote(C, 77), 0).step, 8);
  assert.equal(place(spellNote(C, 43), 0).step, 0);
  assert.equal(place(spellNote(C, 57), 0).step, 8);
});

test("ledger lines", () => {
  const hi = place(spellNote(C, 96), 0);
  assert.equal(hi.clef, "treble");
  assert.equal(hi.step, 19);
  assert.deepEqual(hi.ledgers, [10, 12, 14, 16, 18]);
  const lo = place(spellNote(C, 24), 0);
  assert.equal(lo.clef, "bass");
  assert.equal(lo.step, -11);
  assert.deepEqual(lo.ledgers, [-2, -4, -6, -8, -10]);
});

test("accidentals vs signature", () => {
  assert.equal(place(spellNote(D, 66), D.signature).accidental, null);
  assert.equal(place(spellNote(D, 65), D.signature).accidental, "♮");
  assert.equal(place(spellNote(D, 68), D.signature).accidental, "♯");
  assert.equal(place(spellNote(F, 70), F.signature).accidental, null);
  assert.equal(place(spellNote(C, 70), 0).accidental, "♭");
});

test("signature glyphs", () => {
  assert.deepEqual(signatureGlyphs(2, "treble"), [{ glyph: "♯", step: 8 }, { glyph: "♯", step: 5 }]);
  assert.deepEqual(signatureGlyphs(-3, "bass"), [{ glyph: "♭", step: 2 }, { glyph: "♭", step: 5 }, { glyph: "♭", step: 1 }]);
  assert.deepEqual(signatureGlyphs(0, "treble"), []);
  assert.equal(signatureGlyphs(7, "bass").length, 7);
});
