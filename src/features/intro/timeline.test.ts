import { test } from "node:test";
import assert from "node:assert/strict";
import { VIDEOS, VIDEO_LIST, VOICE } from "./data";
import { SCENES } from "./scenes";
import { BREATH, cueProgress, phraseIndex, sceneAt, subtitleAt, timeline, totalLength, type VoiceManifest } from "./timeline";

const TOURS = VIDEO_LIST.map((v) => VIDEOS[v.id]);
const ALL = TOURS.flatMap((v) => v.scenes);
/** The first tour: the timeline rules are the same for both. */
const SCRIPT = TOURS[0];

test("every cue phrase is in its scene's text, and never holds a word the voice script respells", () => {
  for (const s of ALL) for (const phrase of Object.values(s.cues)) {
    assert.ok(phraseIndex(s.text, phrase) >= 0, `${s.id}: ${phrase}`);
    assert.ok(!phrase.includes("attunr"), `${s.id}: "${phrase}" has a word scripts/intro/voice.mjs respells (SAY)`);
  }
});

test("scene ids are unique across both tours, and each has its scene drawn", () => {
  const ids = ALL.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(SCENES[id], `no scene component for ${id}`);
});

test("no tour says what the offer forbids", () => {
  // "Never say" on /dev/kickstarter: no AI writes a plan, no hype, no exclamation marks
  for (const s of ALL) assert.ok(!/\bAI\b|!|unlock|master|revolution/i.test(s.text), s.id);
});

test("without a recording, scenes are estimated, back to back, cues inside them", () => {
  for (const tour of TOURS) {
    const t = timeline(tour);
    assert.equal(t[0].start, 0);
    for (let i = 1; i < t.length; i++) assert.equal(t[i].start, t[i - 1].start + t[i - 1].duration);
    for (const s of t) {
      assert.equal(s.audio, undefined);
      for (const at of Object.values(s.at)) assert.ok(at >= 0 && at < s.duration, `${s.id} cue at ${at}`);
    }
    assert.ok(totalLength(t) > 60 && totalLength(t) < 120, `${tour.title} is ${totalLength(t)} s`);
  }
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

test("the committed voice matches the script", () => {
  const t = TOURS.flatMap((tour) => timeline(tour, VOICE));
  const recorded = t.filter((s) => s.audio).length;
  // either nothing is recorded yet, or every scene is: a half-stale tour sounds broken
  assert.ok(recorded === 0 || recorded === t.length, `${recorded} of ${t.length} scenes recorded; run node scripts/intro/voice.mjs`);
});

test("subtitles: every word of a scene, a sentence at a time, in order, recorded or not", () => {
  for (const v of [undefined, VOICE]) for (const tour of TOURS) for (const s of timeline(tour, v)) {
    assert.equal(s.lines.map((l) => l.text).join(" "), s.text, s.id);
    assert.equal(s.lines[0].at, 0, s.id);
    for (let i = 1; i < s.lines.length; i++) assert.ok(s.lines[i].at > s.lines[i - 1].at && s.lines[i].at < s.duration - BREATH, `${s.id} line ${i}`);
    assert.equal(subtitleAt(s, 0), s.lines[0].text);
    assert.equal(subtitleAt(s, s.duration), s.lines[s.lines.length - 1].text);
  }
});

test("a sentence that starts on a cue starts at the cue's time", () => {
  const scene = { id: "x", caption: "x", text: "One two three. Four five six.", cues: { four: "Four five" } };
  const [t] = timeline({ title: "x", scenes: [scene] }, { scenes: { x: { text: scene.text, file: "/x.mp3", duration: 6, cues: { four: 4.5 } } } });
  assert.deepEqual(t.lines, [{ text: "One two three.", at: 0 }, { text: "Four five six.", at: 4.5 }]);
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
