import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtInterval, intervalName, noteLabel, scaleToneLabel, spellAbove, toneLabel } from "./labels";
import { makeKeyContext } from "./theory";

test("intervals", () => {
  assert.deepEqual([0, 3, 7, 10, 5, 6, 11].map(intervalName), ["R", "b3", "p5", "b7", "p4", "b5", "7"]);
  assert.equal(intervalName(12), "R");
});
test("formatting", () => {
  assert.equal(fmtInterval("♭3"), "b3");
  assert.equal(fmtInterval("5"), "p5");
  assert.equal(fmtInterval("♯5"), "#5");
  assert.equal(fmtInterval("9"), "9");
  assert.equal(fmtInterval("R"), "R");
});
test("noteLabel", () => {
  const c = { name: "Eb", semi: 3, degreeText: "♭3", role: "3" };
  assert.deepEqual((["note", "interval", "degree", "chord"] as const).map((s) => noteLabel(s, c)), ["Eb", "b3", "b3", "3"]);
  assert.equal(noteLabel("chord", { ...c, role: null }), "b3");
});

test("chord tones in every system", () => {
  // A♭ major triad, no key
  const ab = (semi: number, role: string) => ({ rootPc: 8, rootName: "A♭", semi, role });
  assert.deepEqual([ab(0, "R"), ab(4, "3"), ab(7, "5")].map((t) => toneLabel("note", t)), ["A♭", "C", "E♭"]);
  assert.deepEqual([ab(0, "R"), ab(4, "3"), ab(7, "5")].map((t) => toneLabel("interval", t)), ["R", "3", "p5"]);
  assert.deepEqual([ab(0, "R"), ab(4, "3"), ab(7, "5")].map((t) => toneLabel("degree", t)), ["1", "3", "5"]);
  assert.deepEqual([ab(0, "R"), ab(4, "3"), ab(7, "5")].map((t) => toneLabel("chord", t)), ["R", "3", "p5"]);
  // D minor (ii) in C major: intervals and degrees count from C
  const ctx = makeKeyContext(0, 0, 0);
  const dm = (semi: number, role: string) => ({ rootPc: 2, semi, role, ctx });
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("note", t)), ["D", "F", "A"]);
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("interval", t)), ["2", "p4", "6"]);
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("degree", t)), ["2", "4", "6"]);
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("chord", t)), ["R", "b3", "p5"]);
});
test("spelling above a root", () => {
  assert.equal(spellAbove("F♯", 3, 10), "A♯");
  assert.equal(spellAbove("E♭", 5, 10), "B♭");
});
test("scale tones", () => {
  const dorian = makeKeyContext(2, 0, 1); // D dorian
  assert.deepEqual([0, 2, 5].map((i) => scaleToneLabel("note", dorian, i)), ["D", "F", "B"]);
  assert.deepEqual([0, 2, 5].map((i) => scaleToneLabel("interval", dorian, i)), ["R", "b3", "6"]);
  assert.deepEqual([0, 2, 5].map((i) => scaleToneLabel("degree", dorian, i)), ["1", "b3", "6"]);
});
