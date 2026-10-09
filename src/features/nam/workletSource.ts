import { NAM_DSP_SOURCE } from "./dspSource";

export const NAM_PROCESSOR_NAME = "musickit-nam";

/**
 * The AudioWorklet that runs a model: the DSP of dspSource.ts plus a processor that
 *   - takes the input as mono, applies a noise gate and the input gain,
 *   - converts to the model's sample rate when the audio context runs at another one,
 *   - runs the model in blocks of up to 128 samples and applies the output gain.
 * After a model is loaded (or its size changed) it is warmed up on silence in small steps and the output stays silent meanwhile.
 *
 * Messages in:  { type: "load", spec, wasm } | { type: "size", value } | { type: "clear" }
 * Messages out: { type: "loaded", sizes } | { type: "error", message }
 */
const PROCESSOR = String.raw`
var BLOCK = 128;
function Queue(size) { this.a = new Float32Array(size); this.n = 0; }
Queue.prototype.push = function (src, count) {
  if (this.n + count > this.a.length) { var b = new Float32Array((this.n + count) * 2); b.set(this.a.subarray(0, this.n)); this.a = b; }
  for (var i = 0; i < count; i++) this.a[this.n + i] = src[i];
  this.n += count;
};
Queue.prototype.drop = function (count) { this.a.copyWithin(0, count, this.n); this.n -= count; };

class NamProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "inGain", defaultValue: 1, minValue: 0, maxValue: 64, automationRate: "k-rate" },
      { name: "outGain", defaultValue: 1, minValue: 0, maxValue: 64, automationRate: "k-rate" },
      { name: "gate", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }
    ];
  }
  constructor() {
    super();
    this.model = null; this.warm = 0;
    this.rIn = null; this.rOut = null;
    this.mono = new Float32Array(BLOCK); this.res = new Float32Array(1024); this.mOut = new Float32Array(BLOCK); this.zero = new Float32Array(BLOCK);
    this.mq = new Queue(1024); this.oq = new Queue(1024);
    this.env = 0; this.open = 1;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }
  onMessage(msg) {
    try {
      if (msg.type === "load") {
        var m = DSP.buildModel(msg.spec, BLOCK, { wasm: msg.wasm });
        var rate = m.sampleRate > 0 ? m.sampleRate : 48000;
        if (Math.abs(rate - sampleRate) > 0.5) { this.rIn = new DSP.Resampler(sampleRate, rate); this.rOut = new DSP.Resampler(rate, sampleRate); }
        else { this.rIn = null; this.rOut = null; }
        this.mq.n = 0; this.oq.n = 0;
        this.model = m; this.warm = m.prewarmSamples + BLOCK;
        this.port.postMessage({ type: "loaded", sizes: m.breakpoints || null });
      } else if (msg.type === "size") {
        if (this.model && this.model.setSlim && this.model.setSlim(msg.value)) this.warm = this.model.prewarmSamples + BLOCK;
      } else if (msg.type === "clear") {
        this.model = null;
      }
    } catch (err) {
      this.model = null;
      this.port.postMessage({ type: "error", message: String(err && err.message ? err.message : err) });
    }
  }
  runModel(x, n) {
    this.model.process([x], [this.mOut], n);
  }
  process(inputs, outputs, params) {
    var out = outputs[0];
    if (!out || !out.length) return true;
    var o0 = out[0], n = o0.length, i, c;
    var m = this.model;
    if (!m) { // no model: the sound passes unchanged
      var inp = inputs[0];
      for (c = 0; c < out.length; c++) { var src = inp && inp.length ? inp[Math.min(c, inp.length - 1)] : null; for (i = 0; i < n; i++) out[c][i] = src ? src[i] : 0; }
      return true;
    }
    if (this.warm > 0) {
      var run = Math.min(this.warm, 3 * BLOCK);
      for (var s = 0; s < run; s += BLOCK) { m.process([this.zero], [this.mOut], BLOCK); }
      this.warm -= run;
      for (c = 0; c < out.length; c++) out[c].fill(0);
      return true;
    }
    var inb = inputs[0], mono = this.mono;
    if (!inb || !inb.length) { mono.fill(0); }
    else if (inb.length === 1) { for (i = 0; i < n; i++) mono[i] = inb[0][i]; }
    else { for (i = 0; i < n; i++) mono[i] = 0.5 * (inb[0][i] + inb[1][i]); }
    var g = params.inGain[0], thr = params.gate[0], env = this.env, open = this.open;
    for (i = 0; i < n; i++) {
      var x = mono[i] * g, a = x < 0 ? -x : x;
      env = a > env ? a : env * 0.9993;
      if (thr > 0) { var target = env > thr ? 1 : 0; open += (target - open) * (target > open ? 0.05 : 0.004); mono[i] = x * open; }
      else { open = 1; mono[i] = x; }
    }
    this.env = env; this.open = open;
    var og = params.outGain[0];
    if (!this.rIn) {
      this.runModel(mono, n);
      for (i = 0; i < n; i++) { var y = this.mOut[i] * og; o0[i] = y !== y || y > 16 || y < -16 ? 0 : y; }
    } else {
      var cnt = this.rIn.process(mono, n, this.res);
      this.mq.push(this.res, cnt);
      var pos = 0;
      while (pos < this.mq.n) {
        var len = Math.min(BLOCK, this.mq.n - pos);
        this.model.process([this.mq.a.subarray(pos, pos + len)], [this.mOut], len);
        var back = this.rOut.process(this.mOut, len, this.res);
        this.oq.push(this.res, back);
        pos += len;
      }
      this.mq.n = 0;
      var have = Math.min(n, this.oq.n);
      for (i = 0; i < have; i++) { var z = this.oq.a[i] * og; o0[i] = z !== z || z > 16 || z < -16 ? 0 : z; }
      for (i = have; i < n; i++) o0[i] = 0;
      this.oq.drop(have);
    }
    for (c = 1; c < out.length; c++) out[c].set(o0);
    return true;
  }
}
registerProcessor("${NAM_PROCESSOR_NAME}", NamProcessor);
`;

export const NAM_WORKLET_SOURCE = "var DSP = (function () {\n" + NAM_DSP_SOURCE + "\n})();\n" + PROCESSOR;
