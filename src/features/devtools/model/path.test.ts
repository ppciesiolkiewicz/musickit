import { test } from "node:test";
import assert from "node:assert/strict";
import { CONCEPTS, type Concept } from "@/features/plan/model/concepts";
import { pathNodes, type PathSource } from "./path";

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

test("the real catalogue: one node per concept, and what it builds on starts no higher than it ends", () => {
  const nodes = pathNodes();
  assert.equal(nodes.size, CONCEPTS.length);
  for (const n of nodes.values()) {
    assert.ok(n.to >= n.level, n.id);
    for (const from of n.buildsOn) assert.ok(nodes.get(from)!.level <= n.to, `${from} → ${n.id}`);
  }
});
