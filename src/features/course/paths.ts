/** A note on the neck a path passes through. string 0 = low E. */
export interface PathPoint { string: number; fret: number }
/** Static arrows from note to note, in order: two points draw one arrow, more draw a chain. */
export interface NeckPath { points: PathPoint[]; colour: string }

/** The drawn part of one arrow: centre a to centre b, pulled back by `gap` at both ends so it doesn't run under the dots. */
export function segment(a: { x: number; y: number }, b: { x: number; y: number }, gap: number): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= gap * 2) return null;
  const ux = dx / len, uy = dy / len;
  return { x1: a.x + ux * gap, y1: a.y + uy * gap, x2: b.x - ux * gap, y2: b.y - uy * gap };
}
