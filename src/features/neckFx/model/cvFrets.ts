import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { SCALE_MM, distOf, type Placed, type Pt } from "./grid";
import { neckWidthMm } from "./fx";

/**
 * The OpenCV neck reader's maths (pure; `client/cv.ts` does the image work). The fret markers give the neck's axis and where
 * each fret falls along it, with perspective; the picture gives the rest. The frame is turned so the axis runs level (the
 * "strip": `s` along, `y` across), each fret is snapped to the bright wire nearest it, a wire's lean is read from where it is
 * in the board's upper and lower halves, and the board's two edges are lines fitted to the strongest edges found where the
 * board should be. Across the neck a mm is measured from the markers' printed size.
 */

export const TOP_WIRE = 22;
/** Half the strip's height (px): room for the board on either side of the markers. */
export const STRIP_HALF = 170;
/** Nut to wire `f`, in mm. */
export const wireMm = (f: number) => SCALE_MM * distOf(f);

/** A marker stuck on the board: the fret space it is in the middle of, and its printed size (mm). */
export interface BoardMarker { id: number; fret: number; mm: number }
export interface Seen { id: number; corners: Pt[] }

/** The markers placed in fret spaces (not the nut, nor `off`: level with a fret but off the board) whose size is known. */
export const boardMarkers = (placed: Placed[], mmOf: (id: number) => number | undefined, off: ReadonlySet<number> = new Set()): BoardMarker[] =>
  placed.flatMap((p) => { const mm = mmOf(p.id); return p.fret > 0 && mm && !off.has(p.id) ? [{ id: p.id, fret: p.fret, mm }] : []; });

/** A marker read once more is kept only when it is big enough and near square; of one id seen twice, the bigger. */
export function keepMarkers(seen: Seen[], minSide: number): Seen[] {
  const best = new Map<number, { m: Seen; size: number }>();
  for (const m of seen) {
    const sides = m.corners.map((p, i) => { const q = m.corners[(i + 1) % 4]; return Math.hypot(q.x - p.x, q.y - p.y); });
    const lo = Math.min(...sides), hi = Math.max(...sides);
    if (lo < minSide || lo / hi < 0.4) continue;
    const size = sides.reduce((t, v) => t + v, 0);
    if ((best.get(m.id)?.size ?? 0) < size) best.set(m.id, { m, size });
  }
  return [...best.values()].map((b) => b.m);
}

/** s = (a·x + b) / (c·x + 1): a mm along the board to a place along the axis, perspective included. */
export type Proj = [number, number, number];
export const proj = (p: Proj, x: number) => (p[0] * x + p[1]) / (p[2] * x + 1);
export const projInv = (p: Proj, s: number) => (s - p[1]) / (p[0] - p[2] * s);

/** Least squares for `Proj`; two points (or a degenerate set) give a straight scale. Null under two points. */
export function projFit(x: number[], s: number[]): Proj | null {
  if (x.length < 2) return null;
  const line = (): Proj | null => { const l = lineFit(x, s); return l ? [l[0], l[1], 0] : null; };
  if (x.length < 3) return line();
  // s = a x + b − c x s, linear in a, b, c: normal equations
  const rows = x.map((xi, i) => [xi, 1, -xi * s[i]]);
  const A = [0, 1, 2].map((r) => [0, 1, 2].map((c) => rows.reduce((t, row) => t + row[r] * row[c], 0)));
  const v = [0, 1, 2].map((r) => rows.reduce((t, row, i) => t + row[r] * s[i], 0));
  const sol = solve3(A, v);
  return sol && Math.abs(sol[2]) < 0.01 ? [sol[0], sol[1], sol[2]] : line();
}
function solve3(A: number[][], v: number[]): number[] | null {
  const m = A.map((r, i) => [...r, v[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; }
  }
  return [0, 1, 2].map((i) => m[i][3] / m[i][i]);
}

/** y = m·x + q, least squares. Null under two points or with every x the same. */
export function lineFit(x: number[], y: number[]): [number, number] | null {
  const n = x.length;
  if (n < 2) return null;
  const mx = x.reduce((t, v) => t + v, 0) / n, my = y.reduce((t, v) => t + v, 0) / n;
  const sxx = x.reduce((t, v) => t + (v - mx) ** 2, 0);
  if (sxx < 1e-9) return null;
  const m = x.reduce((t, v, i) => t + (v - mx) * (y[i] - my), 0) / sxx;
  return [m, my - m * mx];
}

/** A line through the most points (RANSAC, the same tries every time), refitted on them; null if under a quarter agree. */
export function ransacLine(x: number[], y: number[], tol: number, tries = 150): [number, number] | null {
  const n = x.length;
  if (n < 4) return null;
  // mulberry32, seeded the same each call
  let seed = 12345;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let best: boolean[] | null = null, bestN = 0;
  for (let t = 0; t < tries; t++) {
    const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n);
    if (i === j || x[i] === x[j]) continue;
    const m = (y[j] - y[i]) / (x[j] - x[i]), q = y[i] - m * x[i];
    const inl = x.map((xv, k) => Math.abs(y[k] - (m * xv + q)) < tol);
    const c = inl.filter(Boolean).length;
    if (c > bestN) { best = inl; bestN = c; }
  }
  if (!best || bestN < Math.max(4, 0.25 * n)) return null;
  return lineFit(x.filter((_, k) => best![k]), y.filter((_, k) => best![k]));
}

