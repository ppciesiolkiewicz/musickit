import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { GROUP_LABEL, THEORY_SECTIONS, sectionFor, sectionsIn, type SectionGroup } from "./sections";

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
    for (const g of Object.keys(GROUP_LABEL) as SectionGroup[]) {
      const items = sectionsIn(g);
      for (const sub of new Set(items.map((s) => s.sub))) {
        const tones = items.filter((s) => s.sub === sub).map((s) => s.tone);
        assert.equal(new Set(tones).size, tones.length, `${g}:${sub ?? ""}`);
      }
    }
  });
});

describe("tools menu", () => {
  it("starts with the AI plan, then the Notes creator", () => {
    const tools = sectionsIn("tools");
    assert.deepEqual(tools.filter((s) => s.sub === tools[0].sub).map((s) => s.href), ["/plan", "/teachers/studio?notes=1"]);
  });
  it("the AI plan and the circle of fifths stay in Learn and show in Tools", () => {
    for (const href of ["/plan", "/theory/circle"]) {
      assert.ok(sectionsIn("learn").some((s) => s.href === href), href);
      assert.ok(sectionsIn("tools").some((s) => s.href === href), href);
    }
  });
  it("tools split into three columns", () => {
    assert.equal(new Set(sectionsIn("tools").map((s) => s.sub)).size, 3);
  });
});
