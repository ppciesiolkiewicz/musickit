/**
 * TEMPORARY (delete with /dev/pianos): measures every backend of every instrument on the dev page, note by note G2–C6, at A4 = 440.
 * Each backend renders all the notes offline (node-web-audio-api) twice: as recorded, then with the first pass as its tuning,
 * and the pitch of each note is read 0.3 s in (the tuner's YIN). Writes src/features/devtools/pianos/tuning.generated.json,
 * which the page shows and plays its "Correct pitch" from.
 *
 *   npm run pianos:measure                       every backend of every instrument
 *   npm run pianos:measure -- piano/ cello/own   only backends whose id (`<instrument>/<kind>:<source>`) starts with one of these
 * A backend measured before keeps its entry until it is measured again.
 */
import * as webAudio from "node-web-audio-api";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BackendSpec, Tuning } from "../src/features/devtools/pianos/backends";

// the app's .ts files load as CommonJS here: their exports come through as one object
type Backends = typeof import("../src/features/devtools/pianos/backends");
type Instruments = typeof import("../src/features/devtools/pianos/instruments");
type Pitch = typeof import("../src/features/tuner/pitch");
const cjs = <T,>(m: T & { default?: T }): T => (m.default ?? m) as T;
const { backendsFor, setSampleReader, LOW, HIGH } = cjs<Backends>(await import("../src/features/devtools/pianos/backends"));
const { INSTRUMENTS_TO_COMPARE } = cjs<Instruments>(await import("../src/features/devtools/pianos/instruments"));
/** every backend once (the exact tone is offered with every instrument) */
const ALL_BACKENDS = [...new Map(INSTRUMENTS_TO_COMPARE.flatMap(backendsFor).map((b) => [b.id, b])).values()];
const { detectPitch } = cjs<Pitch>(await import("../src/features/tuner/pitch"));

Object.assign(globalThis, webAudio);
// Tone.js looks the audio constructors up on window
(globalThis as { window?: unknown }).window ??= globalThis;

/**
 * node-web-audio-api decodes wav and mp3 but not Ogg Vorbis or m4a (smplr's piano): those go through macOS's afconvert to wav
 * first. Dev script on a Mac, so that is enough.
 */
const decode = webAudio.OfflineAudioContext.prototype.decodeAudioData;
/** converted files by their bytes' hash, so each is converted once; the temporary folder goes straight after */
const converted = new Map<string, Promise<ArrayBuffer>>();
async function toWav(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const key = createHash("sha1").update(Buffer.from(bytes)).digest("hex");
  if (!converted.has(key))
    converted.set(key, (async () => {
      const dir = await mkdtemp(path.join(tmpdir(), "pianos-"));
      try {
        const src = path.join(dir, "in"), out = path.join(dir, "out.wav");
        await writeFile(src, Buffer.from(bytes));
        execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16", src, out]);
        const wav = await readFile(out);
        return wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    })());
  return (await converted.get(key)!).slice(0);
}
webAudio.OfflineAudioContext.prototype.decodeAudioData = async function (this: OfflineAudioContext, data: ArrayBuffer) {
  const copy = data.slice(0);
  try {
    return await decode.call(this, data);
  } catch {
    return decode.call(this, await toWav(copy));
  }
} as typeof decode;

const OUT = path.join(process.cwd(), "src/features/devtools/pianos/tuning.generated.json");
const RATE = 44100, SLOT = 1.2, HOLD = 0.9, AT = 0.3, FRAME = 4096;

setSampleReader(async (url) => {
  if (url.startsWith("/")) {
    const b = await readFile(path.join(process.cwd(), "public", url));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.arrayBuffer();
});

const cents = (f: number, midi: number) => 1200 * Math.log2(f / (440 * 2 ** ((midi - 69) / 12)));
const round = (c: number) => Math.round(c * 10) / 10;

/** Every download once: each note renders in its own context, and smplr and Tone fetch for every one. */
const realFetch = globalThis.fetch;
const fetched = new Map<string, Promise<ArrayBuffer>>();
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!fetched.has(url)) {
    const get = async (tries: number): Promise<ArrayBuffer> => {
      try {
        const r = await realFetch(url, init);
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return await r.arrayBuffer();
      } catch (e) {
        if (tries <= 1) throw e;
        return get(tries - 1);
      }
    };
    const p = get(4);
    p.catch(() => fetched.delete(url));
    fetched.set(url, p);
  }
  return new Response((await fetched.get(url)!).slice(0));
}) as typeof fetch;

/**
 * Each note renders alone, from time 0, in a fresh context: a library that schedules with timers (smplr) would miss notes set
 * far ahead in an offline render, which runs faster than the clock.
 */
async function pass(spec: BackendSpec, tuning?: Tuning): Promise<Tuning> {
  const out: Tuning = {};
  for (let m = LOW; m <= HIGH; m++) {
    const ctx = new OfflineAudioContext(1, Math.ceil(RATE * SLOT), RATE);
    const backend = spec.create(ctx, ctx.destination, { tuning });
    await backend.load([m]);
    backend.play(m, 0, HOLD);
    const data = (await ctx.startRendering()).getChannelData(0);
    const at = Math.floor(AT * RATE);
    const p = detectPitch(data.slice(at, at + FRAME), RATE, { minHz: 50, maxHz: 1500, minRms: 0.0005 });
    if (p) out[m] = round(cents(p.freq, m));
  }
  return out;
}

type Entry = { raw: Tuning; corrected: Tuning; measuredAt: string } | { error: string; measuredAt: string };

async function main() {
  const only = process.argv.slice(2);
  const prev: Record<string, Entry> = await readFile(OUT, "utf8").then((s) => JSON.parse(s).backends, () => ({}));
  const backends: Record<string, Entry> = { ...prev };
  for (const spec of ALL_BACKENDS.filter((b) => !only.length || only.some((o) => b.id.startsWith(o)))) {
    const measuredAt = new Date().toISOString();
    try {
      const raw = await pass(spec);
      if (!Object.keys(raw).length) throw new Error("no note could be read: the samples did not load");
      const corrected = await pass(spec, raw);
      backends[spec.id] = { raw, corrected, measuredAt };
      const worst = (t: Tuning) => Math.max(...Object.values(t).map(Math.abs)).toFixed(1);
      console.log(`${spec.id.padEnd(42)} raw worst ±${worst(raw)}¢   corrected worst ±${worst(corrected)}¢   (${Object.keys(raw).length}/${HIGH - LOW + 1} notes read)`);
    } catch (e) {
      backends[spec.id] = { error: e instanceof Error ? e.message : String(e), measuredAt };
      console.log(`${spec.id.padEnd(42)} failed: ${backends[spec.id] && (backends[spec.id] as { error: string }).error}`);
    }
    // saved after every backend: a long run shows its progress on the page, and a crash keeps what was measured
    await writeFile(OUT, JSON.stringify({ low: LOW, high: HIGH, backends }, null, 1) + "\n");
  }
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
  process.exit(0);
}

void main();
