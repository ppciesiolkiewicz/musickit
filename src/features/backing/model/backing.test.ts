import { test } from "node:test";
import assert from "node:assert/strict";
import { chordFromNumeral, chordsFromNumerals, numeralOfChord } from "./numerals";
import { DEFAULT_SETTINGS, bandMode, clampSettings, cleanNumerals, playedNumerals } from "./settings";
import { PROGRESSIONS, layOut, splitLength } from "./progressions";
import { STYLES, checkStyle, findStyle } from "./styles";
import { arrange, bassNote, bassRoot, chordAt, eventsBetween, stepBeat, voiceLead } from "./arrange";
import { TempoClock, clampBpm } from "./clock";
import { findGroove } from "@/features/instruments/model";
import { Song } from "./song";

const symbols = (numerals: string[], tonic: string) => chordsFromNumerals(numerals, tonic).map((c) => c.symbol);

test("numerals: case is the quality, accidentals move the root", () => {
  assert.deepEqual(symbols(["I", "V", "vi", "IV"], "C"), ["C", "G", "Am", "F"]);
  assert.deepEqual(symbols(["i", "bVII", "bVI", "V"], "A"), ["Am", "G", "F", "E"]);
  assert.deepEqual(symbols(["ii7", "V7", "Imaj7"], "Bb"), ["Cm7", "F7", "Bbmaj7"]);
  assert.deepEqual(symbols(["iiø7", "vii°", "vii°7", "#iv°"], "C"), ["Dm7b5", "Bdim", "Bdim7", "F#dim"]);
  assert.deepEqual(symbols(["i", "bII"], "E"), ["Em", "F"]);
  assert.deepEqual(symbols(["I", "II"], "F"), ["F", "G"]);
});

test("numerals: pitch classes come from tonal, root first", () => {
  const c = chordFromNumeral("ii7", "C")!;
  assert.equal(c.rootPc, 2);
  assert.deepEqual(c.pcs, [2, 5, 9, 0]);
  assert.equal(chordFromNumeral("nonsense", "C"), null);
  assert.equal(chordFromNumeral("Ixyz", "C"), null);
});

test("every curated progression parses in every key", () => {
  const tonics = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  for (const p of PROGRESSIONS)
    for (const t of tonics) assert.equal(chordsFromNumerals(p.numerals, t).length, p.numerals.length, `${p.id} in ${t}`);
});

test("progressions: lengths after a colon, laid out in beats", () => {
  assert.deepEqual(splitLength("V7:2"), ["V7", 2]);
  assert.deepEqual(splitLength("ii7:0.5"), ["ii7", 0.5]);
  assert.deepEqual(splitLength("I"), ["I", 1]);
  assert.deepEqual(splitLength("I:x"), ["I", 1]);
  const { chords, beats } = layOut(["ii7:0.5", "V7:0.5", "I:2"], "C", 4);
  assert.equal(beats, 12);
  assert.deepEqual(chords.map((c) => [c.symbol, c.beat, c.beats]), [["Dm7", 0, 2], ["G7", 2, 2], ["C", 4, 8]]);
});

test("every style's data is sound", () => {
  for (const s of STYLES) assert.deepEqual(checkStyle(s), []);
  assert.notDeepEqual(checkStyle({ ...STYLES[0], drums: { kick: "x.." } }), []);
});

test("swing pushes only the off-beat eighth, to the last triplet when full", () => {
  assert.equal(stepBeat(0, 1), 0);
  assert.equal(stepBeat(1, 1), 0.25);
  assert.equal(stepBeat(2, 0), 0.5);
  assert.ok(Math.abs(stepBeat(2, 1) - 2 / 3) < 1e-9);
  assert.ok(Math.abs(stepBeat(6, 1) - (1 + 2 / 3)) < 1e-9);
});

test("bass: register E1-D#2, roles over the chord", () => {
  assert.equal(bassRoot(4), 28); // E1
  assert.equal(bassRoot(3), 39); // D#2
  assert.equal(bassRoot(9), 33); // A1
  const { chords } = layOut(["ii7", "V7"], "C", 4);
  const [dm7, g7] = chords;
  assert.equal(bassNote("R", dm7, g7), 38); // D2
  assert.equal(bassNote("3", dm7, g7), 41); // F
  assert.equal(bassNote("5", dm7, g7), 45); // A
  assert.equal(bassNote("7", dm7, g7), 48); // C
  assert.equal(bassNote("8", dm7, g7), 50);
  assert.equal(bassNote("A", dm7, g7), 30); // F#1, a half step under G1
  const dim = layOut(["vii°"], "C", 4).chords[0];
  assert.equal(bassNote("5", dim, dim) - bassNote("R", dim, dim), 6); // a diminished chord's fifth is flat
});

