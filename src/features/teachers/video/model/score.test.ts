import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COUNTDOWN_BEATS, TAIL_MS, buildScore, frameCount, momentAt, solfegeBars, soundOf } from "./score";
import type { VideoConfig } from "./config";

/** Two 2-bar tunes, two passes each, at 60 bpm so a beat is a second. */
const config = (): VideoConfig => ({
  name: "t",
  tonicPc: 0,
  scale: "major-ionian",
  bpm: 60,
  voice: "alto",
  layers: [],
  formats: {},
  timeline: [
    { tune: "1 2 3 2 | 1w", label: "one", times: 2, caption: "first" },
    { tune: "3 2 1 2 | 3w", times: 2, caption: "second" },
  ],
});

describe("buildScore", () => {
  const s = buildScore(config());
  it("lays the segments end to end, each behind its own countdown", () => {
    assert.equal(s.beatMs, 1000);
    assert.equal(COUNTDOWN_BEATS, 4);
    assert.deepEqual(s.segments.map((g) => [g.startBeat, g.tuneBeats, g.times]), [[0, 8, 2], [20, 8, 2]]);
    assert.equal(s.totalBeats, 40);
    assert.equal(s.durationMs, 40000 + TAIL_MS);
    assert.equal(s.durationMs, 41000);
    assert.equal(frameCount(s), 1230);
  });
  it("copies caption and label from the timeline", () => {
    assert.deepEqual(s.segments.map((g) => [g.caption, g.label]), [["first", "one"], ["second", undefined]]);
    assert.ok(s.segments[0].notes.length > 0);
    assert.equal(s.clef, "treble");
  });
});

describe("momentAt", () => {
  const s = buildScore(config());
  it("counts down 4 3 2 1, then plays", () => {
    assert.deepEqual(momentAt(s, -50), { phase: "countdown", segment: 0, left: 4 });
    assert.deepEqual(momentAt(s, 0), { phase: "countdown", segment: 0, left: 4 });
    assert.deepEqual(momentAt(s, 3999), { phase: "countdown", segment: 0, left: 1 });
    assert.deepEqual(momentAt(s, 4000), { phase: "play", segment: 0, beats: 0, pass: 1 });
  });
  it("counts beats across passes, and which pass it is", () => {
    assert.deepEqual(momentAt(s, 11500), { phase: "play", segment: 0, beats: 7.5, pass: 1 });
    assert.deepEqual(momentAt(s, 13500), { phase: "play", segment: 0, beats: 9.5, pass: 2 });
  });
  it("moves on to the next countdown, then ends", () => {
    assert.deepEqual(momentAt(s, 20000), { phase: "countdown", segment: 1, left: 4 });
    assert.deepEqual(momentAt(s, 24000), { phase: "play", segment: 1, beats: 0, pass: 1 });
    assert.deepEqual(momentAt(s, 40000), { phase: "end", segment: 1 });
    assert.deepEqual(momentAt(s, 99999), { phase: "end", segment: 1 });
  });
});

describe("soundOf", () => {
  const s = buildScore(config());
  const { piano, clicks } = soundOf(s);
  it("clicks on every beat, accented on beat 1 of each bar", () => {
    assert.equal(clicks.length, 40);
    assert.deepEqual(clicks.slice(0, 5), [0, 1000, 2000, 3000, 4000].map((at, i) => ({ at, accent: i % 4 === 0 })));
    assert.deepEqual(clicks.filter((c) => c.accent).map((c) => c.at), [0, 4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000]);
  });
  it("plays every pass of every note, held a little short of its length", () => {
    const g = s.segments[0];
    assert.equal(piano.length, (g.notes.length + s.segments[1].notes.length) * 2);
    assert.equal(piano[0].at, 4000);
    assert.equal(piano[0].note, g.notes[0].midi);
    assert.equal(piano[0].hold, g.notes[0].beats * 1000 * 0.9);
    const n = g.notes[1];
    assert.ok(piano.some((p) => p.at === (4 + 8 + n.at) * 1000 && p.note === n.midi));
  });
  it("no note rings into the next tune's play", () => {
    const playStart = (i: number) => (s.segments[i].startBeat + COUNTDOWN_BEATS) * s.beatMs;
    for (const p of piano) {
      const i = p.at < playStart(1) ? 0 : 1;
      const limit = i === 0 ? playStart(1) : s.totalBeats * s.beatMs;
      assert.ok(p.at + p.hold <= limit, `${p.at} + ${p.hold} > ${limit}`);
    }
  });
});

describe("with an intro", () => {
  const s = buildScore({ ...config(), intro: { title: "Hello", seconds: 3 } });
  it("comes first, silent, and pushes everything back", () => {
    assert.equal(s.introMs, 3000);
    assert.equal(s.durationMs, 3000 + 40000 + TAIL_MS);
    assert.deepEqual(momentAt(s, 0), { phase: "intro", segment: 0 });
    assert.deepEqual(momentAt(s, 2999), { phase: "intro", segment: 0 });
    assert.deepEqual(momentAt(s, 3000), { phase: "countdown", segment: 0, left: 4 });
    assert.deepEqual(momentAt(s, 7000), { phase: "play", segment: 0, beats: 0, pass: 1 });
    const { piano, clicks } = soundOf(s);
    assert.equal(clicks[0].at, 3000);
    assert.equal(piano[0].at, 7000);
  });
  it("without one there is no intro phase", () => {
    assert.equal(buildScore(config()).introMs, 0);
    assert.equal(buildScore(config()).intro, null);
  });
});

describe("solfegeBars", () => {
  it("names a tune's notes bar by bar", () => {
    const s = buildScore(config());
    assert.deepEqual(solfegeBars(s.segments[0].notes), [["Do", "Re", "Mi", "Re"], ["Do"]]);
  });
});
