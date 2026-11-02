import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AUDIO_INPUT, activeSource, sanitiseAudioInput } from "./audioInput";

test("the default listens to the app's input on its louder channel, for either source", () => {
  assert.equal(DEFAULT_AUDIO_INPUT.source, "guitar");
  assert.deepEqual(activeSource(DEFAULT_AUDIO_INPUT), { device: null, channel: "auto" });
  assert.deepEqual(activeSource({ ...DEFAULT_AUDIO_INPUT, source: "voice" }), { device: null, channel: "auto" });
});

test("older saves keep their channel; a source saved without one hears the louder input", () => {
  const old = { source: "guitar", guitar: { device: null, channel: "left" }, voice: { device: null, channel: "sum" } };
  assert.deepEqual(sanitiseAudioInput(old), old);
  assert.deepEqual(sanitiseAudioInput({ source: "voice", voice: { device: null } }).voice, { device: null, channel: "auto" });
  assert.equal(sanitiseAudioInput({ guitar: { channel: "auto" } }).guitar.channel, "auto");
});

test("a saved setup comes back; bad parts fall back one by one", () => {
  const saved = { source: "voice", guitar: { device: { id: "d1", label: "Scarlett" }, channel: "right" }, voice: { device: { id: "" }, channel: "x" } };
  assert.deepEqual(sanitiseAudioInput(saved), {
    source: "voice",
    guitar: { device: { id: "d1", label: "Scarlett" }, channel: "right" },
    voice: { device: null, channel: "auto" },
  });
  assert.deepEqual(sanitiseAudioInput(null), DEFAULT_AUDIO_INPUT);
  assert.deepEqual(sanitiseAudioInput({ source: "drums" }), DEFAULT_AUDIO_INPUT);
});