test("voice leading moves each chord to the nearest inversion", () => {
  const { chords } = layOut(["I", "IV", "V", "I"], "C", 4);
  const v = voiceLead(chords, "close");
  for (const voicing of v) {
    assert.ok(voicing[0] >= 53 && voicing[voicing.length - 1] <= 53 + 24, `in range: ${voicing}`);
    for (let i = 1; i < voicing.length; i++) assert.ok(voicing[i] > voicing[i - 1]);
  }
  // C to F: the common tone C stays put
  const common = v[0].filter((n) => v[1].includes(n));
  assert.ok(common.length >= 1, `${v[0]} → ${v[1]}`);
  // the top note moves by a step or less between neighbours
  for (let i = 1; i < v.length; i++) assert.ok(Math.abs(v[i][v[i].length - 1] - v[i - 1][v[i - 1].length - 1]) <= 4);
  // a shell voicing is the 3rd and 7th
  const shell = voiceLead(layOut(["ii7"], "C", 4).chords, "shell")[0];
  assert.deepEqual(shell.map((n) => n % 12).sort(), [0, 5]);
});

test("arrange: one round of pop in C", () => {
  const arr = arrange(["I", "V", "vi", "IV"], "C", findStyle("pop"));
  assert.equal(arr.beats, 16);
  assert.equal(arr.chords.length, 4);
  const kicks = arr.events.filter((e) => e.lane === "kick").map((e) => e.beat);
  assert.deepEqual(kicks.slice(0, 3), [0, 2, 2.5]);
  // sorted, and every note inside the round
  for (let i = 1; i < arr.events.length; i++) assert.ok(arr.events[i].beat >= arr.events[i - 1].beat);
  assert.ok(arr.events.every((e) => e.beat >= 0 && e.beat < 16));
  // bass on each bar's one is the chord's root
  const ones = arr.events.filter((e) => e.part === "bass" && e.beat % 4 === 0).map((e) => e.midi! % 12);
  assert.deepEqual(ones, [0, 7, 9, 5]);
  // the keys play only notes of the sounding chord
  for (const e of arr.events.filter((x) => x.part === "keys")) assert.ok(arr.chords[chordAt(arr.chords, e.beat)].pcs.includes(e.midi! % 12));
  // the fill comes on the last bar
  assert.ok(arr.events.some((e) => e.lane === "snare" && e.beat >= 15));
});

test("arrange: notes never ring past their chord, and half-bar chords are heard", () => {
  const arr = arrange(["ii7:0.5", "V7:0.5", "Imaj7"], "C", findStyle("ballad"));
  for (const e of arr.events.filter((x) => x.part !== "drums")) {
    const c = arr.chords[chordAt(arr.chords, e.beat)];
    assert.ok(e.beat + e.beats <= c.beat + c.beats + 1e-9, `${e.part} at ${e.beat} rings past ${c.symbol}`);
  }
  const g7 = arr.chords[1];
  assert.ok(arr.events.some((e) => e.part === "keys" && e.beat === g7.beat));
  assert.ok(arr.events.some((e) => e.part === "bass" && e.beat === g7.beat && e.midi! % 12 === 7));
});

test("arrange: a waltz has 3 beats to the bar and swing lands late", () => {
  const w = arrange(["I", "IV"], "G", findStyle("waltz"));
  assert.equal(w.beats, 6);
  assert.equal(w.beatsPerBar, 3);
  const s = arrange(["I7"], "A", findStyle("swing"));
  assert.ok(s.events.some((e) => e.lane === "hat" && Math.abs(e.beat - (1 + 2 / 3)) < 1e-9));
});

test("arrange: nothing for an empty progression", () => {
  assert.deepEqual(arrange(["zzz"], "C", findStyle("pop")).events, []);
});

test("eventsBetween wraps the loop and never repeats a note across windows", () => {
  const arr = arrange(["I", "IV"], "C", findStyle("rock"));
  const all = eventsBetween(arr, 0, 0, 16);
  assert.equal(all.length, arr.events.length * 2);
  let joined: number[] = [];
  for (let b = 0; b < 16; b += 0.37) joined = joined.concat(eventsBetween(arr, 0, b, Math.min(16, b + 0.37)).map((x) => x.at));
  assert.deepEqual(joined, all.map((x) => x.at));
  assert.ok(eventsBetween(arr, 4, 2, 4).length === eventsBetween(arr, 0, 6, 8).length);
});

