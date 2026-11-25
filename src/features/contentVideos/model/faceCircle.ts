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

/** `from` moved a share `k` (0 to 1) of the way to `to`: the crop follows the face without shaking. */
export function ease(from: Crop, to: Crop, k: number): Crop {
  const m = (a: number, b: number) => a + (b - a) * k;
  return { x: m(from.x, to.x), y: m(from.y, to.y), side: m(from.side, to.side) };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const oneOf = <T extends string>(list: readonly T[], x: unknown, or: T): T => (list.includes(x as T) ? (x as T) : or);

/** `x` as a face look (kept in this browser), each part that doesn't read the default. */
export function readFaceLook(x: unknown): FaceLook {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return { corner: oneOf(FACE_CORNERS, o.corner, DEFAULT_FACE_LOOK.corner), size: oneOf(FACE_SIZES, o.size, DEFAULT_FACE_LOOK.size) };
}