/** The strongest peak of `prof` within `half` of `at`, if it stands well clear of the rest there. */
export function peakNear(prof: ArrayLike<number>, at: number, half: number): number | null {
  const a = Math.max(0, Math.floor(at - half)), b = Math.min(prof.length, Math.ceil(at + half));
  if (b - a < 3) return null;
  const seg = Array.from({ length: b - a }, (_, i) => prof[a + i]);
  let j = 0;
  for (let i = 1; i < seg.length; i++) if (seg[i] > seg[j]) j = i;
  const med = [...seg].sort((p, q) => p - q)[Math.floor(seg.length / 2)];
  return seg[j] > 3 && seg[j] > 2.5 * (med + 0.5) ? a + j : null;
}

/** The neck's axis from the board markers seen: where it runs, how mm along the board fall on it, and the markers on it. */
export interface Axis {
  /** a point on the axis (the markers' mean centre), its direction toward the body, and across it */
  mu: Pt; d: Pt; n: Pt;
  /** board mm → s along `d` from `mu` */
  pm: Proj;
  /** px across per px along at the same place (the board is seen at a slant), from the markers' printed size */
  ratio: number;
  /** each marker seen: its id, mm from the nut to its centre, s of its centre, how far across it is from the axis, half its
   * size in px along, its printed size */
  marks: { id: number; x: number; s: number; off: number; half: number; mm: number }[];
}
export function axisOf(seen: Seen[], board: BoardMarker[]): Axis | null {
  const on = seen.flatMap((m) => { const b = board.find((q) => q.id === m.id); return b ? [{ m, b, c: centre(m.corners) }] : []; });
  if (on.length < 2) return null;
  on.sort((p, q) => p.b.fret - q.b.fret);
  if (on[0].b.fret === on.at(-1)!.b.fret) return null;
  // the line through the centres, pointed from the low fret to the high one
  const { mu, d: d0 } = lineThrough(on.map((o) => o.c));
  let d = d0;
  const span = { x: on.at(-1)!.c.x - on[0].c.x, y: on.at(-1)!.c.y - on[0].c.y };
  if (d.x * span.x + d.y * span.y < 0) d = { x: -d.x, y: -d.y };
  const n = { x: -d.y, y: d.x };
  const along = (p: Pt) => (p.x - mu.x) * d.x + (p.y - mu.y) * d.y, acrossOf = (p: Pt) => (p.x - mu.x) * n.x + (p.y - mu.y) * n.y;
  const xs = on.map((o) => (wireMm(o.b.fret - 1) + wireMm(o.b.fret)) / 2), ss = on.map((o) => along(o.c));
  const pm = projFit(xs, ss);
  if (!pm) return null;
  const pxAlong = (x: number) => Math.abs(proj(pm, x + 0.5) - proj(pm, x - 0.5));
  // a marker's size across and along: the mean of its two edges running that way (a corner-to-corner spread would make a
  // marker stuck a little turned look bigger)
  const sideAlong = (c: Pt[], v: Pt) => {
    const e = c.map((p, i) => { const q = c[(i + 1) % 4]; return Math.abs((q.x - p.x) * v.x + (q.y - p.y) * v.y); }).sort((p, q) => q - p);
    return (e[0] + e[1]) / 2;
  };
  const ratios = on.map((o, i) => sideAlong(o.m.corners, n) / o.b.mm / pxAlong(xs[i])).sort((p, q) => p - q);
  const marks = on.map((o, i) => ({ id: o.m.id, x: xs[i], s: ss[i], off: acrossOf(o.c), half: sideAlong(o.m.corners, d) / 2, mm: o.b.mm }));
  // markers not on the board's edge (one on the body, level with a fret) sit off the line the others make: of the lines
  // through each pair, keep the markers within their own size of the one most of them sit on, and read again with those
  if (on.length >= 3) {
    let keep: Set<number> | null = null, keepErr = Infinity;
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
      const l = lineThrough([on[i].c, on[j].c]), ids = new Set<number>();
      let err = 0;
      for (const o of on) {
        const far = Math.abs((o.c.x - l.mu.x) * -l.d.y + (o.c.y - l.mu.y) * l.d.x) / sideAlong(o.m.corners, l.d);
        if (far <= 1) { ids.add(o.m.id); err += far; }
      }
      if (!keep || ids.size > keep.size || (ids.size === keep.size && err < keepErr)) { keep = ids; keepErr = err; }
    }
    if (keep && keep.size >= 2 && keep.size < on.length) return axisOf(seen.filter((m) => keep!.has(m.id)), board);
  }
  return { mu, d, n, pm, ratio: ratios[Math.floor(ratios.length / 2)], marks };
}
/** The line through points: their mean and main direction (2×2 covariance). */
function lineThrough(pts: Pt[]): { mu: Pt; d: Pt } {
  const mu = { x: pts.reduce((t, p) => t + p.x, 0) / pts.length, y: pts.reduce((t, p) => t + p.y, 0) / pts.length };
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) { const dx = p.x - mu.x, dy = p.y - mu.y; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { mu, d: { x: Math.cos(th), y: Math.sin(th) } };
}
const centre = (c: Pt[]) => ({ x: c.reduce((t, p) => t + p.x, 0) / c.length, y: c.reduce((t, p) => t + p.y, 0) / c.length });

