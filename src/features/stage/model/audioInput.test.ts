import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AUDIO_INPUT, activeSource, sanitiseAudioInput } from "./audioInput";

test("the default listens to the guitar on Input 1; the voice uses both channels", () => {
  assert.equal(DEFAULT_AUDIO_INPUT.source, "guitar");
  assert.deepEqual(activeSource(DEFAULT_AUDIO_INPUT), { device: null, channel: "left" });
  assert.deepEqual(activeSource({ ...DEFAULT_AUDIO_INPUT, source: "voice" }), { device: null, channel: "sum" });
});

test("a saved setup comes back; bad parts fall back one by one", () => {
  const saved = { source: "voice", guitar: { device: { id: "d1", label: "Scarlett" }, channel: "right" }, voice: { device: { id: "" }, channel: "x" } };
  assert.deepEqual(sanitiseAudioInput(saved), {
    source: "voice",
    guitar: { device: { id: "d1", label: "Scarlett" }, channel: "right" },
    voice: { device: null, channel: "sum" },
  });
  assert.deepEqual(sanitiseAudioInput(null), DEFAULT_AUDIO_INPUT);
  assert.deepEqual(sanitiseAudioInput({ source: "drums" }), DEFAULT_AUDIO_INPUT);
});
