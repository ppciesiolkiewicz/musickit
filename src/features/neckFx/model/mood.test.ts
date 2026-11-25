import { test } from "node:test";
import assert from "node:assert/strict";
import { CALM, easeMood, fretHeat, keyOf, moodColour, moodTarget, tensionOf, type Heard } from "./mood";

const notes = (midis: number[], from = 0, step = 0.25, level = 0.5): Heard[] => midis.map((midi, i) => ({ t: from + i * step, midi, level }));

test("reads a major and a minor key from the notes", () => {
  // C D E F G A B C, then a C major arpeggio
  const c = keyOf(notes([60, 62, 64, 65, 67, 69, 71, 72, 60, 64, 67]), 3);
  assert.equal(c?.name, "C major");
  assert.ok(c!.bright > 0);
  // A minor pentatonic run, A home
  const a = keyOf(notes([57, 60, 62, 64, 67, 69, 67, 64, 62, 60, 57, 57]), 3);
  assert.equal(a?.name, "A minor");
  assert.ok(a!.bright < 0);
});
test("no key under three different notes, or from notes too old", () => {
  assert.equal(keyOf(notes([60, 64, 60]), 1), null);
  assert.equal(keyOf(notes([60, 62, 64, 65, 67]), 20), null);
});
test("the home note is settled, the 5th near it, a note outside the key tense", () => {
  assert.equal(tensionOf(0, false), 0);
  assert.ok(tensionOf(7, false) < tensionOf(2, false));
  assert.ok(tensionOf(11, false) > tensionOf(4, false));
  assert.ok(tensionOf(1, false) > tensionOf(11, false));
  assert.equal(tensionOf(6, true), 1);
  // the ♭3 belongs in minor, not in major
  assert.ok(tensionOf(3, true) < tensionOf(3, false));
});
test("higher up the neck and more notes a second is more energy", () => {
  const low = moodTarget([], 0, 1), high = moodTarget([], 0, 15);
  assert.ok(high.energy > low.energy);
  assert.equal(fretHeat(20), 1);
  const slow = moodTarget(notes([60, 62], 0, 1), 2, null), fast = moodTarget(notes([60, 62, 64, 65, 67, 69, 71, 72, 74, 76], 0, 0.2), 2, null);
  assert.ok(fast.energy > slow.energy);
});
test("energy rises fast and falls slowly", () => {
  const up = easeMood(CALM, { energy: 1, bright: 0, tension: 0 }, 0.25);
  const down = easeMood({ energy: 1, bright: 0, tension: 0 }, CALM, 0.25);
  assert.ok(up.energy > 1 - down.energy);
});
test("minor is cool, major warm", () => {
  const cool = moodColour({ energy: 0, bright: -1, tension: 0 }).hue, warm = moodColour({ energy: 0, bright: 1, tension: 0 }).hue;
  assert.ok(cool > 200 && cool < 260, String(cool));
  assert.ok(warm > 20 && warm < 50, String(warm));
});