/** The strip for an axis: it starts `start` along the axis (60 px before the nut or fret 22), `len` long, 2 × STRIP_HALF high. */
export interface Strip { start: number; len: number; /** strip (col, row) → frame: [a, b, c, d, e, f], x = a·col + b·row + c */ toFrame: number[] }
export function stripOf(ax: Axis): Strip | null {
  const s0 = proj(ax.pm, 0), s1 = proj(ax.pm, wireMm(TOP_WIRE));
  const start = Math.min(s0, s1) - 60, len = Math.round(Math.abs(s1 - s0) + 120);
  if (!Number.isFinite(len) || len < 50 || len > 4000) return null;
  const o = { x: ax.mu.x + start * ax.d.x - STRIP_HALF * ax.n.x, y: ax.mu.y + start * ax.d.y - STRIP_HALF * ax.n.y };
  return { start, len, toFrame: [ax.d.x, ax.n.x, o.x, ax.d.y, ax.n.y, o.y] };
}
export const toFrame = (st: Strip, p: Pt): Pt => ({ x: st.toFrame[0] * p.x + st.toFrame[1] * p.y + st.toFrame[2], y: st.toFrame[3] * p.x + st.toFrame[4] * p.y + st.toFrame[5] });

/** Kept from the last frame read, for when this one doesn't find an edge or the lean. */
export interface Carry { top?: [number, number]; bottom?: [number, number]; lean?: [number, number]; strings?: [number, number][] }
/** Each wire, nut (0) to 22, where it meets the board's two edges, in the strip. */
export type Wires = { top: Pt; bottom: Pt }[];

/**
 * The frets from a strip: `gray` its pixels (`len` × 2·STRIP_HALF, a row at a time) and `gy` the up-down edge strength there
 * (blurred, zero off the frame). `carry` is updated in place. Null when the board's edges aren't found.
 */
