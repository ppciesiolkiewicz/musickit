import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explain } from "@/features/course/glossary";
import { inlineNote, noteRootFor, splitNotes } from "./noteText";
import type { Section } from "./tools";

describe("note text", () => {
  it("splits {{...}} note tokens out of text", () => {
    assert.deepEqual(splitNotes("Sing {{1}} {{3}} {{5}} {{b7}} up and back"), ["Sing ", { note: "1" }, " ", { note: "3" }, " ", { note: "5" }, " ", { note: "b7" }, " up and back"]);
    assert.deepEqual(splitNotes("{{c-sharp}}, then C"), [{ note: "c-sharp" }, ", then C"]);
    assert.deepEqual(splitNotes("{{x9}} stays"), ["{{x9}} stays"]);
    assert.deepEqual(splitNotes("no tokens"), ["no tokens"]);
  });

  it("reads a token as a degree, else a note name, against the root", () => {
    assert.deepEqual(inlineNote("3", { root: 9 }), { semi: 4, name: "C♯", degreeText: "3", degree: 2, midi: 61 });
    const b7 = inlineNote("b7", { root: 9 })!;
    assert.deepEqual([b7.semi, b7.name, b7.degree], [10, "G", 6]);
    assert.equal(inlineNote("c-sharp", { root: 9 })!.semi, 4);
    assert.equal(inlineNote("c-sharp", { root: 9 })!.degree, 2);
    // a note outside the major scale takes the colour of the degree it is a flat of: C over A is the ♭3
    assert.equal(inlineNote("c", { root: 9 })!.degree, 2);
    assert.equal(inlineNote("g", { root: 9 })!.degree, 6);
    assert.equal(inlineNote("c-sharp", null), null);
    assert.equal(inlineNote("3", null)!.name, "3");
    assert.equal(inlineNote("zz", { root: 0 }), null);
  });

  it("takes the root from the tool after the text, else the one before", () => {
    const text: Section = { type: "text", text: "x" };
    assert.deepEqual(noteRootFor([text, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9 } }], 0), { root: 9 });
    assert.deepEqual(noteRootFor([{ type: "tool", tool: { type: "arpeggio-neck", chord: "D7" } }, text], 1), { root: 2 });
    assert.deepEqual(noteRootFor([text, { type: "tool", tool: { type: "chord-shapes", chords: ["E7"] } }], 0), { root: 4 });
    assert.deepEqual(noteRootFor([text, { type: "tool", tool: { type: "note-finder", query: "" } }], 0), null);
    assert.equal(noteRootFor([text], 0), null);
  });

  it("glossary matching leaves tokens alone", () => {
    const pieces = explain(["{{3}} is a chord tone"])[0];
    assert.equal(typeof pieces[0], "string");
    assert.ok((pieces[0] as string).startsWith("{{3}}"));
  });
});
