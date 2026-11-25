import { test } from "node:test";
import assert from "node:assert/strict";
import { cueNotes, fingerFor } from "./cueNotes";
import type { Cue } from "./cues";

const cue = (o: Partial<Cue>): Cue => ({
  at: 0, beats: 1, chord: "E", kind: "note", midi: [], frets: [], enabled: true, highlighted: false, ...o,
});

test("cueNotes drops backing and disabled cues", () => {
  const frets = [{ string: 0, fret: 0 }];
  const out = cueNotes([cue({ kind: "backing", frets }), cue({ enabled: false, frets }), cue({ at: 1, frets })]);
  assert.deepEqual(out.map((n) => n.beat), [1]);
});

test("cueNotes gives one note per fret with OPEN_MIDI pitch and finger", () => {
  const out = cueNotes([cue({ at: 2, beats: 1, frets: [{ string: 0, fret: 3, finger: 2 }] })]);
  assert.deepEqual(out, [{ beat: 2, beats: 1, midi: 43, string: 0, fret: 3, finger: 2 }]);
});

test("fingerFor gives one finger per fret from the hand", () => {
  assert.equal(fingerFor(7, 5), 3);
  assert.equal(fingerFor(0, 5), undefined);
  assert.equal(fingerFor(12, 5), 4);
  assert.equal(fingerFor(3, 5), 1);
});
