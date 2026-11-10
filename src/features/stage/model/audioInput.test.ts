import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AUDIO_INPUT, activeSource, sanitiseAudioInput } from "./audioInput";

test("the default listens to the app's input, both channels, for either source", () => {
  assert.equal(DEFAULT_AUDIO_INPUT.source, "guitar");
  assert.deepEqual(activeSource(DEFAULT_AUDIO_INPUT), { device: null, channel: "both" });
  assert.deepEqual(activeSource({ ...DEFAULT_AUDIO_INPUT, source: "voice" }), { device: null, channel: "both" });
});

test("older saves' channels map onto Both, Input 1 and Input 2; a source saved without one hears both", () => {
  const old = { source: "guitar", guitar: { device: null, channel: "left" }, voice: { device: null, channel: "sum" } };
  assert.deepEqual(sanitiseAudioInput(old), { source: "guitar", guitar: { device: null, channel: "1" }, voice: { device: null, channel: "both" } });
  assert.deepEqual(sanitiseAudioInput({ source: "voice", voice: { device: null } }).voice, { device: null, channel: "both" });
  assert.equal(sanitiseAudioInput({ guitar: { channel: "auto" } }).guitar.channel, "both");
  assert.equal(sanitiseAudioInput({ guitar: { channel: "right" } }).guitar.channel, "2");
});

test("a saved setup comes back; bad parts fall back one by one", () => {
  const saved = { source: "voice", guitar: { device: { id: "d1", label: "Scarlett" }, channel: "2" }, voice: { device: { id: "" }, channel: "x" } };
  assert.deepEqual(sanitiseAudioInput(saved), {
    source: "voice",
    guitar: { device: { id: "d1", label: "Scarlett" }, channel: "2" },
    voice: { device: null, channel: "both" },
  });
  assert.deepEqual(sanitiseAudioInput(null), DEFAULT_AUDIO_INPUT);
  assert.deepEqual(sanitiseAudioInput({ source: "drums" }), DEFAULT_AUDIO_INPUT);
});
