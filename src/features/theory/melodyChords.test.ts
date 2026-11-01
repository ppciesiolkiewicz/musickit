import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHORD_VELOCITY, barChordDegree, chordSteps, harmoniseTune, type MelodyChord } from "./melodyChords";
import { parseTune } from "./singingMelodies";
import { VOICES, buildLadder, tuneLadderFor, type Range } from "./singing";

const ladderIn = (slug: string, pc: number, r: Range) => tuneLadderFor(buildLadder(slug, pc, r)!, pc, r);
const bar = (t: string) => parseTune(t);

describe("a chord for each bar", () => {
  it("picks the chord on 1, 4 or 5 that covers the strong beats", () => {
    assert.equal(barChordDegree(bar("1 3 5 3"), 0), 0);
    assert.equal(barChordDegree(bar("4 6 4 2"), 0), 3);
    assert.equal(barChordDegree(bar("5 7 2' 7"), 0), 4);
    assert.equal(barChordDegree(bar("1w"), 0), 0);
  });

  it("breaks a tie towards the home chord, then 5", () => {
    // only the 5 chord holds Re
    assert.equal(barChordDegree(bar("2 2 2 2"), 0), 4);
    // Sol is in both the home chord and the 5 chord
    assert.equal(barChordDegree(bar("5 5 5 5"), 0), 0);
  });

  it("weighs the bar's own beats, wherever the bar starts", () => {
    const tune = parseTune("1 1 1 1 | 2 4 2 3");
    assert.equal(barChordDegree(tune.filter((n) => n.at >= 4), 4), 4);
  });
});

describe("a tune's chords", () => {
  const C = ladderIn("major-ionian", 0, VOICES.soprano);

  it("is one chord a bar, named in the key", () => {
    const { chords } = harmoniseTune(parseTune("1 2 3 2 | 1w"), C, VOICES.soprano);
    assert.deepEqual(chords.map(({ at, beats, name }) => ({ at, beats, name })), [
      { at: 0, beats: 4, name: "C" },
      { at: 4, beats: 4, name: "C" },
    ]);
    assert.deepEqual(harmoniseTune(parseTune("2 4 2 3 | 1w"), C, VOICES.soprano).chords.map((c) => c.name), ["G", "C"]);
  });

  it("names a minor key's chords minor", () => {
    const Am = ladderIn("natural-minor-aeolian", 9, VOICES.alto);
    const { chords } = harmoniseTune(parseTune("1 3 5 3 | 4 6 1' 6 | 5 7 2' 1'e 7e | 1'w"), Am, VOICES.alto);
    assert.deepEqual(chords.map((c) => c.name), ["Am", "Dm", "Em", "Am"]);
  });

  it("voices a close triad under the tune", () => {
    const { notes, chords } = harmoniseTune(parseTune("1 2 3 2 | 1w"), C, VOICES.soprano);
    for (const c of chords) {
      assert.equal(c.midis.length, 3);
      assert.ok(Math.max(...c.midis) - Math.min(...c.midis) <= 12);
      const low = Math.min(...notes.filter((n) => n.at >= c.at && n.at < c.at + c.beats).map((n) => n.midi));
      assert.ok(Math.max(...c.midis) < low, `${c.name} ${c.midis} under ${low}`);
    }
  });

  it("never sinks under the lowest note for a bass", () => {
    const L = ladderIn("major-ionian", 0, VOICES.bass);
    const { chords } = harmoniseTune(parseTune("1 7, 6, 7, | 1w"), L, VOICES.bass);
    for (const c of chords) assert.ok(Math.min(...c.midis) >= 36, `${c.name} ${c.midis}`);
  });
});

describe("chord steps", () => {
  const chords: MelodyChord[] = [
    { at: 0, beats: 4, name: "C", midis: [48, 52, 55] },
    { at: 4, beats: 4, name: "G", midis: [43, 47, 50] },
  ];

  it("strikes each chord on its beat, quieter than the tune", () => {
    const steps = chordSteps(chords, 500);
    assert.equal(steps.length, 6);
    assert.deepEqual([...new Set(steps.map((s) => s.at))], [0, 2000]);
    assert.ok(steps.every((s) => s.hold === 1800 && s.velocity === CHORD_VELOCITY && CHORD_VELOCITY === 0.45));
  });

  it("from a later beat, strikes the chord already sounding there and skips the ones gone", () => {
    const steps = chordSteps(chords, 500, 2);
    assert.deepEqual(steps.map((s) => [s.at, s.hold]), [
      [0, 900], [0, 900], [0, 900],
      [1000, 1800], [1000, 1800], [1000, 1800],
    ]);
    assert.equal(chordSteps(chords, 500, 4).length, 3);
  });
});
