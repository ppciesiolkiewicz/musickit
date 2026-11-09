import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mixesSingAndPlay, tempoWithoutMetronome } from "./checks";
import type { Section } from "./tools";

const text = (t: string): Section => ({ type: "text", text: t });
const tool = (t: Extract<Section, { type: "tool" }>["tool"]): Section => ({ type: "tool", tool: t });
const drone: Section = tool({ type: "backing-band", bpm: 60, key: 0, parts: { click: "on", drone: "on" } });

describe("mixesSingAndPlay", () => {
  it("flags playing a note on the instrument and singing it back", () => {
    const s = [drone, text("Play Do on the guitar, then sing it back"), tool({ type: "arpeggio-neck", chord: "C" })];
    assert.equal(mixesSingAndPlay(s), true);
  });
  it("does not count an instrument tool shown as a visual", () => {
    const s = [tool({ type: "staff", scale: "major", key: 0, voice: "baritone" }), tool({ type: "scale-neck", scale: "major", key: 0 })];
    assert.equal(mixesSingAndPlay(s), false);
  });
  it("flags sing then find it on the guitar", () => assert.equal(mixesSingAndPlay([text("Sing it, then find it on the guitar")]), true));
  it("ignores 'pick' a key", () => assert.equal(mixesSingAndPlay([tool({ type: "melody-singer", tune: 0, key: 0 }), text("Pick a comfortable key and sing the root")]), false));
  it("ignores 'fret' as a question", () => assert.equal(mixesSingAndPlay([text("Which fret is Do on? Sing it")]), false));
  it("ignores the Play button and sing-along", () => assert.equal(mixesSingAndPlay([text("Press the Play button, then sing along")]), false));
  it("ignores playing along with a track", () => assert.equal(mixesSingAndPlay([text("Play along with the track and sing the 3rd")]), false));
  it("ignores 'let the app play'", () => assert.equal(mixesSingAndPlay([text("Let the app play Do, then sing it")]), false));
  it("ignores a neck shown while singing", () => assert.equal(mixesSingAndPlay([tool({ type: "scale-neck", scale: "major", key: 0 }), text("Look at the neck, then sing the degrees")]), false));
  it("ignores descriptive 'singing'", () => assert.equal(mixesSingAndPlay([text("Singing trains your ear. Play the scale slowly.")]), false));
  it("allows singing over a backing that plays", () => {
    assert.equal(mixesSingAndPlay([drone, text("Sing the 3rd while the chords play")]), false);
  });
  it("allows playing alone", () => {
    assert.equal(mixesSingAndPlay([tool({ type: "scale-neck", scale: "major", key: 0 }), text("play box 1")]), false);
  });
  it("ignores 'press Play' as playing", () => {
    assert.equal(mixesSingAndPlay([tool({ type: "melody-singer", tune: 0, key: 0 }), text("press Play to hear it, then sing")]), false);
  });
  it("ignores the app playing something to listen to", () => {
    assert.equal(mixesSingAndPlay([text("Listen to the app play the chord, then sing its root")]), false);
  });
  it("ignores a listening-only tool", () => {
    assert.equal(mixesSingAndPlay([tool({ type: "interval-ears", query: "m3" })]), false);
  });
  it("reads list items", () => {
    assert.equal(mixesSingAndPlay([{ type: "list", items: ["Strum the chord", "Sing the root"] }]), true);
  });
});

describe("tempoWithoutMetronome", () => {
  const shapes = tool({ type: "chord-shapes", chords: ["Em", "Am"] });
  it("flags a tempo with no metronome", () => {
    assert.equal(tempoWithoutMetronome([text("Strum Em and Am, play it at 80"), shapes]), true);
    assert.equal(tempoWithoutMetronome([{ type: "list", items: ["Change chords at 60 bpm"] }, shapes]), true);
  });
  it("passes with a tool that sounds the beat", () => {
    assert.equal(tempoWithoutMetronome([text("Play it at 80"), drone]), false);
    assert.equal(tempoWithoutMetronome([text("Play it at 80"), tool({ type: "strum-along", chords: ["Em"], bpm: 80 })]), false);
  });
  it("a staff with its click sounds the beat; with only its drone it doesn't", () => {
    assert.equal(tempoWithoutMetronome([text("Sing at 80 bpm"), tool({ type: "staff", scale: "major-ionian", key: 0, voice: "tenor", click: true, bpm: 80 })]), false);
    assert.equal(tempoWithoutMetronome([text("Sing at 80 bpm"), tool({ type: "staff", scale: "major-ionian", key: 0, voice: "tenor", drone: true })]), true);
  });
  it("a backing band with only its drone is no metronome", () => {
    assert.equal(tempoWithoutMetronome([text("Sing at 80 bpm"), tool({ type: "backing-band", bpm: 80, key: 0, parts: { drone: "always" } })]), true);
  });
  it("ignores numbers that are not a tempo", () => {
    assert.equal(tempoWithoutMetronome([text("Play at 12 fret positions? No: at 80% speed, for at 10 minutes"), shapes]), false);
    assert.equal(tempoWithoutMetronome([text("Strum it slowly"), shapes]), false);
  });
});
