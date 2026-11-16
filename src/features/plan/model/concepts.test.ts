import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS, CONCEPTS, OLD_CONCEPT_IDS, conceptById, conceptId, conceptIds, conceptsFor, conceptsOf } from "./concepts";
import { PATH } from "./path";
import { TOPICS, topicById } from "../intake/topics";
import { catalogue, checkLink } from "./catalogue";
import type { Level } from "./types";

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];

test("ids are unique and kebab-case; one concept per track of the path, with its steps", () => {
  const ids = CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.deepEqual(ids, PATH.map((t) => t.id));
  for (const c of CONCEPTS) {
    assert.equal(c.level, c.steps[0].level, c.id);
    assert.deepEqual(c.levels, LEVELS.filter((l) => c.steps.some((s) => s.level === l) || (LEVELS.indexOf(l) > LEVELS.indexOf(c.steps[0].level) && LEVELS.indexOf(l) < LEVELS.indexOf(c.steps.at(-1)!.level))), c.id);
  }
});

test("an old concept id maps to the track that took its place, never to another track of the same id", () => {
  for (const [old, track] of Object.entries(OLD_CONCEPT_IDS)) {
    assert.equal(conceptId(old), track, old);
    if (CONCEPTS.some((c) => c.id === old)) assert.equal(track, old, `${old} is a track id and was merged into ${track}`);
  }
  assert.equal(Object.keys(OLD_CONCEPT_IDS).length, 67);
  assert.equal(conceptById("pentatonic-box-1")?.id, "pentatonic-positions");
  assert.equal(conceptById("top-string-triads")?.id, "triads");
  assert.deepEqual(conceptIds(["top-string-triads", "triads-every-set", "nope", "caged"]), ["triads", "caged"]);
});

test("conceptsFor: the area's concepts with a step at that level or the one below", () => {
  const got = conceptsFor("theory", "beginner");
  assert.ok(got.length > 0);
  for (const c of got) assert.ok(c.levels.includes("new") || c.levels.includes("beginner"), c.id);
  assert.ok(got.some((c) => c.id === "scales"));
  assert.ok(!got.some((c) => c.id === "modes"));
});

test("conceptsFor(area, new) holds only concepts with a new step", () => {
  for (const a of AREAS) assert.ok(conceptsFor(a.id, "new").every((c) => c.levels.includes("new")));
});

test("every course link is in catalogue()", () => {
  const entries = catalogue();
  for (const c of CONCEPTS) if (c.course) assert.equal(checkLink(c.course, entries), c.course, c.id);
});

test("each area at each level has concepts with a step there", () => {
  for (const a of AREAS) for (const l of LEVELS) {
    assert.ok(CONCEPTS.filter((c) => c.area === a.id && c.levels.includes(l)).length >= 3, `${a.id} ${l}`);
  }
});

test("conceptById finds a concept", () => {
  assert.equal(conceptById("scales")?.label, "Scales");
  assert.equal(conceptById("nope"), undefined);
});

test("every concept sits in one topic of its own area, and every topic has a concept", () => {
  for (const c of CONCEPTS) assert.equal(topicById(c.topic)?.area, c.area, c.id);
  for (const t of TOPICS) assert.ok(conceptsOf(t.id).length > 0, t.id);
});

test("the topic of a few concepts", () => {
  assert.equal(conceptById("barre")!.topic, "guitar-barre-chords");
  assert.equal(conceptById("spider")!.topic, "guitar-techniques");
  assert.equal(conceptById("power-chords")!.topic, "guitar-basic-chords");
});
