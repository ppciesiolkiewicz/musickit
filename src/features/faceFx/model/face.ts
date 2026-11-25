/** A point in video pixels. */
export interface Pt { x: number; y: number }

/**
 * The face effects' maths (pure; NeckView draws). A face is MediaPipe Face Landmarker's 478 points in video pixels. The
 * effects work in the face's own frame, turned upright: `u` runs from the right eye's outer corner to the left's (across the
 * picture, left to right), `v` down the face, the origin between the eyes. In that frame Slim face moves each row of the
 * picture in toward the middle, most at the jaw, while the crop's outer edges stay where they are.
 */

/** Rings of landmark indices, each in order round its shape (the face mesh's well-known contours). */
export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
export const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
export const LEFT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
export const RIGHT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const LEFT_BROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
export const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
/** The parts Smooth skin leaves sharp. */
export const KEEP_SHARP = [RIGHT_EYE, LEFT_EYE, RIGHT_BROW, LEFT_BROW, LIPS];
const OUTER_RIGHT = 33, OUTER_LEFT = 263;

export interface FaceFrame {
  /** between the eyes, in video px */
  c: Pt;
  /** across the face (unit) and down it (unit) */
  u: Pt;
  v: Pt;
  /** the face's half width, and how far above and below `c` the oval reaches, along `v` (px) */
  halfW: number;
  top: number;
  bottom: number;
}

const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;

/** A face's upright frame, from its landmarks. Null when there are too few points or the eyes sit on one spot. */
export function faceFrame(lm: Pt[]): FaceFrame | null {
  if (lm.length < 468) return null;
  const r = lm[OUTER_RIGHT], l = lm[OUTER_LEFT];
  const len = Math.hypot(l.x - r.x, l.y - r.y);
  if (len < 1) return null;
  const u = { x: (l.x - r.x) / len, y: (l.y - r.y) / len }, v = { x: -u.y, y: u.x };
  const c = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  let halfW = 0, top = 0, bottom = 0;
  for (const i of FACE_OVAL) {
    const d = { x: lm[i].x - c.x, y: lm[i].y - c.y };
    halfW = Math.max(halfW, Math.abs(dot(d, u)));
    top = Math.min(top, dot(d, v)); bottom = Math.max(bottom, dot(d, v));
  }
  return { c, u, v, halfW, top, bottom };
}

/** A point in the face's frame (`a` across, `b` down from between the eyes). */
export const toFace = (f: FaceFrame, p: Pt): Pt => { const d = { x: p.x - f.c.x, y: p.y - f.c.y }; return { x: dot(d, f.u), y: dot(d, f.v) }; };

/**
 * Landmarks eased toward the new ones, so the effects don't shimmer with the detector. A face that jumped (moved more than
 * half its width, or a new one) is taken as it is.
 */
export function easeFace(prev: Pt[] | null, next: Pt[], k = 0.5): Pt[] {
  if (!prev || prev.length !== next.length) return next;
  const a = prev[OUTER_RIGHT], b = next[OUTER_RIGHT];
  const width = Math.hypot(next[OUTER_LEFT].x - b.x, next[OUTER_LEFT].y - b.y);
  if (Math.hypot(a.x - b.x, a.y - b.y) > width / 2) return next;
  return next.map((p, i) => ({ x: prev[i].x + (p.x - prev[i].x) * k, y: prev[i].y + (p.y - prev[i].y) * k }));
}

/** At Slim face 100%, how far each cheek moves in at the jaw, as a share of the face's half width. */
export const SLIM = 0.06;
/** How far the crop reaches past the face on each side, as a share of the half width: Slim face stretches this margin. */
export const MARGIN = 0.6;

/** How far in a row of the face moves (px) at `b` below between the eyes: none at the eyes and below the chin, most at the jaw. */
export function slimAt(f: FaceFrame, b: number, strength: number): number {
  const t = b / f.bottom;
  if (!(t > 0 && t < 1.15)) return 0;
  const bump = Math.sin((Math.PI * t) / 1.15) ** 2;
  return f.halfW * SLIM * strength * bump;
}

/**
 * One row's warp: pieces of the source row (`from`, in `a` across the face) and where each lands (`to`). The crop's edges
 * (±`reach`) stay, the face's edges (±`halfW`) move in by `d`, the middle stays.
 */
export function slimRow(reach: number, halfW: number, d: number): { from: [number, number]; to: [number, number] }[] {
  return [
    { from: [-reach, -halfW], to: [-reach, -halfW + d] },
    { from: [-halfW, 0], to: [-halfW + d, 0] },
    { from: [0, halfW], to: [0, halfW - d] },
    { from: [halfW, reach], to: [halfW - d, reach] },
  ];
}

/** Where a point at `a` across the face lands after its row moved in by `d` (the same pieces as `slimRow`). */
export function slimX(a: number, reach: number, halfW: number, d: number): number {
  for (const { from, to } of slimRow(reach, halfW, d)) {
    if (a >= from[0] && a <= from[1]) return to[0] + ((a - from[0]) * (to[1] - to[0])) / (from[1] - from[0]);
  }
  return a;
}
