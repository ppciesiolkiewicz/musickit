import { placesOf } from "./riff";

/**
 * From the neck markers and the fretting hand to a string and fret.
 *
 * The markers sit off the fretboard, each lined up with a fret wire (`id@fret`, set on the page). Their centres give the neck's
 * axis; a point's place along that axis, fitted against how far each marker's fret is from the nut on a real scale, gives its
 * fret (frets get closer up the neck: fret f is L·(1 − 2^(−f/12)) from the nut). Straight-line fit, no perspective: fine while
 * the camera looks at the neck from the front.
 *
 * Only the fret is read from the picture. The string comes from the pitch: one pitch sits on up to six strings, each at a
 * different fret, so the fret the hand is at picks the string.
 */

export type Pt = { x: number; y: number };
/** `mm`: the marker's side, when its edge (not its centre) is at the wire: then its centre is half of that beyond it. */
export interface Placed { id: number; fret: number; mm?: number }
export interface Grid { origin: Pt; dir: Pt; a: number; b: number }

const distOf = (fret: number) => 1 - 2 ** (-fret / 12); // nut to fret, in scale lengths
const SCALE_MM = 648; // 25.5" (Stratocaster, Telecaster)
/** Nut to the marker's centre, in scale lengths. With a size, the marker sits past its wire: on the headstock at fret 0, toward the body at any other fret. */
const placeOf = (p: Placed) => distOf(p.fret) + (p.mm ? (p.fret === 0 ? -1 : 1) * p.mm / 2 / SCALE_MM : 0);
const fretOf = (d: number) => (d >= 1 ? 24 : -12 * Math.log2(1 - d));

/** "0@0/25, 1@17" → a 25 mm marker 0 touching the nut on the headstock, marker 1's centre at fret 17. Unreadable parts are skipped. */
export function parsePlaced(text: string): Placed[] {
  return text.split(/[,\s]+/).flatMap((p) => {
    const m = /^(\d+)@(\d+)(?:\/(\d+(?:\.\d+)?))?$/.exec(p.trim());
    return m ? [{ id: Number(m[1]), fret: Number(m[2]), ...(m[3] ? { mm: Number(m[3]) } : {}) }] : [];
  });
}

/** The grid from the markers seen (centres, in frame units), or null under two placed markers at different frets. */
export function gridOf(seen: { id: number; c: Pt }[], placed: Placed[]): Grid | null {
  const pts = seen.flatMap((s) => { const p = placed.find((q) => q.id === s.id); return p ? [{ c: s.c, d: placeOf(p) }] : []; });
  if (pts.length < 2) return null;
  pts.sort((p, q) => p.d - q.d);
  const lo = pts[0], hi = pts.at(-1)!;
  if (hi.d - lo.d < 1e-6) return null;
  const dx = hi.c.x - lo.c.x, dy = hi.c.y - lo.c.y, len = Math.hypot(dx, dy) || 1;
  const origin = lo.c, dir = { x: dx / len, y: dy / len };
  // d = a·s + b, least squares over the markers (exact with two)
  const s = pts.map((p) => (p.c.x - origin.x) * dir.x + (p.c.y - origin.y) * dir.y);
  const n = pts.length, ms = s.reduce((t, v) => t + v, 0) / n, md = pts.reduce((t, p) => t + p.d, 0) / n;
  const sxx = s.reduce((t, v) => t + (v - ms) ** 2, 0);
  if (sxx < 1e-9) return null;
  const a = s.reduce((t, v, i) => t + (v - ms) * (pts[i].d - md), 0) / sxx;
  return { origin, dir, a, b: md - a * ms };
}

/** The fret a point is at (fractional: 4.5 is halfway between wires 4 and 5). */
export function fretAt(g: Grid, p: Pt): number {
  const s = (p.x - g.origin.x) * g.dir.x + (p.y - g.origin.y) * g.dir.y;
  return fretOf(g.a * s + g.b);
}

/**
 * Where `midi` was played, given the frets of the fretting hand's fingertips: the place whose fret has a fingertip just behind
 * its wire (half a fret back); an open string when no fingertip is within two frets of a fretted place. Null when the pitch
 * can't be played. `off` is how far the nearest fingertip was, in frets.
 */
export function placeByHand(midi: number, tips: number[]): { string: number; fret: number; off: number } | null {
  const opts = placesOf(midi);
  if (!opts.length) return null;
  let best: { string: number; fret: number; off: number } | null = null;
  for (const o of opts) {
    if (o.fret === 0) continue;
    const off = Math.min(...tips.map((t) => Math.abs(t - (o.fret - 0.5))));
    if (!best || off < best.off) best = { ...o, off };
  }
  const open = opts.find((o) => o.fret === 0);
  if (open && (!best || best.off > 2)) return { ...open, off: 0 };
  return best;
}
