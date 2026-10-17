import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKey, spellAs, spellNote } from "./key";

test("signatures", () => {
  assert.equal(makeKey(2, "major").signature, 2);
  assert.equal(makeKey(2, "major").tonic, "D");
  assert.equal(makeKey(5, "major").signature, -1);
  assert.equal(makeKey(5, "major").tonic, "F");
  assert.equal(makeKey(9, "minor").signature, 0);
  assert.equal(makeKey(2, "dorian").signature, 0);
  assert.equal(makeKey(0, "harmonicMinor").signature, -3);
  assert.equal(makeKey(9, "majorPentatonic").signature, 3);
  assert.equal(makeKey(0, "chromatic").signature, 0);
});

test("enharmonic tonics", () => {
  const cases: [number, Parameters<typeof makeKey>[1], string, number][] = [
    [3, "dorian", "E♭", -5],
    [8, "minor", "G♯", 5],
    [3, "minor", "E♭", -6],
    [6, "major", "F♯", 6],
    [1, "major", "D♭", -5],
  ];
  for (const [pc, scale, tonic, sig] of cases) {
    const k = makeKey(pc, scale);
    assert.equal(k.tonic, tonic, `${pc} ${scale}`);
    assert.equal(k.signature, sig, `${pc} ${scale}`);
  }
});

test("spelling in key", () => {
  const f = makeKey(5, "major");
  assert.equal(spellNote(f, 70).name, "B♭");
  assert.equal(spellNote(f, 70).degree, "4");
  const d = makeKey(2, "major");
  const fs = spellNote(d, 66);
  assert.equal(fs.name, "F♯");
  assert.equal(fs.degree, "3");
  assert.equal(fs.octave, 4);
});

test("outside the key", () => {
  const c = makeKey(0, "major");
  const got = [61, 63, 66, 68, 70].map((m) => [spellNote(c, m).name, spellNote(c, m).degree]);
  assert.deepEqual(got, [["D♭", "♭2"], ["E♭", "♭3"], ["F♯", "♯4"], ["A♭", "♭6"], ["B♭", "♭7"]]);
  const cm = makeKey(0, "minor");
  assert.equal(spellNote(cm, 63).name, "E♭");
  assert.equal(spellNote(cm, 63).degree, "3");
  assert.deepEqual([64, 69, 71].map((m) => [spellNote(cm, m).name, spellNote(cm, m).degree]), [["E", "♯3"], ["A", "♯6"], ["B", "♯7"]]);
});

test("a note outside the key has the same degree in every key", () => {
  // the same five chromatic degrees, whatever the key: ♭2 ♭3 ♯4 ♭6 ♭7
  for (let pc = 0; pc < 12; pc++) {
    const k = makeKey(pc, "major");
    assert.deepEqual([1, 3, 6, 8, 10].map((s) => spellNote(k, 60 + pc + s).degree), ["♭2", "♭3", "♯4", "♭6", "♭7"], k.tonic);
  }
  assert.equal(spellNote(makeKey(8, "major"), 69).name, "B𝄫"); // A in A♭ major is its ♭2
  assert.equal(spellNote(makeKey(11, "major"), 65).name, "E♯"); // F in B major is its ♯4
});

test("pentatonic degrees", () => {
  const k = makeKey(0, "majorPentatonic");
  assert.equal(spellNote(k, 69).degree, "6");
  assert.equal(k.scalePcs.size, 5);
  assert.equal(spellNote(k, 65).name, "F");
  assert.equal(spellNote(k, 65).degree, "4");
  assert.equal(k.scalePcs.has(5), false);
});

test("forced letter", () => {
  const k = makeKey(0, "major");
  const gs = spellAs(k, 68, "G");
  assert.equal(gs.name, "G♯");
  assert.equal(gs.degree, "♯5");
});

test("octave follows the letter", () => {
  const k = makeKey(0, "major");
  assert.equal(spellAs(k, 60, "B").octave, 3);
  assert.equal(spellAs(k, 71, "C").octave, 5);
});