export function readStrip(ax: Axis, st: Strip, gray: ArrayLike<number>, gy: ArrayLike<number>, carry: Carry): Wires | null {
  const W = st.len, H = 2 * STRIP_HALF, col = (s: number) => s - st.start;
  const pxAlong = (x: number) => Math.abs(proj(ax.pm, x + 0.5) - proj(ax.pm, x - 0.5));
  const mmAt = (c: number) => Math.min(wireMm(TOP_WIRE), Math.max(0, projInv(ax.pm, c + st.start)));
  const ycen = STRIP_HALF + median(ax.marks.map((m) => m.off));
  const mhalf = Math.max(...ax.marks.map((m) => m.mm)) / 2;
  const nearMark = (c: number) => ax.marks.some((m) => Math.abs(c - col(m.s)) < m.half + 6);
  const c0 = Math.max(0, Math.floor(col(Math.min(proj(ax.pm, 0), proj(ax.pm, wireMm(TOP_WIRE)))))), c1 = Math.min(W - 8, Math.ceil(col(Math.max(proj(ax.pm, 0), proj(ax.pm, wireMm(TOP_WIRE))))));
  // the strongest edge over rows a..b, averaged over 8 columns from c
  const edgeIn = (c: number, a: number, b: number) => {
    a = Math.max(0, Math.floor(a)); b = Math.min(H, Math.floor(b));
    if (b - a < 3) return null;
    let best = -1, at = a;
    for (let r = a; r < b; r++) {
      let t = 0;
      for (let k = 0; k < 8; k++) t += Math.abs(gy[r * W + c + k]);
      if (t > best) { best = t; at = r; }
    }
    return at;
  };

  // the top edge: within 25 mm beyond the markers' far side (from 1 mm out, past the black square's own edge)
  const tx: number[] = [], ty: number[] = [];
  for (let c = c0; c < c1; c += 8) {
    if (nearMark(c)) continue;
    const mpx = ax.ratio * pxAlong(mmAt(c + 4)), hi = ycen - (mhalf + 1) * mpx;
    const r = edgeIn(c, hi - 25 * mpx, hi);
    if (r !== null) { tx.push(c + 4); ty.push(r); }
  }
  const top = ransacLine(tx, ty, 3) ?? carry.top;
  if (!top) return null;
  const yTop = (c: number) => top[0] * c + top[1];
  // the bottom edge: where the board's width puts it, give or take 15%
  const bx: number[] = [], by: number[] = [];
  for (let c = c0; c < c1; c += 8) {
    if (nearMark(c)) continue;
    const mm = mmAt(c + 4), fret = -12 * Math.log2(1 - mm / SCALE_MM);
    const want = yTop(c + 4) + neckWidthMm(fret) * ax.ratio * pxAlong(mm), wpx = want - yTop(c + 4);
    const r = edgeIn(c, Math.max(want - 0.15 * wpx, ycen + 4), want + 0.15 * wpx);
    if (r !== null) { bx.push(c + 4); by.push(r); }
  }
  const bottom = ransacLine(bx, by, 3) ?? carry.bottom;
  if (!bottom) return null;
  const yBot = (c: number) => bottom[0] * c + bottom[1];
  carry.top = top; carry.bottom = bottom;

  // wires: bright thin uprights; a profile per column, the median down a band of rows between the edges
  const ridge = (r: number, c: number) => {
    const v = gray[r * W + c] - 0.5 * (gray[r * W + Math.max(0, c - 3)] + gray[r * W + Math.min(W - 1, c + 3)]);
    return v > 0 ? v : 0;
  };
  const profile = (lo: number, hi: number) => {
    const out = new Float32Array(W), vals = new Array<number>(7);
    for (let c = 0; c < W; c++) {
      const yt = yTop(c), yb = yBot(c);
      for (let i = 0; i < 7; i++) {
        const r = Math.round(yt + (lo + ((hi - lo) * i) / 6) * (yb - yt));
        vals[i] = r >= 0 && r < H ? ridge(r, c) : 0;
      }
      out[c] = median(vals);
    }
    return out;
  };
  const full = profile(0.12, 0.88), upper = profile(0.08, 0.38), lower = profile(0.62, 0.92);
  const frets = Array.from({ length: TOP_WIRE + 1 }, (_, f) => f), mm = frets.map(wireMm);
  const markX = ax.marks.map((m) => m.x), markS = ax.marks.map((m) => m.s);
  let p = ax.pm;
  for (let pass = 0; pass < 3; pass++) {
    const obs: { x: number; s: number }[] = [];
    for (const f of frets.slice(1)) {
      const half = Math.max(2, 0.3 * Math.abs(proj(p, mm[f]) - proj(p, mm[f - 1])));
      const k = peakNear(full, col(proj(p, mm[f])), half);
      if (k !== null) obs.push({ x: mm[f], s: k + st.start });
    }
    if (obs.length < 4) break;
    let q = projFit([...obs.map((o) => o.x), ...markX], [...obs.map((o) => o.s), ...markS]);
    if (!q) break;
    const kept = obs.filter((o) => Math.abs(proj(q!, o.x) - o.s) < 3);
    if (kept.length >= 4) q = projFit([...kept.map((o) => o.x), ...markX], [...kept.map((o) => o.s), ...markS]) ?? q;
    p = q;
  }
  const cols = mm.map((x) => col(proj(p, x)));

  // lean: columns moved per row, from where each wire is in the upper and lower bands; a line along the neck
  const lc: number[] = [], lv: number[] = [];
  for (const f of frets.slice(1)) {
    const half = Math.max(2, 0.2 * Math.abs(cols[f] - cols[f - 1]));
    const a = peakNear(upper, cols[f], half), b = peakNear(lower, cols[f], half);
    if (a !== null && b !== null) { lc.push(cols[f]); lv.push((b - a) / Math.max(0.54 * (yBot(cols[f]) - yTop(cols[f])), 1)); }
  }
  const lean = ransacLine(lc, lv, 0.05) ?? carry.lean ?? [0, 0];
  carry.lean = lean;

  // each wire: through its column halfway across with that lean, cut by the two edges
  return cols.map((c) => {
    const k = lean[0] * c + lean[1], ymid = (yTop(c) + yBot(c)) / 2;
    const meet = ([m, q]: [number, number]): Pt => { const y = (m * (c - k * ymid) + q) / (1 - m * k); return { x: c + k * (y - ymid), y }; };
    return { top: meet(top), bottom: meet(bottom) };
  });
}

