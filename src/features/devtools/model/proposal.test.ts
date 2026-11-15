import { test } from "node:test";
import assert from "node:assert/strict";
import { TOPICS } from "@/features/plan/intake/topics";
import { CONCEPTS } from "@/features/plan/model/concepts";
import { PROPOSAL, levelIndex, proposalStats, spanOf, stepAt } from "./proposal";
import { LADDERS } from "./steps";

test("every concept of today is merged into exactly one track", () => {
  const seen = new Map<string, string>();
  for (const t of PROPOSAL) for (const id of t.merges) {
    assert.ok(CONCEPTS.some((c) => c.id === id), `${t.id}: ${id} is not a concept`);
    assert.ok(!seen.has(id), `${id} is in ${seen.get(id)} and ${t.id}`);
    seen.set(id, t.id);
  }
  assert.deepEqual(CONCEPTS.filter((c) => !seen.has(c.id)).map((c) => c.id), []);
});

test("track ids are unique; a track sits in a topic of its own area, with the area of what it merges", () => {
  assert.equal(new Set(PROPOSAL.map((t) => t.id)).size, PROPOSAL.length);
  for (const t of PROPOSAL) {
    assert.equal(TOPICS.find((x) => x.id === t.topic)?.area, t.area, t.id);
    for (const id of t.merges) assert.equal(CONCEPTS.find((c) => c.id === id)!.area, t.area, `${t.id}: ${id}`);
  }
});

test("a track's steps never go down a level", () => {
  for (const t of PROPOSAL) {
    assert.ok(t.steps.length > 0, t.id);
    t.steps.forEach((st, i) => i && assert.ok(levelIndex(st.level) >= levelIndex(t.steps[i - 1].level), `${t.id} step ${i + 1}`));
  }
});

test("ladder steps exist and each is used once; `after` points at a real step no higher than its own", () => {
  const used = new Set<string>();
  for (const t of PROPOSAL) for (const st of t.steps) {
    if (st.ladder) {
      const [id, key] = st.ladder.split(":");
      assert.ok(LADDERS.find((l) => l.id === id)?.steps.some((x) => x.key === key), `${t.id}: ${st.ladder}`);
      assert.ok(!used.has(st.ladder), `${st.ladder} used twice`);
      used.add(st.ladder);
    }
    for (const ref of st.after ?? []) {
      const at = stepAt(ref);
      assert.ok(at, `${t.id}: ${ref}`);
      assert.notEqual(at.track.id, t.id, `${t.id}: ${ref} is its own track`);
      assert.ok(levelIndex(at.step.level) <= levelIndex(st.level), `${t.id}: ${ref} is above it`);
    }
  }
});

test("span and counts", () => {
  const triads = PROPOSAL.find((t) => t.id === "triads")!;
  assert.deepEqual(spanOf(triads), [1, 3]);
  const caged = PROPOSAL.find((t) => t.id === "caged")!;
  assert.ok(spanOf(caged)[0] > spanOf(triads)[0], "triads start before CAGED");
  const n = proposalStats(PROPOSAL);
  assert.equal(n.merged, CONCEPTS.length);
  assert.ok(n.spanning > n.tracks / 2);
});
