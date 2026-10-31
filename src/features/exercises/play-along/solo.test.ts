import assert from "node:assert/strict";
import { test } from "node:test";
import { chordCues } from "../cues/cues";
import { progression, soloOver } from "../shapes";
import { isSolo, soloTargets } from "./solo";

const t = soloOver({ shape: "solo-over", key: "g", bpm: 90, chords: [{ chord: "Am7", scale: "dorian", target: ["1", "b3"] }, { chord: "D7", scale: "mixolydian", target: ["3"] }] })!;

test("solo-over: the chord at the playhead, its scale and targets", () => {
  assert.ok(isSolo(t));
  // A dorian: A B C D E F# G; targets A, C
  assert.deepEqual(soloTargets(t, 0), { chord: "Am7", pcs: [0, 2, 4, 6, 7, 9, 11], lit: [0, 9] });
  // D mixolydian: D E F# G A B C; target F#
  assert.deepEqual(soloTargets(t, 5), { chord: "D7", pcs: [0, 2, 4, 6, 7, 9, 11], lit: [6] });
  assert.equal(soloTargets(t, -1)?.chord, "Am7");
});

test("without a scale, the chord tones", () => {
  const u = soloOver({ shape: "solo-over", key: "c", bpm: 80, chords: [{ chord: "C", target: ["3"] }] })!;
  assert.deepEqual(soloTargets(u, 0), { chord: "C", pcs: [0, 4, 7], lit: [4] });
});

test("a progression with no steps shows each chord's shape and notes, one per chord", () => {
  const p = progression({ shape: "progression", key: "a", chords: ["Am", "F", "C", "G"], bars: 4, backing: ["arp-up", "strum"], bpm: 80 })!;
  assert.ok(!isSolo(p));
  const cs = chordCues(p);
  assert.deepEqual(cs.map((c) => [c.chord, c.at, c.beats]), [["Am", 0, 4], ["F", 4, 4], ["C", 8, 4], ["G", 12, 4]]);
  assert.equal(cs[0].frets.length, cs[0].midi.length);
  assert.ok(cs[0].frets.length >= 5);
  assert.deepEqual([...new Set(cs[0].midi.map((m) => m % 12))].sort((a, b) => a - b), [0, 4, 9]);
});
