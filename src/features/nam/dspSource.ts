/**
 * Neural Amp Modeler inference, written as plain JavaScript in a string so the very same code runs in an AudioWorklet
 * (which cannot import modules from the app) and in the node tests that compare it with the reference C++ implementation
 * (NeuralAmpModelerCore). It supports the WaveNet architecture with everything the A2 format uses (per-layer kernel sizes,
 * activations, gating and blending, layer and head 1x1 convolutions, grouped convolutions, FiLM, a convolutional head,
 * a post-stack head and a condition model), LSTM, and the SlimmableContainer. ConvNet, Linear and slimmable WaveNet are not supported.
 *
 * The code evaluates to an object { buildModel, Resampler }.
 *
 * Layout: a block of audio with C channels is one Float32Array of C rows, `stride` samples apart (channel-major).
 * Weights are read in exactly the order NeuralAmpModelerCore reads them.
 */
export const NAM_DSP_SOURCE = String.raw`
"use strict";

// ---- runtime: where buffers live and which kernels run ---------------------------------------------------------------
// RT.ex is the WebAssembly kernel module (or null for the plain JavaScript fallback). While it runs, every buffer the kernels touch
// is carved out of its memory by alloc(). A first pass with RT.count measures how much memory a model needs.
var RT = { ex: null, count: null, mem: null, ptr: 0 };
var ARENA_BASE = 131072;
function alloc(n) {
  if (RT.count) { RT.count.bytes += Math.ceil(n * 4 / 16) * 16 + 16; return new Float32Array(n); }
  if (RT.mem) {
    var bytes = Math.ceil(n * 4 / 16) * 16;
    if (RT.ptr + bytes > RT.mem.buffer.byteLength) throw new Error("The model needs more memory than was reserved");
    var a = new Float32Array(RT.mem.buffer, RT.ptr, n);
    RT.ptr += bytes;
    return a;
  }
  return new Float32Array(n);
}
function copyBlock(ex, dst, src, count) {
  if (ex) ex.copy(dst.byteOffset, src.byteOffset, (count + 3) & ~3);
  else for (var i = 0; i < count; i++) dst[i] = src[i];
}
function addBlock(ex, dst, src, count) {
  if (ex) ex.add(dst.byteOffset, src.byteOffset, (count + 3) & ~3);
  else for (var i = 0; i < count; i++) dst[i] += src[i];
}

// ---- activations: each returns f(arr, offset, count) that changes arr in place --------------------------------------
function makeActivation(cfg) {
  var type = typeof cfg === "string" ? cfg : cfg && cfg.type;
  var ex = RT.ex;
  switch (type) {
    case "Tanh":
    case "Fasttanh":
      if (ex) return function (a, o, n) { ex.tanh_v(a.byteOffset + o * 4, (n + 3) & ~3); };
      return function (a, o, n) { for (var i = o; i < o + n; i++) a[i] = Math.tanh(a[i]); };
    case "Hardtanh":
      if (ex) return function (a, o, n) { ex.hardtanh(a.byteOffset + o * 4, (n + 3) & ~3); };
      return function (a, o, n) { for (var i = o; i < o + n; i++) { var x = a[i]; var t = x < -1 ? -1 : x; a[i] = t > 1 ? 1 : t; } };
    case "ReLU":
      if (ex) return function (a, o, n) { ex.leaky(a.byteOffset + o * 4, (n + 3) & ~3, 0); };
      return function (a, o, n) { for (var i = o; i < o + n; i++) if (!(a[i] > 0)) a[i] = 0; };
    case "LeakyReLU": {
      var s = cfg && typeof cfg === "object" && typeof cfg.negative_slope === "number" ? cfg.negative_slope : 0.01;
      if (ex) return function (a, o, n) { ex.leaky(a.byteOffset + o * 4, (n + 3) & ~3, s); };
      return function (a, o, n) { for (var i = o; i < o + n; i++) if (!(a[i] > 0)) a[i] = s * a[i]; };
    }
    case "PReLU": {
      var slopes = cfg && Array.isArray(cfg.negative_slopes) ? cfg.negative_slopes : null;
      var ps = cfg && typeof cfg.negative_slope === "number" ? cfg.negative_slope : 0.01;
      var slopeOf = function (c) { return slopes ? slopes[c] : ps; };
      if (ex) return function (a, o, n, c) { ex.leaky(a.byteOffset + o * 4, (n + 3) & ~3, slopeOf(c)); };
      return function (a, o, n, c) { var sp = slopeOf(c); for (var i = o; i < o + n; i++) if (!(a[i] > 0)) a[i] = sp * a[i]; };
    }
    case "Sigmoid":
      return function (a, o, n) { for (var i = o; i < o + n; i++) a[i] = 1 / (1 + Math.exp(-a[i])); };
    case "SiLU":
      return function (a, o, n) { for (var i = o; i < o + n; i++) { var x = a[i]; a[i] = x / (1 + Math.exp(-x)); } };
    case "Hardswish":
      return function (a, o, n) { for (var i = o; i < o + n; i++) { var x = a[i]; var t = x + 3; t = t < 0 ? 0 : t > 6 ? 6 : t; a[i] = x * t * (1 / 6); } };
    case "Softsign":
      return function (a, o, n) { for (var i = o; i < o + n; i++) { var x = a[i]; a[i] = x / (1 + Math.abs(x)); } };
    case "LeakyHardtanh":
    case "LeakyHardTanh": {
      var lo = cfg.min_val !== undefined ? cfg.min_val : -1, hi = cfg.max_val !== undefined ? cfg.max_val : 1;
      var sl = cfg.min_slope !== undefined ? cfg.min_slope : 0.01, sh = cfg.max_slope !== undefined ? cfg.max_slope : 0.01;
      return function (a, o, n) { for (var i = o; i < o + n; i++) { var x = a[i]; a[i] = x < lo ? (x - lo) * sl + lo : x > hi ? (x - hi) * sh + hi : x; } };
    }
    default:
      throw new Error("Unsupported activation: " + JSON.stringify(cfg));
  }
}

// ---- weights reader ----------------------------------------------------------------------------------------------
function Reader(w) { this.w = w; this.p = 0; }
Reader.prototype.next = function () {
  if (this.p >= this.w.length) throw new Error("The model has fewer weights than its architecture needs");
  return this.w[this.p++];
};

// ---- Conv: dilated causal convolution with groups; kernel 1 is a 1x1 convolution ---------------------------------------
function Conv(inCh, outCh, K, dilation, groups, bias, maxN) {
  if (inCh % groups !== 0 || outCh % groups !== 0) throw new Error("Channels must divide by the number of groups");
  this.inCh = inCh; this.outCh = outCh; this.K = K; this.d = dilation; this.groups = groups; this.hasBias = !!bias;
  this.ipg = inCh / groups; this.opg = outCh / groups;
  this.W = alloc(K * outCh * this.ipg);
  this.bias = alloc(bias ? outCh : 0);
  this.H = (K - 1) * dilation;
  this.L = this.H + maxN;
  this.buf = alloc(inCh * this.L);
  this.maxN = maxN;
  this.out = alloc(outCh * maxN);
  this.ex = RT.ex;
}
Conv.prototype.setWeights = function (r) {
  var K = this.K, ipg = this.ipg, opg = this.opg;
  for (var g = 0; g < this.groups; g++)
    for (var i = 0; i < opg; i++)
      for (var j = 0; j < ipg; j++)
        for (var k = 0; k < K; k++) this.W[(k * this.outCh + g * opg + i) * ipg + j] = r.next();
  for (var b = 0; b < this.bias.length; b++) this.bias[b] = r.next();
};
Conv.prototype.reset = function () { this.buf.fill(0); };
// input: rows 0..inCh-1 at stride inS. The result goes to out (default this.out, stride maxN); with acc it is added to what out holds.
Conv.prototype.process = function (input, inS, n, out, acc) {
  var H = this.H, L = this.L, buf = this.buf, ic, o, k, j, t, N = this.maxN;
  out = out || this.out;
  if (this.ex) {
    var n4 = (n + 3) & ~3;
    this.ex.copy_rows(buf.byteOffset + H * 4, L, input.byteOffset, inS, this.inCh, n4);
    this.ex.conv(out.byteOffset, N, buf.byteOffset, L, this.W.byteOffset, this.hasBias ? this.bias.byteOffset : 0, this.outCh, this.ipg, this.opg, this.K, H, this.d, n4, acc ? 1 : 0);
  } else {
    for (ic = 0; ic < this.inCh; ic++) { var src = ic * inS, dst = ic * L + H; for (t = 0; t < n; t++) buf[dst + t] = input[src + t]; }
    var W = this.W, K2 = this.K, ipg = this.ipg, opg = this.opg, d = this.d;
    for (o = 0; o < this.outCh; o++) {
      var ob = o * N, g = (o / opg) | 0, b = this.hasBias ? this.bias[o] : 0;
      if (acc) { if (b !== 0) for (t = 0; t < n; t++) out[ob + t] += b; } else for (t = 0; t < n; t++) out[ob + t] = b;
      for (k = 0; k < K2; k++) {
        var off = H - d * (K2 - 1 - k), wb = (k * this.outCh + o) * ipg;
        for (j = 0; j < ipg; j++) {
          var w = W[wb + j];
          if (w === 0) continue;
          var ib = (g * ipg + j) * L + off;
          for (t = 0; t < n; t++) out[ob + t] += w * buf[ib + t];
        }
      }
    }
  }
  if (H > 0) for (ic = 0; ic < this.inCh; ic++) buf.copyWithin(ic * L, ic * L + n, ic * L + n + H);
  return out;
};

// ---- FiLM: output = input * scale (+ shift), scale and shift from a 1x1 convolution of the condition --------------------
function FiLM(condDim, dim, shift, groups, maxN) {
  this.dim = dim; this.shift = !!shift; this.maxN = maxN;
  this.conv = new Conv(condDim, (shift ? 2 : 1) * dim, 1, 1, groups, true, maxN);
  this.out = alloc(dim * maxN);
}
FiLM.prototype.setWeights = function (r) { this.conv.setWeights(r); };
FiLM.prototype.reset = function () {};
// input: rows at stride inS; writes into this.out (stride maxN)
FiLM.prototype.process = function (input, inS, cond, condS, n) {
  var ss = this.conv.process(cond, condS, n), N = this.maxN, dim = this.dim, out = this.out;
  for (var c = 0; c < dim; c++) {
    var ib = c * inS, sb = c * N, hb = (c + dim) * N, ob = c * N;
    if (this.shift) for (var t = 0; t < n; t++) out[ob + t] = input[ib + t] * ss[sb + t] + ss[hb + t];
    else for (var t2 = 0; t2 < n; t2++) out[ob + t2] = input[ib + t2] * ss[sb + t2];
  }
  return out;
};
// in place: input rows (stride inS) are replaced
FiLM.prototype.processInPlace = function (input, inS, cond, condS, n) {
  var out = this.process(input, inS, cond, condS, n), N = this.maxN;
  for (var c = 0; c < this.dim; c++) for (var t = 0; t < n; t++) input[c * inS + t] = out[c * N + t];
};

// ---- WaveNet layer -------------------------------------------------------------------------------------------------------
function Layer(p, maxN) {
  var gated = p.gating !== "none";
  var zCh = gated ? 2 * p.bottleneck : p.bottleneck;
  this.p = p; this.maxN = maxN; this.gated = gated; this.zCh = zCh; this.bn = p.bottleneck; this.channels = p.channels;
  this.conv = new Conv(p.channels, zCh, p.kernel, p.dilation, p.groupsInput, true, maxN);
  this.mixin = new Conv(p.condSize, zCh, 1, 1, p.groupsMixin, false, maxN);
  this.act = makeActivation(p.activation);
  this.act2 = gated ? makeActivation(p.secondary) : null;
  this.l1 = null; this.h1 = null;
  if (p.layer1x1.active) this.l1 = new Conv(p.bottleneck, p.channels, 1, 1, p.layer1x1.groups, true, maxN);
  else if (p.bottleneck !== p.channels) throw new Error("When layer1x1 is off the bottleneck must equal the channels");
  if (p.head1x1.active) this.h1 = new Conv(p.bottleneck, p.head1x1.out_channels, 1, 1, p.head1x1.groups, true, maxN);
  this.headCh = this.h1 ? p.head1x1.out_channels : p.bottleneck;
  var f = p.film, cs = p.condSize;
  this.fConvPre = f.conv_pre.active ? new FiLM(cs, p.channels, f.conv_pre.shift, f.conv_pre.groups, maxN) : null;
  this.fConvPost = f.conv_post.active ? new FiLM(cs, zCh, f.conv_post.shift, f.conv_post.groups, maxN) : null;
  this.fMixPre = f.mixin_pre.active ? new FiLM(cs, cs, f.mixin_pre.shift, f.mixin_pre.groups, maxN) : null;
  this.fMixPost = f.mixin_post.active ? new FiLM(cs, zCh, f.mixin_post.shift, f.mixin_post.groups, maxN) : null;
  this.fActPre = f.act_pre.active ? new FiLM(cs, zCh, f.act_pre.shift, f.act_pre.groups, maxN) : null;
  this.fActPost = f.act_post.active ? new FiLM(cs, p.bottleneck, f.act_post.shift, f.act_post.groups, maxN) : null;
  this.fL1Post = f.l1_post.active && this.l1 ? new FiLM(cs, p.channels, f.l1_post.shift, f.l1_post.groups, maxN) : null;
  this.fH1Post = f.h1_post.active && this.h1 ? new FiLM(cs, p.head1x1.out_channels, f.h1_post.shift, f.h1_post.groups, maxN) : null;
  this.z = alloc(zCh * maxN);
  this.nextOut = alloc(p.channels * maxN);
  this.gateTmp = gated ? alloc(2 * maxN) : null;
  this.headOut = null;
  this.ex = RT.ex;
}
Layer.prototype.setWeights = function (r) {
  this.conv.setWeights(r); this.mixin.setWeights(r);
  if (this.l1) this.l1.setWeights(r);
  if (this.h1) this.h1.setWeights(r);
  var fs = [this.fConvPre, this.fConvPost, this.fMixPre, this.fMixPost, this.fActPre, this.fActPost, this.fL1Post, this.fH1Post];
  for (var i = 0; i < fs.length; i++) if (fs[i]) fs[i].setWeights(r);
};
Layer.prototype.reset = function () { this.conv.reset(); };
// input: channels rows, stride inS. cond: condSize rows, stride N. Results: this.nextOut (residual) and this.headOut (skip), both stride N.
Layer.prototype.process = function (input, inS, cond, n) {
  var N = this.maxN, bn = this.bn, z = this.z, c, t;
  var cin = this.fConvPre ? this.fConvPre.process(input, inS, cond, N, n) : input, cinS = this.fConvPre ? N : inS;
  var min = this.fMixPre ? this.fMixPre.process(cond, N, cond, N, n) : cond;
  if (!this.fConvPost && !this.fMixPost) {
    this.conv.process(cin, cinS, n, z, false);
    this.mixin.process(min, N, n, z, true);
  } else {
    var convOut = this.conv.process(cin, cinS, n);
    if (this.fConvPost) this.fConvPost.processInPlace(convOut, N, cond, N, n);
    var mixOut = this.mixin.process(min, N, n);
    if (this.fMixPost) this.fMixPost.processInPlace(mixOut, N, cond, N, n);
    for (c = 0; c < this.zCh; c++) { var zb = c * N; for (t = 0; t < n; t++) z[zb + t] = convOut[zb + t] + mixOut[zb + t]; }
  }
  if (this.fActPre) this.fActPre.processInPlace(z, N, cond, N, n);
  var act = this.act;
  if (!this.gated) {
    for (c = 0; c < bn; c++) act(z, c * N, n, c);
  } else {
    var act2 = this.act2, blend = this.p.gating === "blended", tmp = this.gateTmp;
    for (c = 0; c < bn; c++) {
      var a0 = c * N, g0 = (c + bn) * N;
      for (t = 0; t < n; t++) { tmp[t] = z[a0 + t]; tmp[N + t] = z[g0 + t]; }
      act(tmp, 0, n, c); act2(tmp, N, n, c);
      if (blend) for (t = 0; t < n; t++) z[a0 + t] = tmp[N + t] * tmp[t] + (1 - tmp[N + t]) * z[a0 + t];
      else for (t = 0; t < n; t++) z[a0 + t] = tmp[t] * tmp[N + t];
    }
  }
  if (this.fActPost) this.fActPost.processInPlace(z, N, cond, N, n);
  var nxt = this.nextOut, ch = this.channels;
  if (this.l1) {
    if (this.fL1Post) {
      var l1out = this.l1.process(z, N, n);
      this.fL1Post.processInPlace(l1out, N, cond, N, n);
      for (c = 0; c < ch; c++) for (t = 0; t < n; t++) nxt[c * N + t] = input[c * inS + t] + l1out[c * N + t];
    } else {
      if (inS === N) copyBlock(this.ex, nxt, input, ch * N);
      else for (c = 0; c < ch; c++) for (t = 0; t < n; t++) nxt[c * N + t] = input[c * inS + t];
      this.l1.process(z, N, n, nxt, true);
    }
  } else if (inS === N) copyBlock(this.ex, nxt, input, ch * N);
  else for (c = 0; c < ch; c++) for (t = 0; t < n; t++) nxt[c * N + t] = input[c * inS + t];
  if (this.h1) {
    var h = this.h1.process(z, N, n);
    if (this.fH1Post) this.fH1Post.processInPlace(h, N, cond, N, n);
    this.headOut = h;
  } else this.headOut = z; // the first bn rows of z are the activated values
};

// ---- Layer array ---------------------------------------------------------------------------------------------------------
function LayerArray(p, maxN) {
  this.p = p; this.maxN = maxN;
  this.rechannel = new Conv(p.inputSize, p.channels, 1, 1, 1, false, maxN);
  this.layers = [];
  for (var i = 0; i < p.dilations.length; i++) {
    this.layers.push(new Layer({
      condSize: p.condSize, channels: p.channels, bottleneck: p.bottleneck, kernel: p.kernelSizes[i], dilation: p.dilations[i],
      activation: p.activations[i], gating: p.gating[i], secondary: p.secondary[i], groupsInput: p.groupsInput, groupsMixin: p.groupsMixin,
      layer1x1: p.layer1x1, head1x1: p.head1x1, film: p.film
    }, maxN));
  }
  this.headIn = p.head1x1.active ? p.head1x1.out_channels : p.bottleneck;
  this.headRechannel = new Conv(this.headIn, p.headSize, p.headKernel, p.headDilation, 1, p.headBias, maxN);
  this.headInputs = alloc(this.headIn * maxN);
  this.layerOutputs = null;
  this.headOutputs = null;
  this.ex = RT.ex;
}
LayerArray.prototype.setWeights = function (r) {
  this.rechannel.setWeights(r);
  for (var i = 0; i < this.layers.length; i++) this.layers[i].setWeights(r);
  this.headRechannel.setWeights(r);
};
LayerArray.prototype.reset = function () {
  for (var i = 0; i < this.layers.length; i++) this.layers[i].reset();
  this.headRechannel.reset();
};
LayerArray.prototype.receptiveField = function () {
  var rf = 0;
  for (var i = 0; i < this.layers.length; i++) rf += this.layers[i].p.dilation * (this.layers[i].p.kernel - 1);
  return rf + this.p.headDilation * (this.p.headKernel - 1);
};
// prevHead: null for the first array
LayerArray.prototype.process = function (layerIn, inS, cond, prevHead, n) {
  var N = this.maxN, hi = this.headInputs, i;
  if (prevHead) copyBlock(this.ex, hi, prevHead, this.headIn * N);
  else hi.fill(0);
  var cur = this.rechannel.process(layerIn, inS, n), curS = N;
  for (i = 0; i < this.layers.length; i++) {
    var L = this.layers[i];
    L.process(cur, curS, cond, n);
    addBlock(this.ex, hi, L.headOut, this.headIn * N);
    cur = L.nextOut; curS = N;
  }
  this.layerOutputs = cur;
  this.headOutputs = this.headRechannel.process(hi, N, n);
};

// ---- WaveNet -------------------------------------------------------------------------------------------------------------
function film(cfg) {
  if (!cfg) return { active: false, shift: false, groups: 1 };
  return { active: cfg.active !== undefined ? !!cfg.active : true, shift: cfg.shift !== undefined ? !!cfg.shift : true, groups: cfg.groups || 1 };
}
function parseArray(lc, maxN) {
  var dil = lc.dilations, n = dil.length;
  var channels = lc.channels, bottleneck = lc.bottleneck !== undefined ? lc.bottleneck : channels;
  var head = lc.head && typeof lc.head === "object" ? lc.head : null;
  var headSize, headKernel = 1, headDilation = 1, headBias;
  if (head) { headSize = head.out_channels; headKernel = head.kernel_size; headBias = !!head.bias; if (head.head_dilation) headDilation = head.head_dilation; }
  else if (lc.head_size !== undefined) { headSize = lc.head_size; headBias = !!lc.head_bias; }
  else throw new Error("A layer array has no head");
  var ks;
  if (lc.kernel_sizes) { ks = lc.kernel_sizes; if (ks.length !== n) throw new Error("kernel_sizes must match dilations"); }
  else if (lc.kernel_size !== undefined) { ks = []; for (var i = 0; i < n; i++) ks.push(lc.kernel_size); }
  else throw new Error("A layer array has no kernel size");
  var acts = [];
  for (var a = 0; a < n; a++) acts.push(Array.isArray(lc.activation) ? lc.activation[a] : lc.activation);
  var gating = [], secondary = [];
  for (var g = 0; g < n; g++) {
    var mode = "none";
    if (lc.gating_mode !== undefined) mode = Array.isArray(lc.gating_mode) ? lc.gating_mode[g] : lc.gating_mode;
    else if (lc.gated !== undefined) mode = lc.gated ? "gated" : "none";
    gating.push(mode);
    var sec = lc.secondary_activation;
    if (Array.isArray(sec)) sec = sec[g];
    secondary.push(mode === "none" ? null : (sec !== undefined && sec !== null ? sec : "Sigmoid"));
  }
  var l1 = lc.layer1x1 ? { active: !!lc.layer1x1.active, groups: lc.layer1x1.groups || 1 } : { active: true, groups: 1 };
  var h1 = lc.head1x1 ? { active: !!lc.head1x1.active, out_channels: lc.head1x1.out_channels, groups: lc.head1x1.groups || 1 } : { active: false, out_channels: channels, groups: 1 };
  return {
    inputSize: lc.input_size, condSize: lc.condition_size, headSize: headSize, headKernel: headKernel, headDilation: headDilation, headBias: headBias,
    channels: channels, bottleneck: bottleneck, kernelSizes: ks, dilations: dil, activations: acts, gating: gating, secondary: secondary,
    groupsInput: lc.groups_input || 1, groupsMixin: lc.groups_input_mixin || 1, layer1x1: l1, head1x1: h1,
    film: {
      conv_pre: film(lc.conv_pre_film), conv_post: film(lc.conv_post_film), mixin_pre: film(lc.input_mixin_pre_film), mixin_post: film(lc.input_mixin_post_film),
      act_pre: film(lc.activation_pre_film), act_post: film(lc.activation_post_film), l1_post: film(lc.layer1x1_post_film), h1_post: film(lc.head1x1_post_film)
    }
  };
}

function WaveNet(spec, maxN) {
  var cfg = spec.config;
  this.maxN = maxN;
  this.inCh = cfg.in_channels || 1;
  this.arrays = [];
  var i;
  for (i = 0; i < cfg.layers.length; i++) this.arrays.push(new LayerArray(parseArray(cfg.layers[i], maxN), maxN));
  if (!this.arrays.length) throw new Error("WaveNet needs at least one layer array");
  this.condModel = cfg.condition_dsp ? buildInner(cfg.condition_dsp, maxN) : null;
  this.condDim = this.arrays[0].p.inputSize === this.inCh ? this.inCh : this.inCh;
  if (this.condModel && this.condModel.inCh !== this.inCh) throw new Error("The condition model has the wrong number of inputs");
  this.condCh = this.condModel ? this.condModel.outCh : this.inCh;
  this.condIn = alloc(this.inCh * maxN);
  this.condOut = this.condModel ? alloc(this.condCh * maxN) : this.condIn;
  this.head = null;
  var last = this.arrays[this.arrays.length - 1].p;
  this.outCh = last.headSize;
  if (cfg.head) {
    var h = cfg.head;
    this.head = { convs: [], acts: [], inCh: last.headSize };
    var cin = last.headSize;
    for (i = 0; i < h.kernel_sizes.length; i++) {
      var cout = i + 1 === h.kernel_sizes.length ? h.out_channels : h.channels;
      this.head.convs.push(new Conv(cin, cout, h.kernel_sizes[i], 1, 1, true, maxN));
      this.head.acts.push(makeActivation(h.activation));
      cin = cout;
    }
    this.outCh = h.out_channels;
    this.headScratch = alloc(last.headSize * maxN);
  }
  var r = new Reader(spec.weights);
  for (i = 0; i < this.arrays.length; i++) this.arrays[i].setWeights(r);
  if (this.head) for (i = 0; i < this.head.convs.length; i++) this.head.convs[i].setWeights(r);
  this.headScale = r.next();
  if (r.p !== spec.weights.length) throw new Error("The model has more weights than its architecture needs");
  var pw = this.condModel ? this.condModel.prewarmSamples : 1;
  for (i = 0; i < this.arrays.length; i++) pw += this.arrays[i].receptiveField();
  if (this.head) { var rf = 1; for (i = 0; i < this.head.convs.length; i++) rf += this.head.convs[i].K - 1; pw += rf - 1; }
  this.prewarmSamples = pw;
}
WaveNet.prototype.reset = function () {
  for (var i = 0; i < this.arrays.length; i++) this.arrays[i].reset();
  if (this.head) for (var j = 0; j < this.head.convs.length; j++) this.head.convs[j].reset();
  if (this.condModel) this.condModel.reset();
};
// inputs: array of Float32Array (one per channel, length >= n); outputs likewise
WaveNet.prototype.process = function (inputs, outputs, n) {
  var N = this.maxN, c, t, i;
  for (c = 0; c < this.inCh; c++) for (t = 0; t < n; t++) this.condIn[c * N + t] = inputs[c][t];
  if (this.condModel) {
    var ci = [], co = [];
    for (c = 0; c < this.inCh; c++) ci.push(this.condIn.subarray(c * N, c * N + n));
    var tmp = this.condTmp || (this.condTmp = []);
    for (c = 0; c < this.condCh; c++) { if (!tmp[c]) tmp[c] = new Float32Array(N); co.push(tmp[c]); }
    this.condModel.process(ci, co, n);
    for (c = 0; c < this.condCh; c++) for (t = 0; t < n; t++) this.condOut[c * N + t] = co[c][t];
  }
  var prevHead = null, layerIn = this.condIn, inS = N;
  for (i = 0; i < this.arrays.length; i++) {
    var A = this.arrays[i];
    A.process(layerIn, inS, this.condOut, prevHead, n);
    prevHead = A.headOutputs; layerIn = A.layerOutputs; inS = N;
  }
  var fin = prevHead, scale = this.headScale;
  if (this.head) {
    var sc = this.headScratch, hc = this.head.inCh;
    for (c = 0; c < hc; c++) for (t = 0; t < n; t++) sc[c * N + t] = scale * fin[c * N + t];
    var cur = sc, curS = N;
    for (i = 0; i < this.head.convs.length; i++) {
      var cv = this.head.convs[i];
      for (c = 0; c < cv.inCh; c++) this.head.acts[i](cur, c * curS, n, c);
      cur = cv.process(cur, curS, n); curS = N;
    }
    for (c = 0; c < this.outCh; c++) for (t = 0; t < n; t++) outputs[c][t] = cur[c * N + t];
    return;
  }
  for (c = 0; c < this.outCh; c++) for (t = 0; t < n; t++) outputs[c][t] = scale * fin[c * N + t];
};

// ---- LSTM ----------------------------------------------------------------------------------------------------------------
function LSTM(spec, maxN) {
  var cfg = spec.config, r = new Reader(spec.weights);
  this.inCh = cfg.in_channels || 1; this.outCh = cfg.out_channels || 1; this.maxN = maxN;
  this.hidden = cfg.hidden_size; this.layers = [];
  var nl = cfg.num_layers, H = this.hidden, i, j;
  for (i = 0; i < nl; i++) {
    var inSize = i === 0 ? cfg.input_size : H, cols = inSize + H;
    var cell = { inSize: inSize, w: new Float32Array(4 * H * cols), b: new Float32Array(4 * H), xh: new Float32Array(cols), c: new Float32Array(H), ifgo: new Float32Array(4 * H) };
    for (j = 0; j < cell.w.length; j++) cell.w[j] = r.next();
    for (j = 0; j < cell.b.length; j++) cell.b[j] = r.next();
    for (j = 0; j < H; j++) cell.xh[inSize + j] = r.next();
    for (j = 0; j < H; j++) cell.c[j] = r.next();
    cell.xh0 = cell.xh.slice(); cell.c0 = cell.c.slice();
    this.layers.push(cell);
  }
  this.headW = new Float32Array(this.outCh * H); this.headB = new Float32Array(this.outCh);
  for (j = 0; j < this.headW.length; j++) this.headW[j] = r.next();
  for (j = 0; j < this.headB.length; j++) this.headB[j] = r.next();
  if (r.p !== spec.weights.length) throw new Error("The model has more weights than its architecture needs");
  this.prewarmSamples = Math.max(1, Math.floor(0.5 * (spec.sampleRate > 0 ? spec.sampleRate : 48000)));
  this.input = new Float32Array(cfg.input_size);
}
LSTM.prototype.reset = function () { for (var i = 0; i < this.layers.length; i++) { this.layers[i].xh.set(this.layers[i].xh0); this.layers[i].c.set(this.layers[i].c0); } };
LSTM.prototype.cell = function (cell, x) {
  var H = this.hidden, cols = cell.inSize + H, w = cell.w, ifgo = cell.ifgo, xh = cell.xh, i, j;
  for (i = 0; i < cell.inSize; i++) xh[i] = x[i];
  for (i = 0; i < 4 * H; i++) { var s = cell.b[i], rb = i * cols; for (j = 0; j < cols; j++) s += w[rb + j] * xh[j]; ifgo[i] = s; }
  for (i = 0; i < H; i++) {
    var ig = 1 / (1 + Math.exp(-ifgo[i])), fg = 1 / (1 + Math.exp(-ifgo[H + i])), gg = Math.tanh(ifgo[2 * H + i]);
    cell.c[i] = fg * cell.c[i] + ig * gg;
  }
  for (i = 0; i < H; i++) xh[cell.inSize + i] = (1 / (1 + Math.exp(-ifgo[3 * H + i]))) * Math.tanh(cell.c[i]);
};
LSTM.prototype.process = function (inputs, outputs, n) {
  var H = this.hidden, t, o, j, l;
  for (t = 0; t < n; t++) {
    for (j = 0; j < this.inCh; j++) this.input[j] = inputs[j][t];
    this.cell(this.layers[0], this.input);
    for (l = 1; l < this.layers.length; l++) this.cell(this.layers[l], this.layers[l - 1].xh.subarray(this.layers[l - 1].inSize));
    var hs = this.layers[this.layers.length - 1];
    for (o = 0; o < this.outCh; o++) {
      var s = this.headB[o];
      for (j = 0; j < H; j++) s += this.headW[o * H + j] * hs.xh[hs.inSize + j];
      outputs[o][t] = s;
    }
  }
};

// ---- Slimmable container: several models of different sizes, one active at a time ---------------------------------
function Container(spec, maxN) {
  var subs = spec.config.submodels;
  if (!subs || !subs.length) throw new Error("The container has no submodels");
  this.subs = [];
  for (var i = 0; i < subs.length; i++) this.subs.push({ max: subs[i].max_value, model: buildInner(subs[i].model, maxN) });
  this.inCh = this.subs[0].model.inCh; this.outCh = this.subs[0].model.outCh;
  this.active = this.subs.length - 1;
  this.breakpoints = this.subs.slice(0, -1).map(function (s) { return s.max; });
}
Object.defineProperty(Container.prototype, "prewarmSamples", { get: function () { return this.subs[this.active].model.prewarmSamples; } });
// returns true when the active model changed (its state must be warmed up again)
Container.prototype.setSlim = function (v) {
  var idx = this.subs.length - 1;
  for (var i = 0; i < this.subs.length; i++) if (v < this.subs[i].max) { idx = i; break; }
  if (idx === this.active) return false;
  this.active = idx; this.subs[idx].model.reset();
  return true;
};
Container.prototype.reset = function () { this.subs[this.active].model.reset(); };
Container.prototype.process = function (a, b, n) { this.subs[this.active].model.process(a, b, n); };

function buildInner(spec, maxN) {
  var arch = spec.architecture;
  var sr = typeof spec.sample_rate === "number" ? spec.sample_rate : -1;
  var weights = spec.weights;
  if (arch !== "SlimmableContainer" && !(weights instanceof Float32Array)) spec = Object.assign({}, spec, { weights: Float32Array.from(weights || []) });
  spec.sampleRate = sr;
  var m;
  if (arch === "WaveNet") {
    var lays = spec.config.layers || [];
    for (var i = 0; i < lays.length; i++) if (lays[i].slimmable) throw new Error("Slimmable WaveNet models are not supported yet");
    m = new WaveNet(spec, maxN);
  } else if (arch === "LSTM") m = new LSTM(spec, maxN);
  else if (arch === "SlimmableContainer") m = new Container(spec, maxN);
  else throw new Error("The " + arch + " architecture is not supported (WaveNet, LSTM and SlimmableContainer are)");
  m.sampleRate = sr;
  m.loudness = spec.metadata && typeof spec.metadata.loudness === "number" ? spec.metadata.loudness : null;
  return m;
}

// ---- Resampler: streaming windowed-sinc, used when the audio context does not run at the model's sample rate --------------
function Resampler(inRate, outRate) {
  this.step = inRate / outRate;
  var cutoff = Math.min(1, outRate / inRate) * 0.94;
  this.half = 16; this.phases = 256;
  var taps = this.half * 2, table = new Float32Array((this.phases + 1) * taps);
  for (var p = 0; p <= this.phases; p++) {
    var frac = p / this.phases, sum = 0;
    for (var k = 0; k < taps; k++) {
      var x = k - (this.half - 1) - frac;
      var sinc = x === 0 ? 1 : Math.sin(Math.PI * cutoff * x) / (Math.PI * cutoff * x);
      var win = 0.5 + 0.5 * Math.cos(Math.PI * x / this.half);
      var v = cutoff * sinc * win; table[p * taps + k] = v; sum += v;
    }
    for (var k2 = 0; k2 < taps; k2++) table[p * taps + k2] /= sum;
  }
  this.table = table; this.taps = taps;
  this.hist = new Float32Array(taps + 8192); this.n = 0; this.pos = 0;
}
// Consumes x[0..n), appends the resampled audio to out (a plain growing array handled by the caller) and returns the count.
Resampler.prototype.process = function (x, n, out) {
  var taps = this.taps, i, produced = 0;
  if (this.n + n > this.hist.length) { var bigger = new Float32Array(this.n + n + 8192); bigger.set(this.hist.subarray(0, this.n)); this.hist = bigger; }
  for (i = 0; i < n; i++) this.hist[this.n + i] = x[i];
  this.n += n;
  var h = this.hist;
  while (this.pos + this.half < this.n) {
    var base = Math.floor(this.pos), frac = this.pos - base, ph = frac * this.phases, p0 = Math.floor(ph), pf = ph - p0, s = 0;
    var t0 = p0 * taps, t1 = (p0 + 1) * taps, start = base - (this.half - 1);
    for (var k = 0; k < taps; k++) {
      var idx = start + k, v = idx >= 0 ? h[idx] : 0, w = this.table[t0 + k] + (this.table[t1 + k] - this.table[t0 + k]) * pf;
      s += v * w;
    }
    out[produced++] = s; this.pos += this.step;
  }
  var drop = Math.max(0, Math.floor(this.pos) - this.half - 1);
  if (drop > 0) { h.copyWithin(0, drop, this.n); this.n -= drop; this.pos -= drop; }
  return produced;
};

// Builds a model for blocks of up to maxN samples (rounded up to a multiple of 4). With opts.wasm (the kernel module bytes) the heavy
// loops run as WebAssembly SIMD; without it a plain JavaScript version runs (slower, and the reference for the tests).
function buildModel(spec, maxN, opts) {
  opts = opts || {};
  maxN = (maxN + 3) & ~3;
  if (!opts.wasm || typeof WebAssembly === "undefined") {
    RT = { ex: null, count: null, mem: null, ptr: 0};
    try { return buildInner(spec, maxN); } finally { RT = { ex: null, count: null, mem: null, ptr: 0 }; }
  }
  var bytes;
  RT = { ex: null, count: { bytes: 0 }, mem: null, ptr: 0};
  try { buildInner(spec, maxN); bytes = RT.count.bytes; } finally { RT = { ex: null, count: null, mem: null, ptr: 0 }; }
  var pages = Math.ceil((ARENA_BASE + bytes + 4096) / 65536);
  if (pages > 4096) throw new Error("This model is too large");
  var mem = new WebAssembly.Memory({ initial: pages });
  var inst = new WebAssembly.Instance(new WebAssembly.Module(opts.wasm), { env: { memory: mem } });
  RT = { ex: inst.exports, count: null, mem: mem, ptr: ARENA_BASE};
  try { return buildInner(spec, maxN); } finally { RT = { ex: null, count: null, mem: null, ptr: 0 }; }
}

return { buildModel: buildModel, Resampler: Resampler };
`;
