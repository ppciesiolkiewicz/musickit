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
    THEORY_SECTIONS.filter((s) => !s.href.includes("#") && s.href !== "/teachers/studio?notes=1" && !NOT_YET.includes(s.href)).forEach((s) =>
      assert.ok(existsSync(`src/app${s.href}`), s.href));
  });
  it("finds the section for a path", () => {
    assert.equal(sectionFor("/theory/chords")?.label, "Chords");
    assert.equal(sectionFor("/theory/scales/dorian")?.label, "Scales");
    assert.equal(sectionFor("/theory"), undefined);
    assert.equal(sectionFor("/theory/caged")?.label, "CAGED");
    assert.equal(sectionFor("/tuner")?.group, "tools");
    assert.equal(sectionFor("/theory/singing")?.group, "singing");
    assert.equal(sectionFor("/theory/singing/runs")?.label, "Sing runs");
    assert.equal(sectionFor("/faq"), undefined);
  });
  it("the course is the first thing to learn", () => {
    assert.equal(THEORY_SECTIONS.find((s) => s.group === "learn")?.href, "/course");
  });
});

describe("section colours", () => {
  it("no two pages in a menu column share a colour", () => {
    for (const col of new Set(THEORY_SECTIONS.map((s) => `${s.group}:${s.sub ?? ""}`))) {
      const tones = THEORY_SECTIONS.filter((s) => `${s.group}:${s.sub ?? ""}` === col).map((s) => s.tone);
      assert.equal(new Set(tones).size, tones.length, col);
    }
  });
});
