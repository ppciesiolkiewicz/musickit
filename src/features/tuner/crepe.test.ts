import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as tf from "@tensorflow/tfjs";
import { decode, normalise, to16k } from "./crepe";

const tone = (hz: number, sr: number, n: number, harmonics = 1) => {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let h = 1; h <= harmonics; h++) b[i] += (0.3 / h) * Math.sin((2 * Math.PI * hz * h * i) / sr);
  return b;
};
const centsOff = (got: number, want: number) => Math.abs(1200 * Math.log2(got / want));

test("resamples the newest samples to 1024 at 16 kHz, or nothing when too short", () => {
  assert.equal(to16k(new Float32Array(2048), 48000), null);
  // a 1 kHz sine at 48 kHz is still 1 kHz at 16 kHz: 16 samples a cycle
  const x = to16k(tone(1000, 48000, 4096), 48000)!;
  assert.equal(x.length, 1024);
  let ups = 0;
  for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) ups++;
  assert.ok(Math.abs(ups - 64) <= 1, `${ups} cycles`);
  assert.equal(to16k(tone(1000, 44100, 4096), 44100)!.length, 1024);
});

test("normalises to zero mean and unit spread, and leaves silence flat", () => {
  const x = normalise(Float32Array.from({ length: 1024 }, (_, i) => 0.5 + 0.1 * Math.sin(i)));
  const mean = x.reduce((s, v) => s + v, 0) / x.length;
  const sd = Math.sqrt(x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length);
  assert.ok(Math.abs(mean) < 1e-5 && Math.abs(sd - 1) < 1e-4);
  assert.deepEqual([...normalise(new Float32Array(4))], [0, 0, 0, 0]);
});

test("decodes the bins to a pitch between them", () => {
  const s = new Float32Array(360);
  s[100] = 0.8;
  assert.ok(centsOff(decode(s).freq, 10 * 2 ** ((1997.3794084376191 + 2000) / 1200)) < 0.01);
  s[101] = 0.8; // halfway between two bins
  assert.ok(centsOff(decode(s).freq, 10 * 2 ** ((1997.3794084376191 + 2010) / 1200)) < 0.01);
  assert.ok(Math.abs(decode(s).clarity - 0.8) < 1e-6);
});

test("the model hears guitar strings, harmonics and all", async () => {
  const dir = new URL("../../../public/models/crepe/", import.meta.url);
  const json = JSON.parse(readFileSync(new URL("model.json", dir), "utf8"));
  const specs = json.weightsManifest.flatMap((g: { weights: tf.io.WeightsManifestEntry[] }) => g.weights);
  const bins = json.weightsManifest.flatMap((g: { paths: string[] }) => g.paths.map((p) => readFileSync(new URL(p, dir))));
  const data = Buffer.concat(bins);
  const model = await tf.loadLayersModel(tf.io.fromMemory(json.modelTopology, specs, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
  for (const hz of [82.41, 110, 146.83, 196, 246.94, 329.63]) {
    const x = normalise(to16k(tone(hz, 48000, 4096, 6), 48000)!);
    const out = model.predict(tf.tensor2d(x, [1, 1024])) as tf.Tensor;
    const p = decode(await out.data());
    assert.ok(p.clarity > 0.5, `${hz}: confidence ${p.clarity}`);
    assert.ok(centsOff(p.freq, hz) < 10, `${hz} read as ${p.freq}`);
  }
});
