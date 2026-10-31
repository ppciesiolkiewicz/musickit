import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS, CONCEPTS, conceptById, conceptsFor } from "./concepts";
import { catalogue, checkLink } from "./catalogue";
import type { Level } from "./types";

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];

test("ids are unique and kebab-case", () => {
  const ids = CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("every buildsOn id exists and comes earlier in CONCEPTS", () => {
  CONCEPTS.forEach((c, i) => {
    for (const b of c.buildsOn ?? []) {
      const j = CONCEPTS.findIndex((x) => x.id === b);
      assert.ok(j >= 0 && j < i, `${c.id} builds on ${b}`);
    }
  });
});

test("conceptsFor returns the level below, then the level", () => {
  const got = conceptsFor("theory", "beginner");
  const levels = got.map((c) => c.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b)));
  assert.ok(levels.includes("new") && levels.includes("beginner"));
  const beginner = got.filter((c) => c.level === "beginner").map((c) => c.label);
  assert.deepEqual(beginner.slice(0, 3), ["Pentatonic (minor & major)", "Major scale", "Natural minor scale"]);
});

test("conceptsFor(area, new) contains only new concepts", () => {
  for (const a of AREAS) assert.ok(conceptsFor(a.id, "new").every((c) => c.level === "new"));
});

test("every course link is in catalogue()", () => {
  const entries = catalogue();
  for (const c of CONCEPTS) if (c.course) assert.equal(checkLink(c.course, entries), c.course, c.id);
});

test("each area at each level has at least 3 concepts", () => {
  for (const a of AREAS) for (const l of LEVELS) {
    assert.ok(CONCEPTS.filter((c) => c.area === a.id && c.level === l).length >= 3, `${a.id} ${l}`);
  }
});

test("conceptById finds a concept", () => {
  assert.equal(conceptById("major-scale")?.label, "Major scale");
  assert.equal(conceptById("nope"), undefined);
});
