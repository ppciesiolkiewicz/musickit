import assert from "node:assert/strict";
import { test } from "node:test";
import { chordCues } from "../cues/cues";
import { progression, soloOver, twoScales } from "../shapes";
import { isSolo, soloTargets } from "./solo";

const t = soloOver({ shape: "solo-over", key: "g", bpm: 90, chords: [{ chord: "Am7", scale: "dorian", target: ["1", "b3"] }, { chord: "D7", scale: "mixolydian", target: ["3"] }] })!;

test("solo-over: one fixed set of notes; only the highlight moves to the chord's targets", () => {
  assert.ok(isSolo(t));
  // A dorian and D mixolydian are both the G major notes; Am7 targets A, C
  assert.deepEqual(soloTargets(t, 0), { chord: "Am7", pcs: [0, 2, 4, 6, 7, 9, 11], lit: [0, 9], muted: [], targets: [0, 9] });
  // D7: same notes shown, target F#
  assert.deepEqual(soloTargets(t, 5), { chord: "D7", pcs: [0, 2, 4, 6, 7, 9, 11], lit: [6], muted: [], targets: [6] });
  assert.equal(soloTargets(t, -1)?.chord, "Am7");
});

test("a chord with no scale of its own keeps the exercise's notes, not the chord's", () => {
  const u = soloOver({ shape: "solo-over", key: "c", scale: "minor-pentatonic", bpm: 80, chords: [{ chord: "Cm7", target: ["1"] }, { chord: "Fm7", target: ["1"] }] })!;
  // C minor pentatonic: C Eb F G Bb, for both chords; Ab (Fm7's 3rd) is not added
  assert.deepEqual(soloTargets(u, 0)?.pcs, [0, 3, 5, 7, 10]);
  assert.deepEqual(soloTargets(u, 5), { chord: "Fm7", pcs: [0, 3, 5, 7, 10], lit: [5], muted: [], targets: [5] });
});

test("per-chord scales: every chord's notes stay shown", () => {
  const u = soloOver({ shape: "solo-over", key: "a", bpm: 80, chords: [{ chord: "A7", scale: "minor-pentatonic", target: ["3"] }, { chord: "D7", target: ["1"] }] })!;
  // A minor pentatonic A C D E G, plus the target C#
  assert.deepEqual(soloTargets(u, 0)?.pcs, [0, 1, 2, 4, 7, 9]);
  assert.deepEqual(soloTargets(u, 5)?.pcs, [0, 1, 2, 4, 7, 9]);
});

test("without a scale, every chord's tones", () => {
  const u = soloOver({ shape: "solo-over", key: "c", bpm: 80, chords: [{ chord: "C", target: ["3"] }, { chord: "G", target: ["1"] }] })!;
  assert.deepEqual(soloTargets(u, 0), { chord: "C", pcs: [0, 2, 4, 7, 11], lit: [4], muted: [], targets: [4] });
});

test("two-scales: both scales shown throughout, the one not playing muted, the chord's tones lit", () => {
  const u = twoScales({ shape: "two-scales", a: { key: "d", scale: "natural-minor-aeolian" }, b: { key: "d", scale: "dorian" }, bars: 8, backingChord: "Dm", bpm: 70 })!;
  assert.ok(isSolo(u));
  const first = soloTargets(u, 0)!, second = soloTargets(u, 16)!;
  assert.deepEqual(first.pcs, [0, 2, 4, 5, 7, 9, 10, 11]);
  assert.deepEqual(second.pcs, first.pcs);
  assert.deepEqual([first.muted, second.muted], [[11], [10]]);
  assert.deepEqual(first.lit, [2, 5, 9]);
  assert.deepEqual([first.scale, second.scale], ["D minor", "D Dorian"]);
});

test("a progression with no steps and no backing shows each chord's shape and notes, one per chord", () => {
  const p = progression({ shape: "progression", key: "a", chords: ["Am", "F", "C", "G"], bars: 4, bpm: 80 })!;
  assert.ok(!isSolo(p));
  const cs = chordCues(p);
  assert.deepEqual(cs.map((c) => [c.chord, c.at, c.beats]), [["Am", 0, 4], ["F", 4, 4], ["C", 8, 4], ["G", 12, 4]]);
  assert.equal(cs[0].frets.length, cs[0].midi.length);
  assert.ok(cs[0].frets.length >= 5);
  assert.deepEqual([...new Set(cs[0].midi.map((m) => m % 12))].sort((a, b) => a - b), [0, 4, 9]);
});

test("a backed progression with no steps shows the backing as played: bass on 1 and 3, the top strings on 2 and 4", () => {
  const p = progression({ shape: "progression", key: "c", chords: ["C"], bars: 1, backing: ["bass-chord"], bpm: 80 })!;
  const cs = chordCues(p);
  assert.deepEqual(cs.map((c) => [c.at, c.kind, c.frets.length]), [[0, "note", 1], [1, "strum", 4], [2, "note", 1], [3, "strum", 4]]);
  assert.deepEqual(cs[0].frets, [{ string: 1, fret: 3, finger: 3 }]);
  assert.ok(cs[1].frets.every((f) => f.string >= 2));
});
