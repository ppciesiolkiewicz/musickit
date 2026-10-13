import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chordLabel, matchesText, parseChordQuery } from "./chordSearch";
import { keyEntries, plainEntries } from "./shapeTools";
import { SHAPES } from "./shapes";
import { makeKeyContext } from "@/features/theory/theory";
import { activeAnswers, parseEarSettings } from "@/lib/practice/earGame";
import { answerChoices } from "@/lib/practice/noteGame";
import { STAGE_CONTENT } from "@/features/theory/course/stages";

const p = (q: string) => { const r = parseChordQuery(q); return r && [r.rootPc, [...r.semis].sort((a, b) => a - b)]; };

describe("polish", () => {
  it("parses more chord spellings", () => {
    assert.deepEqual(p("Am(maj7)"), [9, [0, 3, 7, 11]]);
    assert.deepEqual(p("C MAJ7"), [0, [0, 4, 7, 11]]);
    assert.deepEqual(p("CΔ7"), [0, [0, 4, 7, 11]]);
    assert.deepEqual(p("C/G"), [0, [0, 4, 7]]);
  });
  it("names the chord neatly, not as typed", () => {
    assert.equal(chordLabel("c major"), "C");
    assert.equal(chordLabel("am7"), "Am7");
    assert.equal(chordLabel("bb maj7"), "B♭maj7");
    assert.equal(chordLabel("f#m"), "F♯m");
  });
  it("a word that is a tag matches the tag only", () => {
    const hits = plainEntries().filter((e) => matchesText(e, "open"));
    assert.ok(hits.every((e) => e.shape.at !== undefined), "no movable m11");
    assert.equal(hits.length, 22);
  });
  it("power chords carry a power tag and stay out of key views", () => {
    SHAPES.filter((s) => s.suf === "5").forEach((s) => assert.ok(s.tags.includes("power")));
    assert.ok(keyEntries(makeKeyContext(7, 0, 0)).every((e) => e.shape.fam !== "power"));
  });
  it("activeAnswers does not touch the settings", () => {
    const s = parseEarSettings(new URLSearchParams("set=12,7,5"));
    activeAnswers(s);
    assert.deepEqual(s.custom, [12, 7, 5]);
  });
  it("name mode always offers the right answer", () => {
    assert.deepEqual(answerChoices(true, 4), [0, 2, 4, 5, 7, 9, 11]);
    assert.ok(answerChoices(true, 10).includes(10));
    assert.equal(answerChoices(false, 1).length, 12);
  });
  it("stage songs fit the spec: 3 to 5 per stage, chords taught by then", () => {
    STAGE_CONTENT.forEach((s) => { const n = s.tracks.flatMap((t) => t.songs ?? []).length; assert.ok(n >= 3 && n <= 5, `stage ${s.n}: ${n}`); });
    const st2 = STAGE_CONTENT[1].tracks.flatMap((t) => t.songs ?? []).flatMap((s) => s.chords);
    assert.ok(!st2.includes("A7sus4"));
  });
});
