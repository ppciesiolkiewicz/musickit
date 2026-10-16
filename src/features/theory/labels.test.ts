import { test } from "node:test";
import assert from "node:assert/strict";
import { chordNoteLabel, fmtInterval, intervalName, noteLabel, scaleToneLabel, spellAbove, toneColourIndex, toneLabel } from "./labels";
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
test("counting from the chord root instead of the key", () => {
  const ctx = makeKeyContext(0, 0, 0);
  const dm = (semi: number, role: string) => ({ rootPc: 2, semi, role, ctx });
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("interval", t, "chord")), ["R", "b3", "p5"]);
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("degree", t, "chord")), ["1", "b3", "5"]);
  assert.deepEqual([dm(0, "R"), dm(3, "♭3"), dm(7, "5")].map((t) => toneLabel("note", t, "chord")), ["D", "F", "A"]);
});

test("colour follows the same root as the label", () => {
  // E Phrygian, Cmaj7: C E G B. Counted from the key, E is home (0) and C the 6th (5); from the chord, C is home.
  const ctx = makeKeyContext(4, 0, 2);
  const c = (semi: number, role: string) => ({ rootPc: 0, semi, role, ctx });
  assert.deepEqual([c(0, "R"), c(4, "3"), c(7, "5"), c(11, "7")].map((t) => toneColourIndex(t)), [5, 0, 2, 4]);
  assert.deepEqual([c(0, "R"), c(4, "3"), c(7, "5"), c(11, "7")].map((t) => toneColourIndex(t, "chord")), [0, 2, 4, 6]);
  // without a key the chord root is home
  assert.equal(toneColourIndex({ rootPc: 0, semi: 0, role: "R" }), 0);
  // a note outside the key keeps the colour of the degree it alters: C♯ in C major is a ♭2, coloured as the 2nd
  assert.equal(toneColourIndex({ rootPc: 1, semi: 0, role: "R", ctx: makeKeyContext(0, 0, 0) }), 1);
});

test("chord row notes count from the chord root on request", () => {
  const ctx = makeKeyContext(0, 0, 0);
  const f = { name: "F", role: "♭3", scaleDegree: 3 };
  assert.equal(chordNoteLabel("interval", ctx, f), "p4");
  assert.equal(chordNoteLabel("interval", ctx, f, "chord"), "b3");
  assert.equal(chordNoteLabel("degree", ctx, f, "chord"), "b3");
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
