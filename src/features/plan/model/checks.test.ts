import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mixesSingAndPlay } from "./checks";
import type { Section } from "./tools";

const text = (t: string): Section => ({ type: "text", text: t });
const tool = (t: Section extends infer S ? (S extends { tool: infer T } ? T : never) : never): Section => ({ type: "tool", tool: t });
const drone: Section = tool({ type: "click-drone", bpm: 60, key: 0 });

describe("mixesSingAndPlay", () => {
  it("flags playing a note on the instrument and singing it back", () => {
    const s = [drone, text("Play Do on the guitar, then sing it back"), tool({ type: "arpeggio-neck", chord: "C" })];
    assert.equal(mixesSingAndPlay(s), true);
  });
  it("flags a mic staff next to an instrument tool", () => {
    const s = [tool({ type: "staff", scale: "major", key: 0, voice: "baritone" }), tool({ type: "scale-neck", scale: "major", key: 0 })];
    assert.equal(mixesSingAndPlay(s), true);
  });
  it("ignores a staff with the mic off", () => {
    const s = [tool({ type: "staff", scale: "major", key: 0, voice: "baritone", mic: false }), tool({ type: "scale-neck", scale: "major", key: 0 })];
    assert.equal(mixesSingAndPlay(s), false);
  });
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
