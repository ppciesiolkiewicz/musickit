/*
 * WebAssembly SIMD kernels for the NAM inference code (dspSource.ts). Built by build.sh into kernelsWasm.ts.
 * Freestanding: no libc, the memory is imported so the JavaScript side owns every buffer.
 *
 * All counts that are vector lengths must be multiples of 4.
 */
#include <wasm_simd128.h>

typedef v128_t v4;
#define INLINE static inline __attribute__((always_inline))

/*
 * y[o][t] = (acc ? y[o][t] : bias[o]) + sum over taps k and inputs j of the group of o:
 *           W[(k*outCh + o)*ipg + j] * x[(g*ipg + j)*L + H - d*(K-1-k) + t]       for t in [0, n4)
 * x rows are L floats apart (they hold H history samples followed by the block), y rows are yS apart.
 */
INLINE void conv_block(float* y, int yS, const float* x, int L, const float* W, const float* bias, int outCh, int ipg,
                       int K, int H, int d, int n4, int o0, int g, int acc, const int NB)
{
  for (int t = 0; t < n4; t += 4)
  {
    v4 a0 = wasm_f32x4_splat(0), a1 = a0, a2 = a0, a3 = a0;
    if (acc)
    {
      a0 = wasm_v128_load(y + o0 * yS + t);
      if (NB > 1) a1 = wasm_v128_load(y + (o0 + 1) * yS + t);
      if (NB > 2) a2 = wasm_v128_load(y + (o0 + 2) * yS + t);
      if (NB > 3) a3 = wasm_v128_load(y + (o0 + 3) * yS + t);
    }
    if (bias)
    {
      a0 = wasm_f32x4_add(a0, wasm_f32x4_splat(bias[o0]));
      if (NB > 1) a1 = wasm_f32x4_add(a1, wasm_f32x4_splat(bias[o0 + 1]));
      if (NB > 2) a2 = wasm_f32x4_add(a2, wasm_f32x4_splat(bias[o0 + 2]));
      if (NB > 3) a3 = wasm_f32x4_add(a3, wasm_f32x4_splat(bias[o0 + 3]));
    }
    for (int k = 0; k < K; k++)
    {
      const float* xk = x + (H - d * (K - 1 - k)) + t;
      const float* wk = W + (k * outCh + o0) * ipg;
      for (int j = 0; j < ipg; j++)
      {
        v4 xv = wasm_v128_load(xk + (g * ipg + j) * L);
        a0 = wasm_f32x4_add(a0, wasm_f32x4_mul(wasm_v128_load32_splat(wk + j), xv));
        if (NB > 1) a1 = wasm_f32x4_add(a1, wasm_f32x4_mul(wasm_v128_load32_splat(wk + ipg + j), xv));
        if (NB > 2) a2 = wasm_f32x4_add(a2, wasm_f32x4_mul(wasm_v128_load32_splat(wk + 2 * ipg + j), xv));
        if (NB > 3) a3 = wasm_f32x4_add(a3, wasm_f32x4_mul(wasm_v128_load32_splat(wk + 3 * ipg + j), xv));
      }
    }
    wasm_v128_store(y + o0 * yS + t, a0);
    if (NB > 1) wasm_v128_store(y + (o0 + 1) * yS + t, a1);
    if (NB > 2) wasm_v128_store(y + (o0 + 2) * yS + t, a2);
    if (NB > 3) wasm_v128_store(y + (o0 + 3) * yS + t, a3);
  }
}

__attribute__((export_name("conv")))
void conv(float* y, int yS, const float* x, int L, const float* W, const float* bias, int outCh, int ipg, int opg, int K,
          int H, int d, int n4, int acc)
{
  for (int o = 0; o < outCh;)
  {
    const int g = o / opg;
    const int left = (g + 1) * opg - o; /* outputs left in this group */
    if (left >= 4) { conv_block(y, yS, x, L, W, bias, outCh, ipg, K, H, d, n4, o, g, acc, 4); o += 4; }
    else if (left == 3) { conv_block(y, yS, x, L, W, bias, outCh, ipg, K, H, d, n4, o, g, acc, 3); o += 3; }
    else if (left == 2) { conv_block(y, yS, x, L, W, bias, outCh, ipg, K, H, d, n4, o, g, acc, 2); o += 2; }
    else { conv_block(y, yS, x, L, W, bias, outCh, ipg, K, H, d, n4, o, g, acc, 1); o += 1; }
  }
}

