import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { voiceMap, voiceMapIn } from "@/features/theory/registers";
import { VOICES, type Voice } from "@/features/theory/singing";
import { stepHold } from "../voice-hill/hill";
import { CLIMB_NOTES, MOUTHS, UNDER_TOP, VOWELS, VOWEL_CLIMBS, blend, cleanVowels, easyNote, heardOf, holdsOf, isVowel, isVowelClimb, liftOf, mouthShape, targetNotes, towards } from "./vowels";

const ALL = Object.keys(VOICES) as Voice[];

describe("vowel-guide: the notes asked for", () => {
  it("a tenor: G3 alone, G3 to the first break at D4, D4 to the second break at G4", () => {
    const tenor = voiceMap("tenor");
    assert.equal(easyNote(tenor), 55);
    assert.deepEqual(targetNotes("one-note", tenor), [55]);
    assert.deepEqual(targetNotes("to-break", tenor), [55, 57, 60, 62]);
    assert.deepEqual(targetNotes("across-break", tenor), [62, 64, 65, 67]);
  });
  it("every voice type: the notes climb, stay inside the range and never come near its top", () => {
    for (const v of ALL) {
      const map = voiceMap(v);
      for (const climb of VOWEL_CLIMBS) {
        const notes = targetNotes(climb, map);
        assert.ok(notes.length >= 1 && notes.length <= CLIMB_NOTES, `${v} ${climb}`);
        assert.deepEqual(notes, [...new Set(notes)].sort((a, b) => a - b), `${v} ${climb}: low to high, each once`);
        for (const m of notes) assert.ok(m >= map.low && m <= map.high - UNDER_TOP, `${v} ${climb}: ${m}`);
      }
      // one easy note for a new singer: the hill's middle note, a 5th over the bottom
      assert.deepEqual(targetNotes("one-note", map), [map.low + 7]);
      // a climb starts where the one before it ends
      assert.equal(targetNotes("to-break", map)[0], map.low + 7);
      assert.equal(targetNotes("across-break", map)[0], targetNotes("to-break", map).at(-1));
    }
  });
  it("a player's own range: the breaks are kept inside it and the notes under its top, down to one note in a short range", () => {
    // an octave and a 3rd, A2 to C♯4, read as a baritone (breaks B3 and E4)
    const short = voiceMapIn("baritone", { low: 45, high: 61, label: "A2 to C♯4" });
    assert.deepEqual(targetNotes("one-note", short), [52]);
    assert.deepEqual(targetNotes("to-break", short), [52, 54, 56, 58]);
    // both breaks sit over the cap, so the climb across is the one note under the top
    assert.deepEqual(targetNotes("across-break", short), [58]);
    // one octave: the easy note is still three under the top
    const octave = voiceMapIn("tenor", { low: 50, high: 62, label: "D3 to D4" });
    assert.deepEqual(targetNotes("one-note", octave), [57]);
    for (const climb of VOWEL_CLIMBS) for (const m of targetNotes(climb, octave)) assert.ok(m >= 50 && m <= 59, `${climb}: ${m}`);
    // a range too short for the cap never goes under its bottom
    assert.equal(easyNote({ low: 60, high: 62, primo: 62, secondo: 62 }), 60);
  });
});

describe("vowel-guide: the holds", () => {
  it("the vowels as written, each once; all five when none is", () => {
    assert.deepEqual(cleanVowels(undefined), [...VOWELS]);
    assert.deepEqual(cleanVowels([]), [...VOWELS]);
    assert.deepEqual(cleanVowels(["oo", "ee", "oo", "uh", 3]), ["oo", "ee"]);
    assert.ok(isVowel("eh") && !isVowel("uh"));
    assert.ok(isVowelClimb("to-break") && !isVowelClimb("up"));
  });
  it("every vowel on a note, then the next note up", () => {
    assert.deepEqual(holdsOf(["ah", "oo"], [55, 57]), [{ vowel: "ah", midi: 55 }, { vowel: "oo", midi: 55 }, { vowel: "ah", midi: 57 }, { vowel: "oo", midi: 57 }]);
    assert.equal(holdsOf([...VOWELS], targetNotes("to-break", voiceMap("tenor"))).length, 20);
  });
  it("held is the pitch within the cents of the note; a breath is no sound", () => {
    assert.equal(heardOf(null, 55, 25), "none");
    assert.equal(heardOf(55.2, 55, 25), "in");
    assert.equal(heardOf(54.75, 55, 25), "in");
    assert.equal(heardOf(55.3, 55, 25), "out");
    // the same note an octave away is not the note
    assert.equal(heardOf(67, 55, 25), "out");
    assert.equal(towards(55.1, 55, 25), 0);
    assert.equal(towards(53, 55, 25), 1);
    assert.equal(towards(58, 55, 25), -1);
  });
  it("a hold fills on the note, drains slowly off it and waits on a breath (the hill's stepHold)", () => {
    let p = 0;
    for (let i = 0; i < 30; i++) p = stepHold(p, heardOf(55, 55, 25), 0.1, 3);
    assert.ok(Math.abs(p - 1) < 1e-9);
    assert.ok(Math.abs(stepHold(0.5, heardOf(57, 55, 25), 0.3, 3) - 0.45) < 1e-9);
    assert.equal(stepHold(0.5, heardOf(null, 55, 25), 1, 3), 0.5);
  });
});

