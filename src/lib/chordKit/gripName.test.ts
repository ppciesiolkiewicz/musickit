import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gripName } from "./gripName";

// MIDI: low E string open is 40, A 45, D 50, G 55, B 59, high e 64
describe("gripName", () => {
  it("names a rootless E9 shell by its usual name, the ninth in the bass", () => {
    // A9 D6 G7 B5: F♯ G♯ D E
    const g = gripName([54, 56, 62, 64]);
    assert.equal(g?.name, "E9");
    assert.deepEqual(g?.labels, ["9", "3", "♭7", "R"]);
  });

  it("names an open A major and a G major as plain letters", () => {
    assert.equal(gripName([45, 52, 57, 61, 64])?.name, "A");
    assert.equal(gripName([43, 47, 50, 55, 59, 67])?.name, "G");
  });

  it("names a minor seventh and a major seventh", () => {
    assert.equal(gripName([45, 52, 55, 60, 64])?.name, "Am7");
    assert.equal(gripName([48, 52, 55, 59, 64])?.name, "Cmaj7");
  });

  it("takes the chord the caller already has when it holds every note", () => {
    const g = gripName([45, 52, 55, 60, 64], "C6/A");
    assert.equal(g?.name, "C6");
    assert.deepEqual(g?.labels, ["6", "3", "5", "R", "3"]);
  });

  it("falls back to reading the notes when the given chord leaves one out", () => {
    assert.equal(gripName([45, 52, 55, 60, 64], "A")?.name, "Am7");
  });

  it("keeps the slash for an inversion", () => {
    // C E G C with E lowest
    assert.equal(gripName([52, 55, 60, 64])?.name, "C/E");
  });

  it("gives nothing for one note", () => {
    assert.equal(gripName([45]), null);
  });
});
