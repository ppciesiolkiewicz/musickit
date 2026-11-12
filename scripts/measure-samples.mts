/**
 * Measures every sample file of the app's built-in instruments at its own pitch and writes their tuning:
 * src/features/sound/engine/tuning.generated.json, `{ "<ID>": { "<sampleMidi>": cents } }`, + sharp of A440 equal temperament.
 * The instruments play each sample shifted back by its cents (`pickSample`, `tunedCents`).
 *
 *   npm run samples:measure
 *
 * Each file is decoded (node-web-audio-api) and read every 0.1 s from 0.1 to 0.8 s with the tuner's YIN, searching only within a
 * fifth of the note the file is named for, so a file an octave off cannot be "corrected" by an octave: it reads as nothing instead.
 * Its tuning is the median reading, trusted when at least 3 readings agree (median deviation within 10 cents: vibrato and a piano's
 * drift as it fades are normal). A file not trusted plays as recorded (0) and is listed under "unmeasured" in the JSON. The script
 * refuses (exit 1, nothing written) when a file measures past ±60 cents: that is a wrong file, not an out-of-tune one. A value in
 * TUNING_PINS (src/features/sound/engine/tuningPins.ts), set by ear, wins over all of this.
 */
import * as webAudio from "node-web-audio-api";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// the app's .ts files load as CommonJS here: their exports come through as one object
const cjs = <T,>(m: T & { default?: T }): T => (m.default ?? m) as T;
type Pitch = typeof import("../src/features/tuner/pitch");
type Pins = typeof import("../src/features/sound/engine/tuningPins");
const { detectPitch } = cjs<Pitch>(await import("../src/features/tuner/pitch"));
const { TUNING_PINS } = cjs<Pins>(await import("../src/features/sound/engine/tuningPins"));

const ROOT = process.cwd();
const SAMPLES = JSON.parse(await readFile(path.join(ROOT, "src/features/sound/engine/samples.generated.json"), "utf8")) as Record<string, { baseUrl: string; urls: Record<string, string> }>;
const OUT = path.join(ROOT, "src/features/sound/engine/tuning.generated.json");
const READ_AT = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const FRAME = 4096;
const MIN_READINGS = 3, MAX_DEVIATION = 10, MAX_CENTS = 60;

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = (note: string) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note)!;
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
};
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function measure(file: string, midi: number): Promise<{ cents: number | null; readings: number[] }> {
  const bytes = await readFile(file);
  const ctx = new webAudio.OfflineAudioContext(1, 1, 44100);
  const buf = await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const data = buf.getChannelData(0);
  const f = hz(midi);
  const readings: number[] = [];
  for (const t of READ_AT) {
    const at = Math.floor(t * buf.sampleRate);
    if (at + FRAME > data.length) continue;
    const p = detectPitch(data.slice(at, at + FRAME), buf.sampleRate, { minHz: f / 1.5, maxHz: f * 1.5, minRms: 0.001 });
    if (p) readings.push(1200 * Math.log2(p.freq / f));
  }
  return { cents: readings.length ? median(readings) : null, readings };
}

async function main() {
  const out: Record<string, Record<number, number>> = {};
  const unmeasured: Record<string, number[]> = {};
  const refused: string[] = [];
  for (const [id, { baseUrl, urls }] of Object.entries(SAMPLES)) {
    out[id] = {};
    for (const [note, file] of Object.entries(urls)) {
      const midi = midiOf(note);
      const pinned = TUNING_PINS[id]?.[midi];
      const { cents, readings } = await measure(path.join(ROOT, "public", baseUrl, file), midi);
      const deviation = cents === null ? Infinity : median(readings.map((r) => Math.abs(r - cents)));
      const label = `${id} ${note} (${file}): ${readings.map((r) => r.toFixed(1)).join(" / ") || "no reading"}`;
      if (pinned !== undefined) {
        out[id][midi] = pinned;
        console.log(`pinned ${label} → ${pinned}`);
      } else if (cents !== null && Math.abs(cents) > MAX_CENTS) refused.push(label);
      else if (cents === null || readings.length < MIN_READINGS || deviation > MAX_DEVIATION) {
        out[id][midi] = 0;
        (unmeasured[id] ??= []).push(midi);
        console.log(`unmeasured, plays as recorded: ${label}`);
      } else out[id][midi] = Math.round(cents * 10) / 10;
    }
    const vals = Object.values(out[id]);
    console.log(`${id.padEnd(18)} ${vals.length}/${Object.keys(urls).length} samples, worst ${Math.max(0, ...vals.map(Math.abs)).toFixed(1)}¢`);
  }
  if (refused.length) {
    console.error(`\nPast ±${MAX_CENTS}¢: a wrong file, not an out-of-tune one. Listen and pin it in tuningPins.ts, or drop it in scripts/fetch-samples.mts:\n  ${refused.join("\n  ")}`);
    process.exit(1);
  }
  await writeFile(OUT, JSON.stringify({ tuning: out, unmeasured }, null, 1) + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
  process.exit(0);
}

void main();
