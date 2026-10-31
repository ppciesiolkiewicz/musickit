import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COURSE, byTopic, findSection, nextSection, prevSection } from "./course";
import { TOPICS, pcAt } from "./model";

describe("course structure", () => {
  it("stages run 1–11", () => {
    assert.deepEqual(COURSE.map((s) => s.slug), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  });
  it("position 1 and first open chords have the agreed sections", () => {
    const slugs = (st: string) => COURSE.find((s) => s.slug === st)!.sections.map((x) => x.slug);
    assert.deepEqual(slugs("5"), ["chords", "triads", "fifths", "power-chords", "arpeggios", "one-four-five", "pentatonic", "major-pentatonic", "soloing", "bends-and-slides", "move-it"]);
    assert.deepEqual(slugs("2"), ["em-and-am", "c-d-g", "e-a-dm", "one-minute-changes", "all-downstrums", "island-strum", "sixteenths", "first-songs"]);
  });
  it("section slugs are unique within a stage and URL-safe", () => {
    COURSE.forEach((s) => {
      const slugs = s.sections.map((x) => x.slug);
      assert.equal(new Set(slugs).size, slugs.length, s.slug);
      slugs.forEach((x) => assert.match(x, /^[a-z0-9-]+$/));
    });
  });
  it("every section has a known topic", () => {
    const ids = new Set(TOPICS.map((t) => t.id));
    COURSE.forEach((s) => s.sections.forEach((x) => assert.ok(ids.has(x.topic), `${s.slug}/${x.slug}`)));
  });
  it("next and previous cross stage boundaries and stop at the ends", () => {
    assert.equal(nextSection("1", "notes-on-e-and-a")?.section.slug, "em-and-am");
    assert.equal(nextSection("11", "guide-tones"), undefined);
    assert.equal(prevSection("1", "strings-and-tuning"), undefined);
    assert.equal(prevSection("2", "em-and-am")?.section.slug, "notes-on-e-and-a");
  });
  it("unknown stages and sections are not found", () => {
    assert.equal(findSection("5", "nope"), undefined);
    assert.equal(findSection("12", "chords"), undefined);
  });
  it("topic view starts with basics and gathers the strumming sections", () => {
    const groups = byTopic();
    assert.equal(groups[0].topic.id, "basics");
    assert.deepEqual(groups.find((g) => g.topic.id === "strumming")!.items.map((i) => i.section.slug), ["all-downstrums", "island-strum", "sixteenths"]);
  });
  it("pcAt reads pitch classes off the neck (string 0 = low E)", () => {
    assert.equal(pcAt(0, 3), 7);
    assert.equal(pcAt(2, 0), 2);
    assert.equal(pcAt(5, 0), 4);
  });
});
