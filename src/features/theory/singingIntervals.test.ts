import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VOICES, buildLadder, spellName } from "./singing";
import { intervalName, levelSemis, nextIntervalQuestion, spellInterval } from "./singingIntervals";

describe("singing intervals", () => {
  it("spells the target from the root's letter", () => {
    assert.equal(spellInterval(spellName("E", 64), 4).name, "G♯");
    assert.equal(spellInterval(spellName("E", 64), 3).name, "G");
    assert.equal(spellInterval(spellName("F", 65), 6).name, "B");
    assert.equal(spellInterval(spellName("B♭", 70), -7).name, "E♭");
    assert.equal(spellInterval(spellName("C", 60), 12).name, "C");
    assert.equal(spellInterval(spellName("C", 60), 12).octave, 5);
    assert.equal(spellInterval(spellName("D", 62), -1).name, "C♯");
  });
  it("names the interval with its direction", () => {
    assert.equal(intervalName(7), "perfect 5th up");
    assert.equal(intervalName(-3), "minor 3rd down");
  });
  it("levels add intervals", () => {
    assert.deepEqual(levelSemis(1), [7, 12]);
    assert.deepEqual(levelSemis(2), [3, 4, 7, 12]);
  });
  it("a question stays inside the range and on a scale root", () => {
    const ladder = buildLadder("major-ionian", 0, VOICES.tenor)!;
    for (let k = 0; k < 50; k++) {
      const r = Math.random;
      const q = nextIntervalQuestion(ladder, VOICES.tenor, levelSemis(6), "both", r)!;
      assert.ok(ladder.notes.includes(q.root));
      assert.ok(q.target.midi >= VOICES.tenor.low && q.target.midi <= VOICES.tenor.high);
      assert.equal(q.target.midi - q.root.midi, q.semis);
    }
  });
  it("down only goes down, and a new question changes the interval", () => {
    const ladder = buildLadder("major-ionian", 0, VOICES.tenor)!;
    const a = nextIntervalQuestion(ladder, VOICES.tenor, [7, 12], "down", () => 0)!;
    assert.equal(a.semis, -7);
    assert.ok(a.root.midi - 7 >= VOICES.tenor.low);
    const b = nextIntervalQuestion(ladder, VOICES.tenor, [7, 12], "down", () => 0, a)!;
    assert.equal(b.semis, -12);
  });
  it("nothing fits: null", () => {
    const ladder = buildLadder("major-ionian", 0, { low: 60, high: 62 })!;
    assert.equal(nextIntervalQuestion(ladder, { low: 60, high: 62 }, [12], "up", Math.random), null);
  });
});
