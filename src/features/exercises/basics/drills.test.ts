import { test } from "node:test";
import assert from "node:assert/strict";
import { fingerPatternSteps, legatoTrillSteps, orderStrings, pickingDrillSteps, stepMidi } from "./drills";

test("strings run low to high, all six by default", () => {
  assert.deepEqual(orderStrings(), [6, 5, 4, 3, 2, 1]);
  assert.deepEqual(orderStrings([2, 5, 5, 9]), [5, 2]);
});

test("the spider puts finger n on fret + n - 1, on each string", () => {
  const s = fingerPatternSteps("1234", 5, [6, 5]);
  assert.equal(s.length, 8);
  assert.deepEqual(s.slice(0, 4).map((x) => x.fret), [5, 6, 7, 8]);
  assert.deepEqual(s.slice(4).map((x) => x.string), [5, 5, 5, 5]);
  assert.deepEqual(s.slice(0, 4).map((x) => x.stroke), ["D", "U", "D", "U"]);
});

test("picking drill: strokes run on across strings; skip takes every other string", () => {
  const s = pickingDrillSteps("DDU", 2, [6, 5]);
  assert.deepEqual(s.map((x) => x.stroke), ["D", "D", "U", "D"]);
  assert.deepEqual(pickingDrillSteps("DU", 1, undefined, true).map((x) => x.string), [6, 4, 2]);
});

test("legato trill: only the first note is picked, two frets alternate", () => {
  const s = legatoTrillSteps("13", 3, 5);
  assert.deepEqual(s.map((x) => x.fret), [5, 7, 5, 7, 5, 7, 5, 7]);
  assert.deepEqual(s.map((x) => !!x.stroke), [true, false, false, false, false, false, false, false]);
});

test("midi of low E fret 5 is A2", () => {
  assert.equal(stepMidi({ string: 6, fret: 5 }), 45);
});
