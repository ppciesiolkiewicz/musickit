import assert from "node:assert/strict";
import { test } from "node:test";
import { STAGES } from "@/features/theory/singingMelodies";
import { FORMATS, FPS, VideoConfigError, parseVideoConfig } from "./config";

/** A config under edit: tests poke at nested fields freely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const rect = (x = 0.05, y = 0.2, w = 0.9, h = 0.6) => ({ x, y, w, h });
const formatOf = () => ({ layers: { melody: rect(), countdown: rect(0.3, 0.3, 0.4, 0.4), logo: rect(0.02, 0.02, 0.1, 0.1), url: rect(0.7, 0.9, 0.28, 0.08) } });

/** A fresh valid config each call, so a test can break one field. */
const valid = (): Loose => ({
  name: "c-major-stage-1",
  key: "C",
  scale: "major-ionian",
  bpm: 80,
  voice: "alto",
  layers: {
    melody: { subject: { kind: "melody", beats: 6 } },
    countdown: { subject: { kind: "countdown" } },
    logo: { subject: { kind: "logo" } },
    url: { subject: { kind: "url" } },
  },
  formats: { "16x9": formatOf(), "9x16": formatOf() },
  timeline: [
    { tune: "1 2 3 2 | 1w", times: 4, caption: "Tune 1 · get ready" },
    { tune: 1, times: 2 },
  ],
});

const bad = (edit: (c: Loose) => void, message: RegExp) => {
  const c = valid();
  edit(c);
  assert.throws(() => parseVideoConfig(c, []), (e) => e instanceof VideoConfigError && message.test(e.message), String(message));
};

test("formats and frame rate", () => {
  assert.deepEqual(FORMATS["16x9"], { width: 1920, height: 1080 });
  assert.deepEqual(FORMATS["9x16"], { width: 1080, height: 1920 });
  assert.equal(FPS, 30);
});

test("a valid config parses", () => {
  const c = parseVideoConfig(valid(), []);
  assert.equal(c.name, "c-major-stage-1");
  assert.equal(c.tonicPc, 0);
  assert.equal(c.scale, "major-ionian");
  assert.equal(c.bpm, 80);
  assert.equal(c.voice, "alto");
  assert.deepEqual(c.layers.map((l) => l.id), ["melody", "countdown", "logo", "url"]);
  assert.deepEqual(c.layers[0].subject, { kind: "melody", beats: 6 });
  assert.deepEqual(c.formats["16x9"]?.logo, rect(0.02, 0.02, 0.1, 0.1));
  assert.deepEqual(Object.keys(c.formats), ["16x9", "9x16"]);
  assert.deepEqual(c.timeline[0], { tune: "1 2 3 2 | 1w", times: 4, caption: "Tune 1 · get ready" });
  assert.deepEqual(c.timeline[1], { tune: STAGES.flatMap((s) => s.tunes)[0], label: "book 1", times: 2, caption: "Get ready" });
});

test("a label is kept as given", () => {
  const c = valid();
  c.timeline[0].label = "warm-up";
  c.timeline[1].label = "mine";
  const parsed = parseVideoConfig(c, []);
  assert.equal(parsed.timeline[0].label, "warm-up");
  assert.equal(parsed.timeline[1].label, "mine");
});

test("a melody without beats takes the stage's default", () => {
  const c = valid();
  delete c.layers.melody.subject.beats;
  assert.deepEqual(parseVideoConfig(c, []).layers[0].subject, { kind: "melody" });
});

test("a config with one format is fine", () => {
  const c = valid();
  delete c.formats["9x16"];
  assert.deepEqual(Object.keys(parseVideoConfig(c, []).formats), ["16x9"]);
});

test("not an object", () => {
  assert.throws(() => parseVideoConfig(null, []), /^config: /);
});

test("name", () => {
  bad((c) => delete c.name, /^name: /);
  bad((c) => (c.name = "Has Spaces"), /^name: /);
  bad((c) => (c.name = ""), /^name: /);
});

test("key", () => {
  bad((c) => (c.key = "H"), /^key: /);
  bad((c) => delete c.key, /^key: /);
  const pc = (key: string) => {
    const c = valid();
    c.key = key;
    return parseVideoConfig(c, []).tonicPc;
  };
  assert.equal(pc("F#"), 6);
  assert.equal(pc("Bb"), 10);
});

test("voice", () => {
  bad((c) => delete c.voice, /^voice: /);
  bad((c) => (c.voice = "castrato"), /^voice: /);
  bad((c) => (c.voice = "toString"), /^voice: /);
});

