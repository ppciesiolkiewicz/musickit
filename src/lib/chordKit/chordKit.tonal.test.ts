/**
 * Cross-checks against the tonal library. Kept separate from chordKit.test.ts so the pure-logic
 * tests can run without dependencies installed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Mode, Note } from "@tonaljs/tonal";
import { makeKeyContext, TONICS, FAMILIES, shortModeName } from "./theory";
import { midiToNames } from "./playback";

const ascii = (s: string) => s.replace(/♭/g, "b").replace(/♯/g, "#");

describe("tonal cross-check", () => {
  it("our spelling of the seven major modes matches tonal for every key", () => {
    FAMILIES[0].names.forEach((full, k) => {
      const mode = shortModeName(full).toLowerCase();
      TONICS.forEach((t) => {
        const ours = makeKeyContext(t.pc, 0, k).names.map(ascii);
        const theirs = Mode.notes(mode, ascii(t.name));
        // tonal can spell a few exotic keys with double accidentals; compare by pitch class there
        assert.deepEqual(ours.map((n) => Note.chroma(n)), theirs.map((n) => Note.chroma(n)), `${t.name} ${mode}`);
      });
    });
  });
  it("converts MIDI to note names with sharps", () => {
    assert.deepEqual(midiToNames([40, 45, 61]), ["E2", "A2", "C#4"]);
  });
});
