import { test } from "node:test";
import assert from "node:assert/strict";
import { THEORY_SECTIONS } from "@/features/theory/sections";
import { filterTiles, practiceTiles } from "./tiles";

const groups = practiceTiles();
const all = groups.flatMap((g) => g.tiles);
const groupOf = (href: string) => groups.find((g) => g.tiles.some((t) => t.href === href))?.label;

test("the groups come in order: Guitar, Singing, Play along, Tuning & theory, Learn", () => {
  assert.deepEqual(groups.map((g) => g.label), ["Guitar", "Singing", "Play along", "Tuning & theory", "Learn"]);
});

test("every page has one tile, except the plan and the notes creator, which are in the nav", () => {
  const hrefs = all.map((t) => t.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const s of THEORY_SECTIONS) {
    const navItem = s.href === "/plan" || s.href.startsWith("/teachers/studio");
    assert.equal(hrefs.includes(s.href), !navItem, s.href);
  }
});

test("tools sit where a player looks for them", () => {
  assert.equal(groupOf("/tuner"), "Tuning & theory");
  assert.equal(groupOf("/theory/circle"), "Tuning & theory");
  assert.equal(groupOf("/looper"), "Play along");
  assert.equal(groupOf("/theory/chords"), "Guitar");
  assert.equal(groupOf("/theory/ears"), "Singing");
  assert.equal(groupOf("/course"), "Learn");
  assert.equal(groupOf("/theory/basics"), "Learn");
});

test("the headline tools are wide", () => {
  assert.deepEqual(all.filter((t) => t.wide).map((t) => t.href).sort(), ["/course", "/looper", "/theory/chords", "/theory/scales", "/tuner"]);
});

test("the filter keeps every tile for an empty search", () => {
  assert.deepEqual(filterTiles(groups, "  "), groups);
});

test("the filter needs every word, in the name, description or group, in any case", () => {
  const hrefs = (q: string) => filterTiles(groups, q).flatMap((g) => g.tiles.map((t) => t.href));
  assert.deepEqual(hrefs("SING int").sort(), ["/theory/ears", "/theory/singing/intervals"]);
  assert.ok(hrefs("tuner").includes("/tuner"));
  assert.ok(hrefs("singing").includes("/theory/ears"), "matches by group");
  assert.ok(hrefs("movable").includes("/theory/chords"), "matches by description");
});

test("the filter drops groups with no match, and finds nothing for nonsense", () => {
  assert.deepEqual(filterTiles(groups, "looper").map((g) => g.label), ["Play along"]);
  assert.deepEqual(filterTiles(groups, "zzzz"), []);
});
