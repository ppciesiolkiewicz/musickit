import { test } from "node:test";
import assert from "node:assert/strict";
import { A4_PRESETS, INSTRUMENTS, instrumentById, midiToHz } from "./tunings";

test("tunings parse to the right MIDI notes", () => {
  const guitar = instrumentById("guitar")!;
  assert.deepEqual(guitar.tunings[0].strings.map((s) => s.midi), [40, 45, 50, 55, 59, 64]);
  assert.deepEqual(guitar.tunings.find((t) => t.id === "dadgad")!.strings.map((s) => s.name).join(""), "DADGAD");
  assert.deepEqual(instrumentById("ukulele")!.tunings[0].strings.map((s) => s.midi), [67, 60, 64, 69]);
  assert.equal(instrumentById("cello")!.tunings[0].strings[0].midi, 36);
});
test("every instrument but chromatic has a tuning, ids are unique", () => {
  for (const i of INSTRUMENTS) {
    assert.equal(i.tunings.length === 0, i.id === "chromatic", i.id);
    assert.equal(new Set(i.tunings.map((t) => t.id)).size, i.tunings.length, i.id);
    for (const t of i.tunings) for (const s of t.strings) assert.ok(midiToHz(s.midi) >= i.minHz * 1.1, `${i.id} ${t.id} ${s.name}${s.octave}`);
  }
  assert.ok(A4_PRESETS.some((p) => p.hz === 440));
});
test("midiToHz follows the A4 reference", () => {
  assert.equal(midiToHz(69), 440);
  assert.equal(midiToHz(69, 432), 432);
  assert.ok(Math.abs(midiToHz(40) - 82.41) < 0.01);
});
