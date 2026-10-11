import assert from "node:assert/strict";
import { test } from "node:test";
import { getRuntimeInstrument } from "@/features/sound/engine/runtime";
import { makeGeneratorVoice } from "./generatorVoice";
import { forgetSample } from "./sampleUrls";
import { createMemoryStore } from "./store/memory";

const node = {} as AudioNode;
const tick = () => new Promise((r) => setTimeout(r, 10));

test("a sample deleted from the library goes silent at once, though the instrument still names it", async () => {
  const store = createMemoryStore();
  await store.putAudio("a", new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }));
  const listeners = new Set<() => void>();
  const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
  const voice = makeGeneratorVoice(node, { kind: "pads", samples: ["a"] }, store, subscribe);
  await voice.preload().catch(() => undefined);
  const rid = [...Array(50).keys()].map((i) => `sampler:voice${i}`).find((id) => getRuntimeInstrument(id));
  assert.ok(rid);
  assert.deepEqual(Object.keys(getRuntimeInstrument(rid)!.urls), ["C2"]);
  // the order the library uses: audio gone, url forgotten, then the change is announced
  await store.deleteAudio("a");
  forgetSample("a");
  listeners.forEach((l) => l());
  await tick();
  assert.deepEqual(getRuntimeInstrument(rid)!.urls, {});
  voice.dispose();
  assert.equal(getRuntimeInstrument(rid), undefined);
  assert.equal(listeners.size, 0);
});
