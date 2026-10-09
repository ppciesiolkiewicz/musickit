import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtInterval, intervalName, noteLabel } from "./labels";

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