/** Where the six strings sit across the board, edge to edge (7.5% in from each edge, evenly between). */
export const STRING_AT = Array.from({ length: 6 }, (_, i) => 0.075 + (i * 0.85) / 5);

/**
 * The six strings in a strip read by `readStrip` (its edges are in `carry`): rows down the board where a thin line runs along
 * it (a ridge up-down in `gray`), looked for in windows of columns near where each string sits on a real board. Each string is
 * then a fraction of the way across the board, fitted along the neck through most of what was found and kept within 5% of
 * where a string sits (so a hand or a marker can't pull it across the board); one not found keeps last frame's place, else
 * where it should be. In strip order (row by row), as `row = m·col + q`.
 */
export function stringsOf(st: Strip, gray: ArrayLike<number>, wires: Wires, carry: Carry, skip: (col: number) => boolean = () => false): [number, number][] {
  const W = st.len, H = 2 * STRIP_HALF, top = carry.top, bottom = carry.bottom;
  if (!top || !bottom) return [];
  const yTop = (c: number) => top[0] * c + top[1], yBot = (c: number) => bottom[0] * c + bottom[1];
  const ends = [wires[0].top.x, wires[wires.length - 1].top.x].sort((a, b) => a - b);
  const xs: number[][] = STRING_AT.map(() => []), fs: number[][] = STRING_AT.map(() => []);
  const SPAN = 12;
  for (let c = Math.max(2, Math.floor(ends[0]) + 4); c < Math.min(W - SPAN - 2, ends[1] - SPAN); c += SPAN) {
    const mid = c + SPAN / 2;
    if (skip(mid)) continue;
    const yt = Math.max(2, Math.floor(yTop(mid))), yb = Math.min(H - 3, Math.ceil(yBot(mid)));
    if (yb - yt < 12) continue;
    const prof = new Float32Array(yb - yt + 1);
    for (let r = yt; r <= yb; r++) {
      let t = 0;
      for (let k = 0; k < SPAN; k++) { const i = c + k; t += Math.abs(gray[r * W + i] - 0.5 * (gray[(r - 2) * W + i] + gray[(r + 2) * W + i])); }
      prof[r - yt] = t / SPAN;
    }
    const span = yBot(mid) - yTop(mid), half = ((span * 0.85) / 5) * 0.3;
    STRING_AT.forEach((f, si) => {
      const at = yTop(mid) + f * span - yt;
      const a = Math.max(0, Math.floor(at - half)), b = Math.min(prof.length, Math.ceil(at + half));
      if (b - a < 3) return;
      let j = a, mean = 0;
      for (let r = a; r < b; r++) { if (prof[r] > prof[j]) j = r; mean += prof[r]; }
      mean /= b - a;
      if (prof[j] > 2 && prof[j] > 1.6 * mean) { xs[si].push(mid); fs[si].push((yt + j - yTop(mid)) / span); }
    });
  }
  // each string as a fraction across the board at the two ends of the neck, then the line through those two places
  const lines = STRING_AT.map((f0, si): [number, number] => {
    const fit = ransacLine(xs[si], fs[si], 0.03);
    const frac = (c: number) => Math.min(f0 + 0.05, Math.max(f0 - 0.05, fit ? fit[0] * c + fit[1] : f0));
    if (!fit && carry.strings?.[si]) return carry.strings[si];
    const row = (c: number) => yTop(c) + frac(c) * (yBot(c) - yTop(c));
    const m = (row(ends[1]) - row(ends[0])) / (ends[1] - ends[0] || 1);
    return [m, row(ends[0]) - m * ends[0]];
  });
  carry.strings = lines;
  return lines;
}