/* exp(x) for x in [-87, 87], relative error about 1e-7 */
INLINE v4 exp_v(v4 x)
{
  x = wasm_f32x4_min(wasm_f32x4_max(x, wasm_f32x4_splat(-87.0f)), wasm_f32x4_splat(87.0f));
  v4 t = wasm_f32x4_mul(x, wasm_f32x4_splat(1.44269504088896341f));
  v4 k = wasm_f32x4_floor(t);
  v4 f = wasm_f32x4_sub(t, k);
  /* 2^f = sum (ln2)^i / i! f^i on [0, 1) */
  v4 p = wasm_f32x4_splat(7.0549116208e-09f);
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(1.0178086009e-07f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(1.3215486790e-06f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(1.5252733804e-05f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(1.5403530393e-04f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(1.3333558146e-03f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(9.6181291076e-03f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(5.5504108665e-02f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(2.4022650696e-01f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(6.9314718056e-01f));
  p = wasm_f32x4_add(wasm_f32x4_mul(p, f), wasm_f32x4_splat(1.0000000000e+00f));
  v4 scale = wasm_i32x4_shl(wasm_i32x4_add(wasm_i32x4_trunc_sat_f32x4(k), wasm_i32x4_splat(127)), 23);
  return wasm_f32x4_mul(p, scale);
}

/* tanh(x) = (e^2x - 1) / (e^2x + 1), accurate to about 1e-7 */
__attribute__((export_name("tanh_v")))
void tanh_v(float* a, int n)
{
  const v4 one = wasm_f32x4_splat(1.0f), two = wasm_f32x4_splat(2.0f), lim = wasm_f32x4_splat(9.0f), nlim = wasm_f32x4_splat(-9.0f);
  for (int i = 0; i < n; i += 4)
  {
    v4 x = wasm_f32x4_min(wasm_f32x4_max(wasm_v128_load(a + i), nlim), lim);
    v4 e = exp_v(wasm_f32x4_mul(x, two));
    wasm_v128_store(a + i, wasm_f32x4_div(wasm_f32x4_sub(e, one), wasm_f32x4_add(e, one)));
  }
}

__attribute__((export_name("leaky")))
void leaky(float* a, int n, float slope)
{
  const v4 s = wasm_f32x4_splat(slope), zero = wasm_f32x4_splat(0);
  for (int i = 0; i < n; i += 4)
  {
    v4 x = wasm_v128_load(a + i);
    wasm_v128_store(a + i, wasm_v128_bitselect(x, wasm_f32x4_mul(s, x), wasm_f32x4_gt(x, zero)));
  }
}

__attribute__((export_name("hardtanh")))
void hardtanh(float* a, int n)
{
  const v4 lo = wasm_f32x4_splat(-1), hi = wasm_f32x4_splat(1);
  for (int i = 0; i < n; i += 4)
    wasm_v128_store(a + i, wasm_f32x4_min(wasm_f32x4_max(wasm_v128_load(a + i), lo), hi));
}

/* dst += src */
__attribute__((export_name("add")))
void add(float* dst, const float* src, int n)
{
  for (int i = 0; i < n; i += 4)
    wasm_v128_store(dst + i, wasm_f32x4_add(wasm_v128_load(dst + i), wasm_v128_load(src + i)));
}

/* dst = src, n floats */
__attribute__((export_name("copy")))
void copy(float* dst, const float* src, int n)
{
  for (int i = 0; i < n; i += 4) wasm_v128_store(dst + i, wasm_v128_load(src + i));
}

/* rows of n4 floats: dst[r*dstS + i] = src[r*srcS + i] */
__attribute__((export_name("copy_rows")))
void copy_rows(float* dst, int dstS, const float* src, int srcS, int rows, int n4)
{
  for (int r = 0; r < rows; r++)
    for (int i = 0; i < n4; i += 4) wasm_v128_store(dst + r * dstS + i, wasm_v128_load(src + r * srcS + i));
}