describe("vowel-guide: the mouth as numbers", () => {
  it("on an easy note: ah the most open, ee the least open, ee and oo nearly the same small round mouth, oo the roundest and narrowest, eh the widest", () => {
    for (const v of VOWELS) assert.deepEqual(mouthShape(v, 0), MOUTHS[v]);
    const by = (k: "open" | "wide" | "round") => [...VOWELS].sort((a, b) => MOUTHS[b][k] - MOUTHS[a][k]);
    assert.equal(by("open")[0], "ah");
    assert.equal(by("open").at(-1), "ee");
    assert.equal(by("wide")[0], "eh");
    assert.ok(Math.abs(MOUTHS.ee.open - MOUTHS.oo.open) < 0.05 && Math.abs(MOUTHS.ee.wide - MOUTHS.oo.wide) < 0.15 && MOUTHS.ee.round >= 0.6);
    assert.equal(by("wide").at(-1), "oo");
    assert.equal(by("round")[0], "oo");
  });
  it("as the note climbs every vowel opens; the wide ones narrow and the round ones open out, and they stay apart", () => {
    for (const v of VOWELS) {
      let last = mouthShape(v, 0);
      for (const lift of [0.25, 0.5, 0.75, 1]) {
        const m = mouthShape(v, lift);
        for (const n of [m.open, m.wide, m.round]) assert.ok(n >= 0 && n <= 1, v);
        assert.ok(m.open > last.open, `${v} opens`);
        assert.equal(m.round, MOUTHS[v].round);
        last = m;
      }
    }
    assert.ok(mouthShape("eh", 1).wide < MOUTHS.eh.wide, "eh narrows");
    for (const v of ["ee", "oh", "oo"] as const) assert.ok(mouthShape(v, 1).wide > MOUTHS[v].wide, `${v} opens out`);
    // at the top ee is still wider than oo, and ah still the most open
    assert.ok(mouthShape("ee", 1).wide > mouthShape("oo", 1).wide);
    for (const v of VOWELS) assert.ok(mouthShape("ah", 1).open >= mouthShape(v, 1).open);
    // out of 0 to 1 is held to the ends
    assert.deepEqual(mouthShape("ee", -1), MOUTHS.ee);
    assert.deepEqual(mouthShape("ee", 2), mouthShape("ee", 1));
  });
  it("the lift is 0 at the easy note and under, 1 at the top of the range", () => {
    const tenor = voiceMap("tenor");
    assert.equal(liftOf(48, tenor), 0);
    assert.equal(liftOf(55, tenor), 0);
    assert.equal(liftOf(72, tenor), 1);
    assert.equal(liftOf(80, tenor), 1);
    assert.ok(liftOf(62, tenor) > 0 && liftOf(62, tenor) < liftOf(67, tenor));
    assert.equal(liftOf(61, { low: 60, high: 60, primo: 60, secondo: 60 }), 0);
  });
  it("blend moves from one mouth to the next", () => {
    assert.deepEqual(blend(MOUTHS.ah, MOUTHS.oo, 0), MOUTHS.ah);
    const end = blend(MOUTHS.ah, MOUTHS.oo, 1);
    for (const k of ["open", "wide", "round"] as const) assert.ok(Math.abs(end[k] - MOUTHS.oo[k]) < 1e-9, k);
    const half = blend(MOUTHS.ah, MOUTHS.oo, 0.5);
    assert.ok(half.open < MOUTHS.ah.open && half.open > MOUTHS.oo.open && half.round === 0.5);
  });
});
