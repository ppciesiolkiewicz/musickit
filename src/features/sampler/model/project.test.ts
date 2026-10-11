import assert from "node:assert/strict";
import { test } from "node:test";
import { addSample, emptyProject, removeSample, renameSample, sanitiseProject, uniqueId } from "./project";
import type { SampleMeta } from "./types";

const sample = (id: string): SampleMeta => ({ id, name: id, source: "upload", mime: "audio/wav", bytes: 1, createdAt: 1 });

test("samples are added, renamed and removed", () => {
  let p = addSample(addSample(emptyProject(), sample("a")), sample("b"));
  p = renameSample(p, "a", "  Kick  ");
  assert.equal(p.samples[0].name, "Kick");
  assert.equal(renameSample(p, "a", "   ").samples[0].name, "Kick");
  assert.deepEqual(removeSample(p, "a").samples.map((s) => s.id), ["b"]);
});

test("sanitise drops junk and duplicates and ignores old instruments", () => {
  const p = sanitiseProject({ samples: [sample("a"), sample("a"), { id: 5 }, null, { ...sample("b"), source: "weird", name: "" }], instruments: [{ id: "i1", pads: { C3: "a" } }] });
  assert.deepEqual(p.samples.map((s) => [s.id, s.source, s.name]), [["a", "upload", "a"], ["b", "upload", "Sample"]]);
  assert.deepEqual(Object.keys(p), ["version", "samples"]);
  assert.deepEqual(sanitiseProject("nope"), emptyProject());
});

test("uniqueId skips taken ids", () => {
  const first = uniqueId("s", [], () => 0.5);
  const rolls = [0.5, 0.25];
  let n = 0;
  assert.equal(uniqueId("s", [first], () => rolls[n++]), uniqueId("s", [], () => 0.25));
});
