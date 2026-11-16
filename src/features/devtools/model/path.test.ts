import { test } from "node:test";
import assert from "node:assert/strict";
import { TOPICS } from "@/features/plan/intake/topics";
import { AREAS, CONCEPTS, type Concept } from "@/features/plan/model/concepts";
import { areaPath, chain, gaps, pathNodes, wrap, type PathSource } from "./path";

/** A concept with one step at its level, which names the first step of each concept in `buildsOn` to learn first. */
const concept = (id: string, level: Concept["level"], topic: string, buildsOn?: string[], course?: string): Concept =>
  ({ id, area: "guitar", level, levels: [level], label: id, topic, course, merges: [], steps: [{ level, name: id, holds: "", ...(buildsOn ? { after: buildsOn.map((b) => `${b}:1`) } : {}) }] });

const src: PathSource = {
  concepts: [
    concept("a", "new", "guitar-scales", undefined, "/course/1/a"),
    concept("b", "beginner", "guitar-scales", ["a"], "/course/1/b"),
    concept("c", "advanced", "guitar-caged", ["b"]),
    concept("d", "new", "guitar-caged"),
    { ...concept("v", "new", "voice-pitch", ["a"]), area: "voice" },
  ],
  exercises: [{ id: "ex-a", concepts: ["a", "b"] }],
  plans: [{ id: "plan-1", concepts: ["b"] }],
  written: new Set(["/course/1/a"]),
  steps: { b: { from: "a ladder", steps: [{ name: "one", holds: "x", level: "beginner", planned: false }, { name: "two", holds: "y", level: "beginner", planned: true }] } },
};

test("a node carries both directions of buildsOn, its examples and whether its course page is written", () => {
  const nodes = pathNodes(src);
  const b = nodes.get("b")!;
  assert.deepEqual([b.level, b.buildsOn, b.leadsTo], [1, ["a"], ["c"]]);
  assert.deepEqual([b.exercises, b.plans, b.courseState], [["ex-a"], ["plan-1"], "planned"]);
  assert.deepEqual([b.steps.map((s) => s.name), b.stepsFrom, nodes.get("a")!.steps], [["one", "two"], "a ladder", []]);
  assert.equal(nodes.get("a")!.courseState, "written");
  assert.equal(nodes.get("c")!.courseState, "none");
  assert.deepEqual(nodes.get("a")!.leadsTo, ["b", "v"]);
});

test("an area is its topics as lanes with a cell per level; an arrow from another area is listed apart", () => {
  const nodes = pathNodes(src);
  const guitar = areaPath("guitar", nodes);
  assert.equal(guitar.lanes.length, 6);
  const scales = guitar.lanes.find((l) => l.topic.id === "guitar-scales")!;
  assert.deepEqual(scales.cells.map((cell) => cell.map((n) => n.id)), [["a"], ["b"], [], []]);
  assert.deepEqual(guitar.edges, [["a", "b"], ["b", "c"]]);
  assert.deepEqual(areaPath("voice", nodes).outside, [["a", "v"]]);
});

test("a chain is everything under and over the concept, not its siblings", () => {
  const nodes = pathNodes(src);
  assert.deepEqual([...chain("b", nodes)].sort(), ["a", "b", "c"]);
  assert.deepEqual([...chain("a", nodes)].sort(), ["a", "b", "c", "v"]);
  assert.deepEqual([...chain("d", nodes)], ["d"]);
  assert.deepEqual([...chain("gone", nodes)], ["gone"]);
});

test("gaps count the concepts with no example exercise, no example plan, no written course page and no steps", () => {
  assert.deepEqual(gaps([...pathNodes(src).values()]), { concepts: 5, noExercise: 3, noPlan: 4, planned: 4, noSteps: 4, stepsPlanned: 1 });
});

test("the real catalogue: every concept lands in one lane of its area, and what it builds on starts no higher than it ends", () => {
  const nodes = pathNodes();
  assert.equal(nodes.size, CONCEPTS.length);
  let placed = 0;
  for (const { id } of AREAS) {
    const path = areaPath(id, nodes);
    assert.deepEqual(path.lanes.map((l) => l.topic.id), TOPICS.filter((t) => t.area === id).map((t) => t.id));
    placed += path.lanes.reduce((n, l) => n + l.cells.reduce((m, cell) => m + cell.length, 0), 0);
  }
  assert.equal(placed, CONCEPTS.length);
  for (const n of nodes.values()) {
    assert.ok(n.to >= n.level, n.id);
    for (const from of n.buildsOn) assert.ok(nodes.get(from)!.level <= n.to, `${from} → ${n.id}`);
  }
});

test("wrap keeps a short label whole and breaks a long one into two lines", () => {
  assert.deepEqual(wrap("Open chords", 26), ["Open chords"]);
  assert.deepEqual(wrap("Melodies (open position, a few strings)", 26), ["Melodies (open position, a", "few strings)"]);
  const [, second] = wrap("Melodies (up the neck, eighths and dotted notes) and then some more", 26);
  assert.ok(second.length <= 26 && second.endsWith("…"));
});
