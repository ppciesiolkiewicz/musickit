import { test } from "node:test";
import assert from "node:assert/strict";
import { CIRCLE, chordsInScaleOrder, circleChords, fifthsPosition, majorSignature, neighbours, relativeMajor, relativeMinor, signatureNotes, signatureText } from "./circle";

test("circle order and signatures", () => {
  assert.deepEqual(CIRCLE.map((t) => t.name).slice(0, 4), ["C", "G", "D", "A"]);
  assert.equal(fifthsPosition(5), 11);
  assert.deepEqual([0, 7, 2, 5, 10, 1, 6].map(majorSignature), [0, 1, 2, -1, -2, -5, 6]);
  assert.deepEqual(signatureNotes(2), ["F♯", "C♯"]);
  assert.deepEqual(signatureNotes(-3), ["B♭", "E♭", "A♭"]);
  assert.equal(signatureText(0), "no ♯ ♭");
  assert.equal(signatureText(-4), "4♭");
});

test("relatives", () => {
  assert.equal(relativeMinor(0), 9);
  assert.equal(relativeMajor(9), 0);
});

test("chords of C major on the circle", () => {
  assert.deepEqual(chordsInScaleOrder({ pc: 0, minor: false }).map((c) => c.name), ["C", "Dm", "Em", "F", "G", "Am", "B°"]);
  const all = circleChords({ pc: 0, minor: false });
  assert.equal(all.find((c) => c.roman === "IV")!.pos, 11);
  assert.equal(all.find((c) => c.roman === "V")!.pos, 1);
});

test("chords of A minor are the same chords from A", () => {
  assert.deepEqual(chordsInScaleOrder({ pc: 9, minor: true }).map((c) => `${c.roman}:${c.name}`), ["i:Am", "ii°:B°", "III:C", "iv:Dm", "v:Em", "VI:F", "VII:G"]);
});

test("neighbours", () => {
  const n = neighbours({ pc: 2, minor: true });
  assert.deepEqual(n.dominant, { pc: 9, minor: true });
  assert.deepEqual(n.subdominant, { pc: 7, minor: true });
});
