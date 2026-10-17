import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { GROUP_LABEL, THEORY_SECTIONS, sectionFor } from "./sections";

const NOT_YET: string[] = [];

describe("theory sections", () => {
  it("hrefs are unique and every group has sections", () => {
    const hrefs = THEORY_SECTIONS.map((s) => s.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
    (Object.keys(GROUP_LABEL) as (keyof typeof GROUP_LABEL)[]).forEach((g) => assert.ok(THEORY_SECTIONS.some((s) => s.group === g), g));
  });
  it("every page exists", () => {
    THEORY_SECTIONS.filter((s) => !s.href.includes("#") && s.href !== "/cheatsheet" && s.href !== "/theory" && !NOT_YET.includes(s.href)).forEach((s) =>
      assert.ok(existsSync(`src/app${s.href}`), s.href));
  });
  it("finds the section for a path", () => {
    assert.equal(sectionFor("/theory/chords")?.label, "Chords");
    assert.equal(sectionFor("/theory/scales/dorian")?.label, "Scales");
    assert.equal(sectionFor("/theory")?.label, "Start here");
    assert.equal(sectionFor("/theory/caged")?.label, "CAGED");
    assert.equal(sectionFor("/tuner"), undefined);
  });
});

describe("section colours", () => {
  it("no two pages in a group share a colour", () => {
    for (const g of Object.keys(GROUP_LABEL)) {
      const tones = THEORY_SECTIONS.filter((s) => s.group === g).map((s) => s.tone);
      assert.equal(new Set(tones).size, tones.length, g);
    }
  });
});
