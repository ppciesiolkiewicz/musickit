import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKeyContext, TONICS } from "./theory";
import { accidentalsAgainst, majorSignatureOf, scaleSignature } from "./signature";

const sig = (pc: number, family: number, mode: number) => scaleSignature(makeKeyContext(pc, family, mode));

test("major signatures from a spelled tonic", () => {
  assert.deepEqual(["C", "G", "F", "B♭", "F♯", "D♭", "C♭", "G♯"].map(majorSignatureOf), [0, 1, -1, -2, 6, -5, -7, 8]);
});

test("accidentals against a signature", () => {
  assert.deepEqual(accidentalsAgainst(["A", "B", "C", "D", "E", "F", "G♯"], 0), ["G♯"]);
  assert.deepEqual(accidentalsAgainst(["C", "D", "E♭", "F", "G", "A♭", "B"], -3), ["B♮"]);
});

test("modes of the major scale take their parent's signature", () => {
  assert.deepEqual(sig(2, 0, 1), { count: 0, extras: [], major: "C", minor: "A", basis: "parent" }); // D Dorian
  assert.equal(sig(6, 0, 1).count, 4); // F♯ Dorian: E major
  assert.equal(sig(9, 0, 5).count, 0); // A minor
  assert.equal(sig(10, 0, 0).count, -2); // B♭ major
});

test("every major mode in every key fits a signature exactly or says it is the nearest", () => {
  for (const t of TONICS)
    for (let m = 0; m < 7; m++) {
      const s = sig(t.pc, 0, m);
      assert.equal(s.basis === "parent", s.extras.length === 0, `${t.name} mode ${m}`);
      assert.ok(Math.abs(s.count) <= 7);
    }
});

test("harmonic and melodic minor are written in the minor key", () => {
  assert.deepEqual(sig(9, 1, 0), { count: 0, extras: ["G♯"], major: "C", minor: "A", basis: "minor" }); // A harmonic minor
  assert.deepEqual(sig(0, 1, 0).extras, ["B♮"]); // C harmonic minor: 3♭ + B♮
  assert.deepEqual(sig(9, 2, 0).extras, ["F♯", "G♯"]); // A melodic minor
});

test("their modes take the parent minor's signature", () => {
  const s = sig(4, 1, 4); // E Phrygian dominant, mode 5 of A harmonic minor
  assert.equal(s.count, 0);
  assert.deepEqual(s.extras, ["G♯"]);
  assert.equal(s.basis, "parent");
});

test("every scale in every key gets a signature of at most 7", () => {
  for (const t of TONICS)
    for (const [f, n] of [[0, 7], [1, 7], [2, 7], [3, 6]])
      for (let m = 0; m < n; m++) assert.ok(Math.abs(sig(t.pc, f, m).count) <= 7, `${t.name} ${f}/${m}`);
});
