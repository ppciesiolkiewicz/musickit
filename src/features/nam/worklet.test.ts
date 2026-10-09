import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { kernelBytes } from "./dsp";
import { readNam, toTransferable } from "./info";
import { NAM_PROCESSOR_NAME, NAM_WORKLET_SOURCE } from "./workletSource";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const reference = JSON.parse(readFileSync(join(dir, "reference.json"), "utf8")) as { signal: string; cases: { model: string; slim: number | null; out: string }[] };
const floats = (b64: string) => {
  const b = Buffer.from(b64, "base64");
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

interface Proc {
  port: { onmessage: ((e: { data: unknown }) => void) | null; posted: { type: string; message?: string }[]; postMessage(m: { type: string; message?: string }): void };
  process(inputs: Float32Array[][], outputs: Float32Array[][], params: Record<string, Float32Array>): boolean;
}

/** The worklet's own code run in node with the few globals an AudioWorklet provides. */
function makeProcessor(sampleRate: number): Proc {
  let Registered: (new () => Proc) | null = null;
  class AudioWorkletProcessor {
    port = { onmessage: null as ((e: { data: unknown }) => void) | null, posted: [] as { type: string }[], postMessage(m: { type: string }) { this.posted.push(m); } };
  }
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", NAM_WORKLET_SOURCE)(AudioWorkletProcessor, (name: string, cls: new () => Proc) => {
    assert.equal(name, NAM_PROCESSOR_NAME);
    Registered = cls;
  }, sampleRate);
  return new Registered!();
}

const send = (p: Proc, data: unknown) => p.port.onmessage!({ data });
const params = (inGain = 1, outGain = 1, gate = 0) => ({ inGain: Float32Array.of(inGain), outGain: Float32Array.of(outGain), gate: Float32Array.of(gate) });

function run(p: Proc, x: Float32Array, pr = params(), blocks = x.length / 128): Float32Array {
  const y = new Float32Array(blocks * 128);
  for (let b = 0; b < blocks; b++) {
    const out = [new Float32Array(128)];
    p.process([[x.subarray(b * 128, b * 128 + 128)]], [out[0] ? out : out], pr);
    y.set(out[0], b * 128);
  }
  return y;
}

const load = (p: Proc, name: string) => {
  const r = readNam(readFileSync(join(dir, `${name}.nam`), "utf8"));
  assert.ok(r.ok);
  if (r.ok) send(p, { type: "load", spec: toTransferable(r.spec), wasm: kernelBytes() });
};

const signal = floats(reference.signal).subarray(0, 2304); // 18 blocks
const expected = (name: string) => floats(reference.cases.find((c) => c.model === name)!.out);

test("without a model the sound passes unchanged", () => {
  const p = makeProcessor(48000);
  const y = run(p, signal.subarray(0, 256));
  assert.deepEqual(Array.from(y), Array.from(signal.subarray(0, 256)));
});

test("with a model it is silent while warming up, then matches the reference at the model's rate", () => {
  const p = makeProcessor(48000);
  load(p, "wavenet");
  assert.deepEqual(p.port.posted.map((m) => m.type), ["loaded"]);
  const silence = new Float32Array(128 * 8);
  run(p, silence); // warms up (the output is silent meanwhile)
  const y = run(p, signal);
  const ref = expected("wavenet");
  let worst = 0;
  for (let i = 0; i < signal.length; i++) worst = Math.max(worst, Math.abs(y[i] - ref[i]));
  assert.ok(worst < 2e-5, `difference ${worst}`);
});

test("input and output gain are applied", () => {
  const p = makeProcessor(48000);
  load(p, "wavenet");
  run(p, new Float32Array(128 * 8));
  const half = run(p, signal.map((v) => v * 0.5), params(2, 3));
  const p2 = makeProcessor(48000);
  load(p2, "wavenet");
  run(p2, new Float32Array(128 * 8));
  const base = run(p2, signal);
  for (let i = 1000; i < 1100; i++) assert.ok(Math.abs(half[i] - 3 * base[i]) < 1e-4);
});

test("the gate silences quiet input and lets loud input through", () => {
  const warmed = () => {
    const p = makeProcessor(48000);
    load(p, "wavenet");
    run(p, new Float32Array(128 * 8));
    return p;
  };
  const quiet = new Float32Array(128 * 40).map((_, i) => 0.004 * Math.sin(i / 4));
  const loud = quiet.map((v) => v * 100);
  const silent = run(warmed(), new Float32Array(quiet.length));
  const gated = run(warmed(), quiet, params(1, 1, 0.05));
  const ungated = run(warmed(), quiet, params(1, 1, 0));
  const diff = (a: Float32Array, b: Float32Array) => a.slice(3500).reduce((m, v, i) => Math.max(m, Math.abs(v - b[i + 3500])), 0);
  assert.ok(diff(gated, silent) < 1e-6, "closed gate sounds like silence");
  assert.ok(diff(ungated, silent) > 1e-5, "without the gate the quiet signal is heard");
  assert.ok(diff(run(warmed(), loud, params(1, 1, 0.05)), run(warmed(), loud, params(1, 1, 0))) < 1e-3, "loud input opens the gate");
});

test("a context at another sample rate converts to the model's rate and back", () => {
  const p = makeProcessor(44100);
  load(p, "wavenet");
  run(p, new Float32Array(128 * 40));
  const sig = new Float32Array(128 * 60).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / 44100));
  const y = run(p, sig);
  assert.ok(y.every(Number.isFinite));
  const rms = (a: Float32Array) => Math.sqrt(a.slice(2000).reduce((s, v) => s + v * v, 0) / (a.length - 2000));
  assert.ok(rms(y) > 1e-4, "there is sound");
  // the same model at 48 kHz gives a similar level
  const q = makeProcessor(48000);
  load(q, "wavenet");
  run(q, new Float32Array(128 * 40));
  const y48 = run(q, new Float32Array(128 * 60).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / 48000)));
  assert.ok(Math.abs(rms(y) / rms(y48) - 1) < 0.1, `${rms(y)} vs ${rms(y48)}`);
});

test("a broken model is reported and the sound passes", () => {
  const p = makeProcessor(48000);
  send(p, { type: "load", spec: { architecture: "ConvNet", config: {}, weights: new Float32Array(0) }, wasm: kernelBytes() });
  assert.equal(p.port.posted[0].type, "error");
  const y = run(p, signal.subarray(0, 128));
  assert.deepEqual(Array.from(y), Array.from(signal.subarray(0, 128)));
});

test("clear returns to passing the sound", () => {
  const p = makeProcessor(48000);
  load(p, "wavenet");
  send(p, { type: "clear" });
  const y = run(p, signal.subarray(0, 128));
  assert.deepEqual(Array.from(y), Array.from(signal.subarray(0, 128)));
});
