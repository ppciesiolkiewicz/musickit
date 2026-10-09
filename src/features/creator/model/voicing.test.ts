import { test } from "node:test";
import assert from "node:assert/strict";
import { PROG_LIST, resolveProgression, TRIAD_SUFFIX } from "@/features/theory";
import { chordSemis, knownSuffix, voice } from "./voicing";

test("every suffix the progression list uses has a voicing", () => {
  for (const p of PROG_LIST) for (const c of resolveProgression(p).seq) assert.ok(knownSuffix(c.suf), `${c.name}: ${c.suf}`);
  for (const q of ["maj", "min", "dim", "aug"] as const) assert.ok(knownSuffix(TRIAD_SUFFIX[q]), q);
});

test("a chord is stacked above its root in the base octave", () => {
  assert.deepEqual(voice(0, ""), [48, 52, 55]);
  assert.deepEqual(voice(9, "m7"), [57, 60, 64, 67]);
  const v = voice(11, "7");
  assert.equal(v[0], 59);
  assert.ok(v.every((n) => n >= 48));
});

test("an unknown suffix falls back to a major triad", () => {
  assert.deepEqual(chordSemis("zzz"), [0, 4, 7]);
});