/** The neck in the frame: each wire across the board (nut first) and each string from the nut to wire 22, low E first. */
export interface Neck { wires: { top: Pt; bottom: Pt }[]; strings: { a: Pt; b: Pt }[] }

/** Where lines p1–p2 and p3–p4 cross; null when they run side by side. */
export function meet(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;
  const a = p1.x * p2.y - p1.y * p2.x, b = p3.x * p4.y - p3.y * p4.x;
  return { x: (a * (p3.x - p4.x) - (p1.x - p2.x) * b) / d, y: (a * (p3.y - p4.y) - (p1.y - p2.y) * b) / d };
}
/** Where string `s` crosses wire `f`. */
export const onWire = (n: Neck, s: number, f: number): Pt =>
  meet(n.strings[s].a, n.strings[s].b, n.wires[f].top, n.wires[f].bottom) ?? n.strings[s].a;
/** The middle of fret space `f` on string `s` (fret 0: on the nut). */
export const spotOf = (n: Neck, s: number, f: number): Pt => {
  if (f <= 0) return onWire(n, s, 0);
  const a = onWire(n, s, f - 1), b = onWire(n, s, f);
  // a finger sits nearer the wire than the middle of the space
  return { x: a.x + (b.x - a.x) * 0.6, y: a.y + (b.y - a.y) * 0.6 };
};
const side = (a: Pt, b: Pt, p: Pt) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
const distTo = (a: Pt, b: Pt, p: Pt) => Math.abs(side(a, b, p)) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);

/** The fret space (1 to 22) and string (0 low E to 5) a point is over, or null off the board. */
export function placeOnNeck(n: Neck, p: Pt): { fret: number; string: number } | null {
  const w = n.wires, sgn = (f: number) => Math.sign(side(w[f].top, w[f].bottom, p));
  let fret = 0;
  for (let f = 1; f < w.length; f++) if (sgn(f - 1) !== sgn(f) && sgn(f) !== 0) { fret = f; break; }
  if (!fret) return null;
  const d = n.strings.map((s) => distTo(s.a, s.b, p));
  let string = 0;
  for (let i = 1; i < d.length; i++) if (d[i] < d[string]) string = i;
  // off the board: outside the outer strings by more than most of a string's gap
  const s0 = n.strings[0], s5 = n.strings[5];
  if (Math.sign(side(s0.a, s0.b, p)) === Math.sign(side(s5.a, s5.b, p))) {
    const gap = distTo(s0.a, s0.b, onWire(n, 1, Math.max(1, fret - 1)));
    if (Math.min(d[0], d[5]) > 0.8 * gap) return null;
  }
  return { fret, string };
}

/** The note a place sounds (standard tuning). */
export const midiAt = (string: number, fret: number) => OPEN_MIDI[string] + fret;

/**
 * Where a heard pitch was most likely played: a finger on a place that sounds it; else the place that sounds it nearest the
 * fingers (an open string only when no finger is near a fretted one). Null when the guitar can't play it.
 */
export function guessPlace(midi: number, fingers: { fret: number; string: number }[]): { string: number; fret: number } | null {
  const under = fingers.filter((f) => midiAt(f.string, f.fret) === midi).sort((a, b) => b.fret - a.fret);
  if (under.length) return { string: under[0].string, fret: under[0].fret };
  const places = OPEN_MIDI.map((open, string) => ({ string, fret: midi - open })).filter((p) => p.fret >= 0 && p.fret <= TOP_WIRE);
  if (!places.length) return null;
  if (!fingers.length) return places.find((p) => p.fret === 0) ?? places.sort((a, b) => a.fret - b.fret)[0];
  const far = (p: { fret: number }) => Math.min(...fingers.map((f) => Math.abs(f.fret - p.fret)));
  const fretted = places.filter((p) => p.fret > 0).sort((a, b) => far(a) - far(b))[0];
  const open = places.find((p) => p.fret === 0);
  return open && (!fretted || far(fretted) > 2) ? open : fretted ?? open ?? null;
}

function median(v: number[]): number {
  const s = [...v].sort((p, q) => p - q);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}
