import { test } from "node:test";
import assert from "node:assert/strict";
import { CALM, QUIET, easeMood, fretHeat, hueTarget, keyOf, mixHue, moodColour, moodFilter, moodTarget, stepBeat, tensionOf, type Heard } from "./mood";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

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
  const up = easeMood(CALM, { ...CALM, energy: 1 }, 0.25);
  const down = easeMood({ ...CALM, energy: 1 }, CALM, 0.25);
  assert.ok(up.energy > 1 - down.energy);
});
test("each key has its own colour, minor cooler than major", () => {
  const C = hueTarget({ tonic: 0, minor: false }, null, 0), G = hueTarget({ tonic: 7, minor: false }, null, 0);
  const Cm = hueTarget({ tonic: 0, minor: true }, null, 0), A = hueTarget({ tonic: 9, minor: false }, null, 0);
  assert.notEqual(C, G);
  assert.notEqual(G, A);
  // C minor sits nearer blue (225) than C major does
  const toBlue = (h: number) => Math.abs((((h - 225) % 360) + 540) % 360 - 180);
  assert.ok(toBlue(Cm) < toBlue(C));
  // no key: the last note's colour; no notes: blue when calm, red when wild
  assert.equal(hueTarget(null, 67, 0.5), 210);
  assert.equal(hueTarget(null, null, 0), 225);
  assert.equal(hueTarget(null, null, 1), 0);
});
test("the colour eases round the wheel the short way, and the mood is no longer always magenta", () => {
  near(mixHue(350, 10, 0.5), 0);
  const eased = easeMood(CALM, { ...CALM, hue: 150 }, 0.5);
  assert.ok(eased.hue < 225 && eased.hue > 150);
  const a = moodColour({ ...CALM, hue: 0 }).hue, b = moodColour({ ...CALM, hue: 120 }).hue;
  assert.notEqual(a, b);
});
test("the beat jumps on a pick or a loud sound and falls fast", () => {
  const hit = stepBeat(QUIET, null, 0.8, 0.016);
  assert.equal(hit.beat, 0.8);
  const later = stepBeat(hit, null, 0, 0.3);
  assert.ok(later.beat < 0.15 && later.beat > 0);
  // live: loud against the loudest lately, so a quiet room doesn't read as a beat
  const loud = stepBeat(QUIET, 0.2, 0, 0.016);
  assert.equal(loud.beat, 1);
  const ring = stepBeat(loud, 0.1, 0, 0.016);
  assert.ok(ring.beat < loud.beat);
  assert.ok(stepBeat(ring, 0.05, 0, 0.016).beat < ring.beat);
});
test("the mood filter grows with strength and the beat", () => {
  const wild = { ...CALM, energy: 1 };
  const sat = (f: string) => Number(/saturate\(([\d.]+)\)/.exec(f)![1]);
  assert.ok(sat(moodFilter(wild, 2)) > sat(moodFilter(wild, 1)));
  assert.ok(sat(moodFilter(wild, 1, 1)) > sat(moodFilter(wild, 1, 0)));
  assert.equal(moodFilter(wild, 0), "saturate(1) contrast(1) brightness(1)");
});