test("scale", () => {
  bad((c) => (c.scale = "not-a-scale"), /^scale: /);
  bad((c) => delete c.scale, /^scale: /);
});

test("bpm", () => {
  bad((c) => delete c.bpm, /^bpm: /);
  bad((c) => (c.bpm = 80.5), /^bpm: /);
  bad((c) => (c.bpm = 10), /^bpm: /);
  bad((c) => (c.bpm = 999), /^bpm: /);
  bad((c) => (c.bpm = "80"), /^bpm: /);
});

test("layers", () => {
  bad((c) => delete c.layers, /^layers: /);
  bad((c) => (c.layers.logo.subject = { kind: "nope" }), /^layers\.logo\.subject: /);
  bad((c) => (c.layers.url = {}), /^layers\.url\.subject: /);
  bad((c) => delete c.layers.melody, /^layers: one melody/);
  bad((c) => (c.layers.second = { subject: { kind: "melody" } }), /^layers: one melody/);
  bad((c) => (c.layers.melody.subject.beats = 20), /^layers\.melody\.subject\.beats: expected a whole number from 2 to 16$/);
  bad((c) => (c.layers.melody.subject.beats = 1), /^layers\.melody\.subject\.beats: /);
  bad((c) => (c.layers.melody.subject.beats = 4.5), /^layers\.melody\.subject\.beats: /);
  bad((c) => (c.layers.melody.subject.beats = "6"), /^layers\.melody\.subject\.beats: /);
});

test("a plugin layer needs a known plugin id", () => {
  const c = valid();
  c.layers.panel = { subject: { kind: "plugin", plugin: "nope", key: { tonic: null, scale: null } } };
  assert.throws(() => parseVideoConfig(c, ["other"]), /^layers\.panel\.subject: /);
});

test("formats", () => {
  bad((c) => delete c.formats, /^formats: /);
  bad((c) => (c.formats = {}), /^formats: /);
  bad((c) => (c.formats["4x3"] = formatOf()), /^formats\.4x3: /);
  bad((c) => delete c.formats["9x16"].layers.logo, /^formats\.9x16\.logo: missing/);
  bad((c) => (c.formats["16x9"].layers.title = rect()), /^formats\.16x9\.title: no such layer/);
  bad((c) => (c.formats["16x9"].layers.url = { x: 0.5, y: 0.5, w: 0.6, h: 0.1 }), /^formats\.16x9\.url: /);
  bad((c) => (c.formats["16x9"].layers.url = { x: 0.5, y: 0.95, w: 0.1, h: 0.1 }), /^formats\.16x9\.url: /);
  bad((c) => (c.formats["16x9"].layers.url = { x: -0.1, y: 0, w: 0.1, h: 0.1 }), /^formats\.16x9\.url: /);
  bad((c) => (c.formats["16x9"].layers.url = { x: 0, y: 0, w: 0, h: 0.1 }), /^formats\.16x9\.url: /);
  bad((c) => (c.formats["16x9"].layers.url = { x: 0, y: 0, w: 0.1 }), /^formats\.16x9\.url\.h: /);
});

test("timeline", () => {
  bad((c) => (c.timeline = []), /^timeline: /);
  bad((c) => delete c.timeline, /^timeline: /);
  bad((c) => (c.timeline[1].tune = 9999), /^timeline\[1\]\.tune: no book tune 9999/);
  bad((c) => (c.timeline[0].tune = 9999), /^timeline\[0\]\.tune: no book tune 9999/);
  bad((c) => (c.timeline[1].tune = 0), /^timeline\[1\]\.tune: /);
  bad((c) => (c.timeline[1].tune = 1.5), /^timeline\[1\]\.tune: /);
  bad((c) => (c.timeline[1].tune = "1 x 3 | 1w"), /^timeline\[1\]\.tune: bad note/);
  bad((c) => (c.timeline[0].tune = "1 2 3"), /^timeline\[0\]\.tune: .*whole bars/);
  bad((c) => (c.timeline[0].tune = ""), /^timeline\[0\]\.tune: /);
  bad((c) => delete c.timeline[0].tune, /^timeline\[0\]\.tune: /);
  bad((c) => (c.timeline[0].times = 0), /^timeline\[0\]\.times: /);
  bad((c) => (c.timeline[0].times = 17), /^timeline\[0\]\.times: /);
  bad((c) => (c.timeline[0].times = 1.5), /^timeline\[0\]\.times: /);
  bad((c) => delete c.timeline[1].times, /^timeline\[1\]\.times: /);
  bad((c) => (c.timeline[0].caption = 5), /^timeline\[0\]\.caption: /);
});
