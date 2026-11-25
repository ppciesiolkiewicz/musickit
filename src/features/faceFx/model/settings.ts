/** The face effects and their settings. Pure: `ui/FaceView.tsx` draws, `ui/FaceControls.tsx` keeps them. */

export const FACE_EFFECTS = ["smooth", "light", "eyes", "slim"] as const;
export type FaceEffect = (typeof FACE_EFFECTS)[number];
export const FACE_WORDS: Record<FaceEffect, string> = {
  smooth: "Smooth skin",
  light: "Face light",
  eyes: "Bright eyes",
  slim: "Slim face",
};
export const FACE_HINTS: Record<FaceEffect, string> = {
  smooth: "Softens the skin. Eyes, brows and lips stay sharp.",
  light: "A soft, warm light on the face.",
  eyes: "Lifts the eyes a little.",
  slim: "Narrows the cheeks and jaw a little.",
};
/** Strength runs from 0 (off) to 2 (double); 1 is the usual look. */
export const STRENGTH_MAX = 2;

export interface FaceSettings {
  /** the effects ticked; none: nothing runs and the face model isn't fetched */
  effects: FaceEffect[];
  strength: Record<FaceEffect, number>;
}
export const DEFAULT_FACE: FaceSettings = { effects: [], strength: { smooth: 1, light: 1, eyes: 1, slim: 1 } };

/** Settings read back from storage: anything unreadable falls back to the default. */
export function readFace(v: unknown): FaceSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const s = (o.strength && typeof o.strength === "object" ? o.strength : {}) as Record<string, unknown>;
  const one = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(STRENGTH_MAX, Math.max(0, x)) : d);
  return {
    effects: Array.isArray(o.effects) ? FACE_EFFECTS.filter((e) => (o.effects as unknown[]).includes(e)) : DEFAULT_FACE.effects,
    strength: Object.fromEntries(FACE_EFFECTS.map((e) => [e, one(s[e], DEFAULT_FACE.strength[e])])) as Record<FaceEffect, number>,
  };
}
