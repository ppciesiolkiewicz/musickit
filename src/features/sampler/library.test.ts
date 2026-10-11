import assert from "node:assert/strict";
import { test } from "node:test";
import { createSampleLibrary } from "./library";
import { createMemoryStore } from "./store/memory";
import type { SamplerStore } from "./store/types";

test("a library whose saved list could not be opened refuses to add, so it never overwrites that list", async () => {
  const saved: unknown[] = [];
  const store: SamplerStore = { ...createMemoryStore(), loadProject: () => Promise.reject(new Error("blocked")), saveProject: async (p) => void saved.push(p) };
  const lib = createSampleLibrary(() => store);
  await assert.rejects(lib.addAudio(new Blob([new Uint8Array([1])]), "kick.wav", "upload"), /could not be opened/i);
  assert.deepEqual(saved, []);
  assert.equal(lib.get().error, "Could not open saved samples.");
});

test("a library that loaded adds and saves", async () => {
  const store = createMemoryStore();
  const lib = createSampleLibrary(() => store);
  const meta = await lib.addAudio(new Blob([new Uint8Array([1])]), "kick.wav", "upload");
  assert.equal(meta.name, "kick");
  assert.deepEqual(((await store.loadProject()) as { samples: { id: string }[] }).samples.map((s) => s.id), [meta.id]);
});
