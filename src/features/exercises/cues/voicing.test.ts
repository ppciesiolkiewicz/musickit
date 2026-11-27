import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shapeFromFrets } from "./voicing";
import { parseToolDiag, toolInterface } from "@/features/plan/model/tools";
import { ARTICLES } from "@/features/articles";

describe("shapeFromFrets", () => {
  it("roots the shape on its lowest root string, with the library's fingers where the strings match", () => {
    const am = shapeFromFrets("Am", "5 7 7 5 x x")!;
    assert.equal(am.shape.rs, 6);
    assert.equal(am.fret, 5);
    assert.deepEqual(am.shape.f, [0, 2, 2, 0, null, null]);
    assert.deepEqual(am.shape.fg, [1, 3, 4, 1, null, null]);
    assert.deepEqual(am.midi, [45, 52, 57, 60]);
  });
  it("finds a root above the B string, and names a 9th as 9", () => {
    assert.equal(shapeFromFrets("F", "x x x 2 1 1")!.shape.rs, 1);
    assert.equal(shapeFromFrets("B", "x x x 4 4 2")!.shape.rs, 3);
    assert.deepEqual(shapeFromFrets("C9", "x 3 2 3 3 x")!.shape.n, { 2: "9" });
  });
  it("refuses frets that play a note outside the chord, have no root, or don't parse", () => {
    assert.equal(shapeFromFrets("Am", "5 7 7 6 x x"), null);
    assert.equal(shapeFromFrets("C", "x x x x 1 0"), null);
    assert.equal(shapeFromFrets("Am", "5 7 7 5 x"), null);
    assert.equal(shapeFromFrets("Am", "5 7 7 5 y x"), null);
  });
});

describe("chord-shapes frets", () => {
  it("keeps frets that play the chord and drops the rest with a note", () => {
    const r = parseToolDiag({ type: "chord-shapes", chords: ["Am", "C"], frets: ["5 7 7 5 x x", "x 3 2 1 1 1"] });
    assert.deepEqual(r.tool, { type: "chord-shapes", chords: ["Am", "C"], frets: ["5 7 7 5 x x", null] });
    assert.ok(r.notes.some((n) => n.includes("don't play C")));
  });
  it("are never offered to the AI", () => {
    const line = toolInterface().find((l) => l.startsWith("- chord-shapes"))!;
    assert.doesNotMatch(line, /^\s*frets\??:/m);
  });
  it("every article's frets play their chord", () => {
    const tools = ARTICLES.flatMap((a) => a.blocks.flatMap((b) => (b.type === "exercise" ? [b.tool, b.beside, ...(b.parts ?? []).map((p) => p.tool)] : [])));
    tools.filter((t) => t?.type === "chord-shapes" && Array.isArray(t.frets)).forEach((t) =>
      (t!.frets as (string | null)[]).forEach((f, i) => f && assert.ok(shapeFromFrets((t!.chords as string[])[i], f), `${(t!.chords as string[])[i]} ${f}`)));
  });
  it("takes fingers only from a library shape that sits at the same fret, so a moved open shape doesn't keep an open string's empty finger", () => {
    const c7 = shapeFromFrets("C7", "x 3 2 3 1 x")!;
    assert.deepEqual(c7.shape.fg, [null, 3, 2, 4, 1, null]);
  });
  it("takes fingers from a bigger library shape that holds every note on the same frets", () => {
    assert.deepEqual(shapeFromFrets("Bm", "x x 4 4 3 2")!.shape.fg?.slice(2), shapeFromFrets("Bm", "x 2 4 4 3 2")!.shape.fg?.slice(2));
    assert.ok(shapeFromFrets("Bm", "x x 4 4 3 2")!.shape.fg?.slice(2).every((g) => g !== null));
  });
  it("takes fingers written after a bar, and refuses ones that don't fit the frets", () => {
    assert.deepEqual(shapeFromFrets("Fmaj7", "1 x 2 2 1 x | 1 x 3 4 2 x")!.shape.fg, [1, null, 3, 4, 2, null]);
    assert.equal(shapeFromFrets("Fmaj7", "1 x 2 2 1 x | 1 2 3 4 2 x"), null);
  });
});
