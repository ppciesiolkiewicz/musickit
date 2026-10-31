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

  it("finds modes, scales and chords, the longer term first", () => {
    assert.deepEqual(terms(explain(["Dorian is a mode: play the scale over a power chord, then a barre chord and its chord tones."])[0]),
      ["dorian:Dorian", "mode:mode", "scale:scale", "power-chord:power chord", "barre-chord:barre chord", "chord-tones:chord tones"]);
    assert.deepEqual(terms(explain(["A ii–V–I, then a 2-5-1 in the scale-neck."])[0]), ["ii-v-i:ii–V–I"]);
  });

  it("names every term once, each with an article", () => {
    assert.equal(new Set(GLOSSARY.map((t) => t.id)).size, GLOSSARY.length);
    GLOSSARY.forEach((t) => assert.ok(t.forms.length && t.short && t.label, t.id));
  });

  it("finds the basics words", () => {
    assert.deepEqual(terms(explain(["Hold the tonic as a drone, sing each scale degree, a half step then a whole step up to the octave."])[0]),
      ["home-note:tonic", "drone:drone", "degree:scale degree", "half-step:half step", "whole-step:whole step", "octave:octave"]);
    assert.deepEqual(terms(explain(["Count the beats of each bar, then the spider with alternate picking, a hammer-on, a pull-off: legato."])[0]),
      ["beat:beats", "bar:bar", "spider:spider", "alternate-picking:alternate picking", "hammer-on:hammer-on", "pull-off:pull-off", "legato:legato"]);
  });

  it("bar stays out of longer words", () => {
    assert.deepEqual(terms(explain(["A barre chord, then a 12-bar blues on the root note."])[0]), ["barre-chord:barre chord", "twelve-bar:12-bar blues", "root:root"]);
    assert.deepEqual(terms(explain(["Play a bar chord at fret 5."])[0]), ["barre-chord:bar chord"]);
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