test("tempo clock: a change keeps the past and moves the future", () => {
  const c = new TempoClock(120, 10);
  assert.equal(c.timeAt(4), 12);
  c.setTempo(60, 4);
  assert.equal(c.timeAt(4), 12);
  assert.equal(c.timeAt(5), 13);
  assert.equal(c.beatAt(13), 5);
  assert.equal(clampBpm(1000), 220);
  assert.equal(clampBpm(NaN, 90), 90);
});

test("song: a new arrangement takes over on the next bar line", () => {
  const pop = arrange(["I", "V", "vi", "IV"], "C", findStyle("pop"));
  const rock = arrange(["I", "V", "vi", "IV"], "C", findStyle("rock"));
  const song = new Song(pop);
  song.take(0, 5.1);
  song.queue(rock, false);
  assert.equal(song.arrangement, rock);
  const notes = song.take(5.1, 9);
  assert.ok(notes.filter((n) => n.at < 8).every((n) => pop.events.includes(n.ev)));
  assert.ok(notes.filter((n) => n.at >= 8).every((n) => rock.events.includes(n.ev)));
  // kept its place: bar 3 is still the third chord
  assert.equal(song.position(8.5)!.chord, 2);
  assert.equal(song.position(6)!.arr, pop);
});

test("song: a new progression starts from its first chord", () => {
  const a = arrange(["I", "V", "vi", "IV"], "C", findStyle("pop"));
  const b = arrange(["i", "bVII"], "A", findStyle("pop"));
  const song = new Song(a);
  song.take(0, 6);
  song.queue(b, true);
  song.take(6, 9);
  const p = song.position(8)!;
  assert.equal(p.chord, 0);
  assert.equal(p.beat, 0);
  assert.equal(song.position(12)!.chord, 1);
});

test("song: a waltz after 4/4 restarts on the bar line", () => {
  const song = new Song(arrange(["I", "IV"], "C", findStyle("pop")));
  song.take(0, 1);
  song.queue(arrange(["I", "IV"], "C", findStyle("waltz")), false);
  const notes = song.take(1, 7);
  assert.ok(notes.some((n) => n.at === 4 && n.ev.lane === "kick"));
  assert.equal(song.position(7)!.beat, 0);
  assert.equal(song.position(7)!.beatsPerBar, 3);
});

test("styles: every 4/4 style plays its groove", () => {
  for (const style of STYLES.filter((s) => s.beatsPerBar === 4)) {
    const groove = findGroove(style.id);
    assert.ok(groove, style.id);
    assert.deepEqual(style.drums, groove.drums, style.id);
    assert.deepEqual(style.bass, groove.bass, style.id);
  }
});

test("chord symbols read as numerals in a key, and back to the same chords", () => {
  const read = (chords: string[], tonic: string) => chords.map((c) => numeralOfChord(c, tonic));
  assert.deepEqual(read(["Dm7", "G7", "Cmaj7", "Am", "F", "Bdim", "Bm7b5", "Bbmaj7", "F#dim7"], "C"), ["ii7", "V7", "Imaj7", "vi", "IV", "vii°", "viiø7", "bVIImaj7", "#iv°7"]);
  assert.deepEqual(read(["Am", "G", "F", "E7", "Esus4"], "A"), ["i", "bVII", "bVI", "V7", "Vsus4"]);
  assert.deepEqual(read(["Gm7", "C7", "Fmaj7"], "F"), ["ii7", "V7", "Imaj7"]);
  assert.deepEqual(read(["Eb", "Bb7"], "Eb"), ["I", "V7"]);
  assert.equal(numeralOfChord("zz", "C"), null);
});

test("settings: the band's own numerals play instead of the progression until cleared", () => {
  const own = clampSettings({ ...DEFAULT_SETTINGS, numerals: ["I", "V", "nope", "vi:2"] });
  assert.deepEqual(own.numerals, ["I", "V", "vi:2"]);
  assert.deepEqual(playedNumerals(own), ["I", "V", "vi:2"]);
  assert.equal(bandMode(own), "major");
  assert.equal(bandMode({ ...own, numerals: ["i", "bVII"] }), "minor");
  const cleared = clampSettings({ numerals: null, progression: "blues" }, own);
  assert.equal(cleared.numerals, null);
  assert.equal(playedNumerals(cleared)[0], "I7");
  assert.deepEqual(clampSettings({}, own).numerals, own.numerals);
  assert.equal(cleanNumerals(["nope"]), null);
  assert.equal(cleanNumerals(Array(30).fill("I"))!.length, 16);
});
