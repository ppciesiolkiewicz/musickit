/**
 * The face camera's circle: a second camera on the face, cropped round the face it finds and drawn as a circle in a corner
 * of the guitar camera's picture, so the take records both. Pure: the client (`client/faceCam.ts`) finds the face and draws.
 */

export const FACE_CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
export type FaceCorner = (typeof FACE_CORNERS)[number];
export const FACE_SIZES = ["small", "medium", "large"] as const;
export type FaceSize = (typeof FACE_SIZES)[number];
export interface FaceLook { corner: FaceCorner; size: FaceSize }
export const DEFAULT_FACE_LOOK: FaceLook = { corner: "bottom-left", size: "medium" };

/** the circle's diameter, as a share of the picture's height */
const DIAMETER: Record<FaceSize, number> = { small: 0.24, medium: 0.32, large: 0.42 };
/** the gap between the circle and the picture's edges, as a share of its height */
const GAP = 0.03;
/** how much more than the face the crop takes: the face's box times this, so the hair and chin show */
export const FACE_ZOOM = 1.9;

/** A rectangle in pixels. */
export interface Rect { x: number; y: number; w: number; h: number }
/** A square crop of the face camera's picture, in its pixels. */
export interface Crop { x: number; y: number; side: number }

/** Where the circle goes on a picture `w` × `h`: its centre and radius in pixels. */
export function circleAt(look: FaceLook, w: number, h: number): { cx: number; cy: number; r: number } {
  const r = (DIAMETER[look.size] * h) / 2;
  const gap = GAP * h;
  const left = look.corner.endsWith("left");
  const top = look.corner.startsWith("top");
  return { cx: left ? gap + r : w - gap - r, cy: top ? gap + r : h - gap - r, r };
}

/**
 * The square to cut out of a picture `w` × `h` for `face` (the face's box, or null when none is found): centred on the
 * face, `FACE_ZOOM` times its larger side, kept inside the picture. With no face, the middle of the picture.
 */
export function cropFor(face: Rect | null, w: number, h: number): Crop {
  const most = Math.min(w, h);
  if (!face || face.w <= 0 || face.h <= 0) return { x: (w - most) / 2, y: (h - most) / 2, side: most };
  const side = Math.min(most, Math.max(face.w, face.h) * FACE_ZOOM);
  const cx = face.x + face.w / 2;
  const cy = face.y + face.h / 2;
  return { x: clamp(cx - side / 2, 0, w - side), y: clamp(cy - side / 2, 0, h - side), side };
}

/**
 * `from` moved toward `to`: a share `k` (0 to 1) of the way for its place, `kSide` for its size (by default the same), so
 * the crop can follow the face's moves and still zoom slowly.
 */
export function ease(from: Crop, to: Crop, k: number, kSide = k): Crop {
  const m = (a: number, b: number, t: number) => a + (b - a) * t;
  return { x: m(from.x, to.x, k), y: m(from.y, to.y, k), side: m(from.side, to.side, kSide) };
}

/** The zoom holds until the face's size is this share off it (leaning in or back), so a detector's jitter never zooms. */
export const ZOOM_HOLD = 0.2;
/** The crop holds its place until the face's centre is this share of the crop's side off its centre. */
export const MOVE_HOLD = 0.08;

/**
 * Where the crop should head from `held` (the target it is heading to now) for a new `goal` (`cropFor` the face just
 * found): its size held unless the goal is `ZOOM_HOLD` bigger or smaller, its place held unless the face moved
 * `MOVE_HOLD` of the side; either way the same centre-and-clamp as `cropFor`, inside the picture `w` × `h`.
 */
export function steady(held: Crop | null, goal: Crop, w: number, h: number): Crop {
  if (!held) return goal;
  const side = Math.abs(goal.side / held.side - 1) > ZOOM_HOLD ? goal.side : Math.min(held.side, Math.min(w, h));
  const hx = held.x + held.side / 2, hy = held.y + held.side / 2;
  const gx = goal.x + goal.side / 2, gy = goal.y + goal.side / 2;
  const moved = Math.hypot(gx - hx, gy - hy) > MOVE_HOLD * held.side;
  const cx = moved ? gx : hx, cy = moved ? gy : hy;
  return { x: clamp(cx - side / 2, 0, w - side), y: clamp(cy - side / 2, 0, h - side), side };
}

/** The middle value of `v` (the larger of the two middles for an even count); 0 for none. */
export function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const oneOf = <T extends string>(list: readonly T[], x: unknown, or: T): T => (list.includes(x as T) ? (x as T) : or);

/** `x` as a face look (kept in this browser), each part that doesn't read the default. */
export function readFaceLook(x: unknown): FaceLook {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return { corner: oneOf(FACE_CORNERS, o.corner, DEFAULT_FACE_LOOK.corner), size: oneOf(FACE_SIZES, o.size, DEFAULT_FACE_LOOK.size) };
}
