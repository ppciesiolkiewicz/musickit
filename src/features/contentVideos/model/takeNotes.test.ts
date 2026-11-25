import { test } from "node:test";
import assert from "node:assert/strict";
import type { KitNote } from "@/features/exercises/cues/cueNotes";
import { beatAt, type Piece } from "./clock";
import { clickClock, takeNotes } from "./takeNotes";

const notes: KitNote[] = [{ beat: 0, beats: 1, midi: 40 }, { beat: 2, beats: 2, midi: 43 }];

test("clickClock puts beat 0 at the downbeat", () => {
  assert.deepEqual(clickClock(2, 120), [[0, -4, 2]]);
  assert.equal(beatAt(clickClock(2, 120), 2), 0);
});

test("takeNotes times one pass of the notes", () => {
  const out = takeNotes(notes, null, clickClock(1, 60), 10);
  assert.deepEqual(out.map((n) => n.start), [1, 3]);
  assert.deepEqual(out.map((n) => n.end), [2, 5]);
});

test("takeNotes repeats a loop across the take and stops at its end", () => {
  const out = takeNotes(notes, 4, clickClock(0, 60), 9);
  assert.deepEqual(out.map((n) => n.start), [0, 2, 4, 6, 8]);
});

test("takeNotes has no notes while the tool is stopped", () => {
  const clock: Piece[] = [[0, 0, 1], [2, null, 0], [5, 0, 1]];
  const out = takeNotes([{ beat: 0, beats: 1, midi: 40 }, { beat: 1, beats: 1, midi: 42 }], null, clock, 8);
  assert.deepEqual(out.map((n) => n.start), [0, 1, 5, 6]);
});

test("takeNotes carries the place", () => {
  const out = takeNotes([{ beat: 0, beats: 1, midi: 50, string: 1, fret: 2, finger: 1 }], null, clickClock(0, 60), 4);
  assert.equal(out[0].string, 1);
  assert.equal(out[0].fret, 2);
  assert.equal(out[0].finger, 1);
});
