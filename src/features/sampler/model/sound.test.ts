import assert from "node:assert/strict";
import { test } from "node:test";
import { runtimeFor, sampleIds } from "./sound";

const urls: Record<string, string> = { a: "blob:a", b: "blob:b" };
const urlOf = (id: string) => urls[id] ?? null;

test("one sample tuned across the keys, keyed by its root note", () => {
  assert.deepEqual(runtimeFor({ kind: "pitched", sample: "a", root: 57 }, urlOf), { label: "Sampler", urls: { A3: "blob:a" }, baseUrl: "", attack: 0, release: 0.3, hidden: true });
});

test("no sample, or a missing one, is silent (strict with no samples)", () => {
  for (const sample of [null, "gone"]) assert.deepEqual(runtimeFor({ kind: "pitched", sample, root: 60 }, urlOf), { label: "Sampler", urls: {}, baseUrl: "", strict: true, hidden: true });
});

test("pads: one exact note per pad from C2, empty and missing pads left out", () => {
  const r = runtimeFor({ kind: "pads", samples: ["a", null, "gone", "b"] }, urlOf);
  assert.deepEqual(r.urls, { C2: "blob:a", "D#2": "blob:b" });
  assert.equal(r.strict, true);
  assert.equal(r.hidden, true);
});

test("the samples a spec needs, once each", () => {
  assert.deepEqual(sampleIds({ kind: "pads", samples: ["a", null, "a", "b"] }), ["a", "b"]);
  assert.deepEqual(sampleIds({ kind: "pitched", sample: null, root: 60 }), []);
  assert.deepEqual(sampleIds({ kind: "piano", instrument: "PIANO" }), []);
});
