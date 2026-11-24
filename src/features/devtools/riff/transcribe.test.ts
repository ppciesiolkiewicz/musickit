import { test } from "node:test";
import assert from "node:assert/strict";
import { hearNotes, toRiff } from "./transcribe";
import { midiOf } from "./riff";

const RATE = 48000;

/** A plucked-string stand-in: a few harmonics with a sharp start and a decay. `notes` are [midi, start s, length s]. */
function take(notes: [number, number, number][], seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (const [midi, start, length] of notes) {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    const from = Math.round(start * RATE);
    for (let i = 0; i < length * RATE; i++) {
      const t = i / RATE;
      const env = Math.exp(-3 * t) * Math.min(1, (length - t) * 200);
      out[from + i] += 0.4 * env * (Math.sin(2 * Math.PI * hz * t) + 0.5 * Math.sin(4 * Math.PI * hz * t) + 0.25 * Math.sin(6 * Math.PI * hz * t));
    }
  }
  return out;
}

test("hears each picked note with its pitch and start", () => {
  // A2 C3 E3 A2 as eighth notes at 120 bpm, after a little silence
  const heard = hearNotes(take([[45, 0.3, 0.25], [48, 0.55, 0.25], [52, 0.8, 0.25], [45, 1.05, 0.25]], 1.6), RATE);
  assert.deepEqual(heard.map((h) => h.midi), [45, 48, 52, 45]);
  heard.forEach((h, i) => assert.ok(Math.abs(h.start - (0.3 + i * 0.25)) < 0.04, `note ${i} starts at ${h.start}`));
});

test("the same note picked twice is two notes", () => {
  const heard = hearNotes(take([[57, 0.3, 0.5], [57, 0.8, 0.5]], 1.6), RATE);
  assert.deepEqual(heard.map((h) => h.midi), [57, 57]);
});

test("silence and noise give no notes", () => {
  const noise = Float32Array.from({ length: RATE }, (_, i) => 0.05 * Math.sin(i * 12.9898) * Math.cos(i * 78.233));
  assert.deepEqual(hearNotes(new Float32Array(RATE), RATE), []);
  assert.deepEqual(hearNotes(noise, RATE).length, 0);
});

test("snaps heard notes to the tempo, in the hand position", () => {
  const riff = toRiff([{ start: 1.02, end: 1.24, midi: 45 }, { start: 1.26, end: 1.5, midi: 48 }, { start: 1.51, end: 2.0, midi: 52 }], 120, 5);
  assert.deepEqual(riff.map((n) => n.beats), [0.5, 0.5, 1]);
  assert.deepEqual(riff.map(midiOf), [45, 48, 52]);
  // the hand at fret 5: A and C on the low E string, E on the A string
  assert.deepEqual(riff.map((n) => [n.string, n.fret]), [[0, 5], [0, 8], [1, 7]]);
});

test("a long silence after a note is a rest", () => {
  const riff = toRiff([{ start: 0, end: 0.25, midi: 45 }, { start: 1, end: 1.25, midi: 45 }], 120, 5);
  assert.deepEqual(riff.map((n) => [n.fret, n.beats]), [[5, 0.5], [null, 1.5], [5, 0.5]]);
});

test("two notes on one grid step keep the first", () => {
  const riff = toRiff([{ start: 0, end: 0.05, midi: 45 }, { start: 0.05, end: 0.5, midi: 47 }, { start: 0.5, end: 1, midi: 48 }], 120, 5);
  assert.deepEqual(riff.map(midiOf), [45, 48]);
});
