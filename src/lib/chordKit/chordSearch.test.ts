import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesText, parseChordQuery } from "./chordSearch";
import { plainEntries } from "./shapeTools";

describe("chord search", () => {
  const p = (q: string) => { const r = parseChordQuery(q); return r && [r.rootPc, [...r.semis].sort((a, b) => a - b)]; };
  it("parses common chord spellings", () => {
    assert.deepEqual(p("C"), [0, [0, 4, 7]]);
    assert.deepEqual(p("Am"), [9, [0, 3, 7]]);
    assert.deepEqual(p("am7"), [9, [0, 3, 7, 10]]);
    assert.deepEqual(p("F#m7"), [6, [0, 3, 7, 10]]);
    assert.deepEqual(p("F♯m"), [6, [0, 3, 7]]);
    assert.deepEqual(p("Bb maj7"), [10, [0, 4, 7, 11]]);
    assert.deepEqual(p("B♭7"), [10, [0, 4, 7, 10]]);
    assert.deepEqual(p("Dsus4"), [2, [0, 5, 7]]);
    assert.deepEqual(p("Cadd9"), [0, [0, 2, 4, 7]]);
    assert.deepEqual(p("E5"), [4, [0, 7]]);
  });
  it("returns null for words and qualities without a root", () => {
    for (const q of ["", "  ", "funk", "bossa", "shell", "open", "dim", "hendrix", "barre"]) assert.equal(parseChordQuery(q), null, q);
  });
  it("text search matches names, variants, tags and notes, every word", () => {
    const all = plainEntries();
    const hits = (q: string) => all.filter((e) => matchesText(e, q));
    assert.ok(hits("hendrix").some((e) => e.shape.suf === "7♯9"));
    assert.ok(hits("shell").every((e) => e.shape.v === "shell" || e.shape.tags.includes("shell")));
    assert.ok(hits("open").length >= 22);
    assert.ok(hits("jazz shell").every((e) => e.shape.tags.includes("jazz")));
    assert.equal(hits("zzzz").length, 0);
  });
});
