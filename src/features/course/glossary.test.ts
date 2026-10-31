import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explain, GLOSSARY, type Piece } from "./glossary";
import { findSection } from "./course";

const terms = (pieces: Piece[]) => pieces.flatMap((p) => (typeof p === "string" ? [] : [`${p.term.id}:${p.text}`]));

describe("glossary", () => {
  it("every term links to a course section", () => {
    GLOSSARY.forEach((t) => {
      const m = /^\/course\/([^/]+)\/([^/]+)$/.exec(t.href);
      assert.ok(m && findSection(m[1], m[2]), t.href);
    });
  });

  it("finds plurals, inflections, multi-word and hyphenated forms, any case", () => {
    assert.deepEqual(terms(explain(["Comp with shell voicings on 8th notes, aim at the guide-tones."])[0]),
      ["comp:Comp", "shell:shell voicings", "eighths:8th notes", "guide-tones:guide-tones"]);
    assert.deepEqual(terms(explain(["Keep comping in eighths."])[0]), ["comp:comping", "eighths:eighths"]);
    assert.deepEqual(terms(explain(["Guide\nTones lead."])[0]), ["guide-tones:Guide\nTones"]);
  });

  it("leaves other words alone", () => {
    assert.deepEqual(terms(explain(["Compare the compass, a computer and comp-style."])[0]), []);
  });

  it("marks a term once across all texts and keeps the text intact", () => {
    const out = explain(["Comp here.", "Comp again, then comps."]);
    assert.deepEqual(out.map(terms), [["comp:Comp"], []]);
    assert.equal(out[0].map((p) => (typeof p === "string" ? p : p.text)).join(""), "Comp here.");
  });
});
