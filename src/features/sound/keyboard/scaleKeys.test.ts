import { test } from "node:test";
import assert from "node:assert/strict";
import { SCALES, buildKeyMap, clampState, degreeToMidi, scalePitchClasses, noteName, KEY_ROWS } from "./scaleKeys";

test("C major starts on C3 and climbs the scale along a row", () => {
  const s = { root: 0, scale: "major", octave: 3 };
  assert.equal(degreeToMidi(s, 0), 48);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((d) => degreeToMidi(s, d)), [48, 50, 52, 53, 55, 57, 59, 60]);
});

test("each row starts one octave above the row below, on the root", () => {
  const s = { root: 9, scale: "minor", octave: 3 }; // A minor
  const map = buildKeyMap(s);
  const firsts = [0, 1, 2, 3].map((r) => map.find((k) => k.row === r && k.col === 0)!);
  assert.deepEqual(firsts.map((k) => k.midi), [57, 69, 81, 93]);
  assert.ok(firsts.every((k) => k.isRoot && k.name === "A"));
});

test("a pentatonic scale wraps after five keys", () => {
  const s = { root: 0, scale: "minorPentatonic", octave: 3 };
  const row = buildKeyMap(s).filter((k) => k.row === 0);
  assert.deepEqual(row.slice(0, 6).map((k) => k.midi), [48, 51, 53, 55, 58, 60]);
  assert.equal(row[5].isRoot, true);
});

test("every key plays a note of the scale", () => {
  for (const sc of SCALES) {
    for (const root of [0, 3, 7, 11]) {
      const st = { root, scale: sc.id, octave: 3 };
      const pcs = scalePitchClasses(st);
      assert.ok(buildKeyMap(st).every((k) => pcs.has(k.midi % 12)), `${sc.id} ${root}`);
    }
  }
});

test("key codes are unique and state is clamped", () => {
  const codes = KEY_ROWS.flat().map((k) => k.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.deepEqual(clampState({ root: 14, scale: "nope", octave: 99 }), { root: 2, scale: "major", octave: 6 });
  assert.equal(noteName(61), "C♯");
});
