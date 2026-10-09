import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { kernelBytes, loadDsp, type NamModelRuntime } from "./dsp";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const reference = JSON.parse(readFileSync(join(dir, "reference.json"), "utf8")) as { signal: string; cases: { model: string; slim: number | null; out: string }[] };
const floats = (b64: string) => {
  const b = Buffer.from(b64, "base64");
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const signal = floats(reference.signal);
const dsp = loadDsp();
const BLOCK = 128;

/** Runs a model the way the reference tool does: warm it up on silence, then feed the signal in blocks. */
function render(model: NamModelRuntime, x: Float32Array): Float32Array {
  const zero = new Float32Array(BLOCK), sink = new Float32Array(BLOCK);
  for (let s = 0; s < model.prewarmSamples + BLOCK; s += BLOCK) model.process([zero], [sink], BLOCK);
  const y = new Float32Array(x.length), inb = new Float32Array(BLOCK), outb = new Float32Array(BLOCK);
  for (let i = 0; i < x.length; i += BLOCK) {
    const n = Math.min(BLOCK, x.length - i);
    inb.fill(0);
    inb.set(x.subarray(i, i + n));
    model.process([inb], [outb], n);
    y.set(outb.subarray(0, n), i);
  }
  return y;
}

const maxDiff = (a: Float32Array, b: Float32Array) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

for (const useWasm of [false, true]) {
  for (const c of reference.cases) {
    test(`${c.model}${c.slim === null ? "" : ` at size ${c.slim}`} matches the reference implementation (${useWasm ? "WebAssembly" : "JavaScript"})`, () => {
      const spec = JSON.parse(readFileSync(join(dir, `${c.model}.nam`), "utf8"));
      const model = dsp.buildModel(spec, BLOCK, useWasm ? { wasm: kernelBytes() } : {});
      if (c.slim !== null) assert.ok(model.setSlim, "a container offers sizes");
      if (c.slim !== null) model.setSlim!(c.slim);
      const expected = floats(c.out);
      const got = render(model, signal);
      const peak = expected.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      assert.ok(peak > 0.005, "the reference is not silent");
      assert.ok(maxDiff(got, expected) < 2e-5 * Math.max(1, peak), `max difference ${maxDiff(got, expected)}`);
    });
  }
}

test("block size does not change the result", () => {
  const spec = JSON.parse(readFileSync(join(dir, "wavenet.nam"), "utf8"));
  const a = render(dsp.buildModel(spec, BLOCK, { wasm: kernelBytes() }), signal);
  const m = dsp.buildModel(spec, BLOCK, { wasm: kernelBytes() });
  const zero = new Float32Array(BLOCK);
  for (let s = 0; s < m.prewarmSamples + BLOCK; s += BLOCK) m.process([zero], [new Float32Array(BLOCK)], BLOCK);
  const b = new Float32Array(signal.length);
  let i = 0, turn = 0;
  const sizes = [1, 7, 33, 64, 5, 128, 3];
  while (i < signal.length) {
    const len = Math.min(sizes[turn++ % sizes.length], signal.length - i), out = new Float32Array(BLOCK);
    m.process([signal.subarray(i, i + len)], [out], len);
    b.set(out.subarray(0, len), i);
    i += len;
  }
  assert.ok(maxDiff(a, b) < 1e-5);
});

test("a container switches between its models", () => {
  const spec = JSON.parse(readFileSync(join(dir, "slimmable_container.nam"), "utf8"));
  const m = dsp.buildModel(spec, BLOCK, { wasm: kernelBytes() });
  assert.deepEqual(m.breakpoints, [0.33, 0.66]);
  assert.equal(m.setSlim!(1), false, "already the largest");
  assert.equal(m.setSlim!(0.1), true);
  assert.equal(m.setSlim!(0.2), false);
});

test("unsupported and broken models are refused with a message", () => {
  assert.throws(() => dsp.buildModel({ architecture: "ConvNet", config: {}, weights: [] }, BLOCK), /not supported/);
  const spec = JSON.parse(readFileSync(join(dir, "wavenet.nam"), "utf8"));
  assert.throws(() => dsp.buildModel({ ...spec, weights: spec.weights.slice(1) }, BLOCK), /fewer weights/);
  assert.throws(() => dsp.buildModel({ ...spec, weights: [...spec.weights, 1] }, BLOCK), /more weights/);
});

test("the resampler keeps a tone's pitch and level", () => {
  for (const [from, to] of [[44100, 48000], [48000, 44100], [96000, 48000]]) {
    const r = new dsp.Resampler(from, to);
    const f = 1000, n = from; // one second
    const x = new Float32Array(n).map((_, i) => Math.sin((2 * Math.PI * f * i) / from));
    const out: number[] = [];
    const chunk = new Float32Array(128);
    for (let i = 0; i < n; i += 128) {
      const len = Math.min(128, n - i);
      chunk.set(x.subarray(i, i + len));
      const tmp: number[] = [];
      const count = r.process(chunk, len, tmp);
      for (let k = 0; k < count; k++) out.push(tmp[k]);
    }
    assert.ok(Math.abs(out.length - to) < 40, `${from}->${to}: ${out.length} samples`);
    // output sample j is the signal at time j / to; the only delay is the 16 input samples of look-ahead the filter waits for
    let err = 0;
    for (let i = 200; i < out.length - 200; i++) err = Math.max(err, Math.abs(out[i] - Math.sin((2 * Math.PI * f * i) / to)));
    assert.ok(err < 0.02, `${from}->${to}: error ${err}`);
  }
});
