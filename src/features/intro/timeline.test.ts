import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VOICE, SCRIPT, VOICES, voiceFromQuery } from "./data";
import { BREATH, cueProgress, phraseIndex, sceneAt, timeline, totalLength, type VoiceManifest } from "./timeline";

test("every cue phrase is in its scene's text", () => {
  for (const s of SCRIPT.scenes) for (const phrase of Object.values(s.cues)) assert.ok(phraseIndex(s.text, phrase) >= 0, `${s.id}: ${phrase}`);
});

test("scene ids are unique", () => {
  const ids = SCRIPT.scenes.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("without a recording, scenes are estimated, back to back, cues inside them", () => {
  const t = timeline(SCRIPT);
  assert.equal(t[0].start, 0);
  for (let i = 1; i < t.length; i++) assert.equal(t[i].start, t[i - 1].start + t[i - 1].duration);
  for (const s of t) {
    assert.equal(s.audio, undefined);
    for (const at of Object.values(s.at)) assert.ok(at >= 0 && at < s.duration, `${s.id} cue at ${at}`);
  }
  assert.ok(totalLength(t) > 60 && totalLength(t) < 120, `tour is ${totalLength(t)} s`);
});

test("a recording of the same text sets the length and cues; a stale one is ignored", () => {
  const s = SCRIPT.scenes[0];
  const fresh: VoiceManifest = { scenes: { [s.id]: { text: s.text, file: "/intro/hello.mp3", duration: 5, cues: { tagline: 1.25 } } } };
  const [a] = timeline(SCRIPT, fresh);
  assert.equal(a.duration, 5 + BREATH);
  assert.equal(a.at.tagline, 1.25);
  assert.equal(a.audio, "/intro/hello.mp3");
  const stale: VoiceManifest = { scenes: { [s.id]: { ...fresh.scenes[s.id], text: "old words" } } };
  assert.equal(timeline(SCRIPT, stale)[0].audio, undefined);
});

test("every committed voice matches the script", () => {
  for (const v of VOICES) {
    const t = timeline(SCRIPT, v);
    const recorded = t.filter((s) => s.audio).length;
    // either nothing is recorded yet, or every scene is: a half-stale tour sounds broken
    assert.ok(recorded === 0 || recorded === t.length, `${v.voice}: ${recorded} of ${t.length} scenes recorded; run node scripts/intro/voice.mjs --voice <name>`);
  }
});

test("?voice=1|2|3 picks a voice; anything else plays the default", () => {
  assert.equal(voiceFromQuery("?voice=1"), 0);
  assert.equal(voiceFromQuery("?voice=3"), 2);
  for (const q of ["", "?voice=0", "?voice=4", "?voice=two", "?voice=1.5"]) assert.equal(voiceFromQuery(q), DEFAULT_VOICE, q);
});

test("sceneAt and cueProgress", () => {
  const t = timeline(SCRIPT);
  assert.equal(sceneAt(t, 0), 0);
  assert.equal(sceneAt(t, t[2].start + 0.01), 2);
  assert.equal(sceneAt(t, 1e6), t.length - 1);
  assert.equal(cueProgress(1, undefined), 0);
  assert.equal(cueProgress(1, 2), 0);
  assert.ok(Math.abs(cueProgress(2.2, 2, 0.4) - 0.5) < 1e-9);
  assert.equal(cueProgress(9, 2), 1);
});
