import { test } from "node:test";
import assert from "node:assert/strict";
import { Band } from "./band";
import type { NoteEvent, Part } from "../model/arrange";
import type { Voices } from "./voices";

/** Just enough AudioContext for the band: a settable clock and gains that remember their level. */
function fakeContext() {
  const param = () => ({ value: 1, setTargetAtTime(v: number) { this.value = v; }, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} });
  return { currentTime: 0, createGain: () => ({ gain: param(), connect() {}, disconnect() {} }) } as unknown as AudioContext & { currentTime: number };
}

function setup() {
  const ctx = fakeContext();
  const played: { part: Part; ev: NoteEvent; when: number; seconds: number }[] = [];
  const voices = (): Voices => Object.fromEntries((["drums", "bass", "keys"] as Part[]).map((part) => [part, { play: (ev: NoteEvent, when: number, seconds: number) => played.push({ part, ev, when, seconds }) }])) as unknown as Voices;
  const band = new Band({ context: () => ctx, destination: () => ({}) as AudioNode, voices }, { progression: "pop", tonic: "C", style: "pop", bpm: 120, levels: { drums: { volume: 1, muted: false }, bass: { volume: 1, muted: false }, keys: { volume: 1, muted: false } } });
  /** move the clock on in scheduler-sized steps */
  const advance = (seconds: number) => {
    for (let t = 0; t < seconds; t += 0.025) {
      ctx.currentTime += 0.025;
      (band as unknown as { tick(): void }).tick();
    }
  };
  return { ctx, band, played, advance };
}

test("band: plays the arrangement on the clock, each note once", async () => {
  const { band, played, advance } = setup();
  await band.start();
  advance(2.05); // 120 bpm: 4 beats, one bar
  band.stop();
  const kicks = played.filter((p) => p.ev.lane === "kick").map((p) => +(p.when - 0.08).toFixed(3));
  assert.deepEqual(kicks, [0, 1, 1.25, 2]); // beats 0, 2 and 2.5 of the pop groove, then the next bar's one (scheduled ahead)
  const seen = new Set(played.map((p) => `${p.part}${p.ev.lane ?? p.ev.midi}@${p.when.toFixed(4)}`));
  assert.equal(seen.size, played.length);
  assert.ok(played.every((p) => p.when >= 0.08));
});

test("band: a tempo change applies from the next unscheduled beat, nothing jumps back", async () => {
  const { band, played, advance } = setup();
  await band.start();
  advance(1);
  band.set({ bpm: 60 });
  advance(3);
  band.stop();
  const times = played.map((p) => p.when);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1] - 1e-9, "never earlier than a note already played");
  // after the change, hats an eighth apart are half a second apart (60 bpm), before it a quarter second
  const hats = played.filter((p) => p.ev.lane === "hat").map((p) => p.when);
  const gaps = hats.slice(1).map((t, i) => +(t - hats[i]).toFixed(3));
  assert.equal(gaps[0], 0.25);
  assert.equal(gaps[gaps.length - 1], 0.5);
});

test("band: a new style waits for the bar line; stop silences the scheduler", async () => {
  const { band, played, advance } = setup();
  await band.start();
  advance(0.5);
  band.set({ style: "rock" });
  assert.equal(band.getSnapshot().settings.style, "rock");
  advance(1.6); // past the first bar line (2 s + start delay)
  const bar2 = played.filter((p) => p.when >= 2.08 && p.part === "bass");
  assert.ok(bar2.length >= 1 && bar2.every((p) => p.seconds <= 0.25 + 1e-9), "rock's eighth-note bass after the bar line");
  band.stop();
  const n = played.length;
  advance(1);
  assert.equal(played.length, n);
  assert.equal(band.getSnapshot().playing, false);
});

test("band: muting a part lowers its gain without stopping it", async () => {
  const { band, advance } = setup();
  await band.start();
  band.set({ levels: { bass: { muted: true } } });
  advance(0.1);
  assert.equal(band.getSnapshot().settings.levels.bass.muted, true);
  assert.equal(band.getSnapshot().settings.levels.bass.volume, 1);
  band.stop();
});
