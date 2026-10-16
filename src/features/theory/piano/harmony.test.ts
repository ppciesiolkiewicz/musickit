import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKey, spellNote } from "./key";
import { describe, intervalName } from "./harmony";

const C = makeKey(0, "major");
const sp = (m: number) => spellNote(C, m);

test("intervals", () => {
  assert.equal(intervalName(sp(60), sp(64)), "M3");
  assert.equal(intervalName(sp(64), sp(67)), "m3");
  assert.equal(intervalName(sp(60), sp(66)), "TT");
  assert.equal(intervalName(sp(60), sp(76)), "M10");
  assert.equal(intervalName(sp(60), sp(72)), "P8");
  assert.equal(intervalName(sp(64), sp(60)), "M3↓");
  assert.equal(intervalName(sp(60), sp(60)), "P1");
});

test("triads in key", () => {
  const d = describe(makeKey(2, "major"), [62, 66, 69]);
  assert.equal(d.chord?.symbol, "D");
  assert.equal(d.chord?.numeral, "I");
  assert.deepEqual([describe(C, [57, 60, 64]).chord?.symbol, describe(C, [57, 60, 64]).chord?.numeral], ["Am", "vi"]);
  assert.deepEqual([describe(C, [59, 62, 65]).chord?.symbol, describe(C, [59, 62, 65]).chord?.numeral], ["B°", "vii°"]);
  assert.deepEqual([describe(C, [67, 71, 74, 77]).chord?.symbol, describe(C, [67, 71, 74, 77]).chord?.numeral], ["G7", "V7"]);
});

test("borrowed and secondary", () => {
  const bb = describe(C, [58, 62, 65]);
  assert.equal(bb.chord?.symbol, "B♭");
  assert.equal(bb.chord?.numeral, "♭VII");
  const e = describe(C, [64, 68, 71]);
  assert.equal(e.chord?.symbol, "E");
  assert.equal(e.chord?.numeral, "III");
  assert.deepEqual(e.notes.map((n) => n.name), ["E", "G♯", "B"]);
  assert.equal(e.notes[1].degree, "♯5");
});

test("minor key numerals", () => {
  const d = describe(makeKey(0, "minor"), [63, 67, 70]);
  assert.equal(d.chord?.symbol, "E♭");
  assert.equal(d.chord?.numeral, "III");
});

test("inversion", () => {
  const d = describe(C, [64, 67, 72]);
  assert.equal(d.chord?.symbol, "C/E");
  assert.equal(d.chord?.numeral, "I/3");
});

test("ambiguous", () => {
  const d = describe(C, [60, 64, 67, 69]);
  assert.equal(d.chord?.symbol, "C6");
  assert.equal(d.chord?.alt, "Am7/C");
});

test("doubled notes", () => {
  const d = describe(C, [48, 60, 64, 67, 67]);
  assert.equal(d.notes.length, 4);
  assert.equal(d.chord?.symbol, "C");
  assert.equal(d.chord?.numeral, "I");
});

test("dyad", () => {
  const d = describe(C, [60, 67]);
  assert.equal(d.chord, null);
  assert.equal(d.dyad, "P5");
});

test("no match", () => {
  const d = describe(C, [60, 61, 62]);
  assert.equal(d.chord, null);
  assert.equal(d.dyad, null);
  assert.equal(d.notes.length, 3);
});

test("chromatic scale has no numerals", () => {
  const d = describe(makeKey(0, "chromatic"), [60, 64, 67]);
  assert.equal(d.chord?.symbol, "C");
  assert.equal(d.chord?.numeral, null);
});

test("notes sorted low to high", () => {
  assert.deepEqual(describe(C, [67, 60, 64]).notes.map((n) => n.midi), [60, 64, 67]);
});
