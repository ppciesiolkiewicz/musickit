import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { GROUP_LABEL, THEORY_SECTIONS, sectionFor } from "./sections";

const NOT_YET: string[] = ["/theory/basics", "/theory/notes", "/theory/ears"];

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
