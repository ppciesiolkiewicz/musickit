/**
 * The creator's one shared choice: a key (tonic + scale family + mode) that can also be empty.
 * Pure functions on top of the theory feature; no React, no sound. Every plugin reads this and nothing else about "the key".
 */
import { FAMILIES, TONICS, makeKeyContext, shortModeName, type KeyContext, type Tonic } from "@/features/theory";

export interface KeyChoice {
  /** 0..11 (C = 0), or null when no key is chosen: plugins then show their general page */
  tonicPc: number | null;
  family: number;
  mode: number;
}

export const EMPTY_KEY: KeyChoice = { tonicPc: null, family: 0, mode: 0 };

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

/** Read a saved or typed choice; anything invalid falls back piece by piece (a bad mode keeps the tonic). */
export function sanitiseKey(raw: unknown): KeyChoice {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const family = isInt(o.family, 0, FAMILIES.length - 1) ? o.family : 0;
  const mode = isInt(o.mode, 0, FAMILIES[family].names.length - 1) ? o.mode : 0;
  const tonicPc = o.tonicPc === null || o.tonicPc === undefined ? null : isInt(o.tonicPc, 0, 11) ? o.tonicPc : null;
  return { tonicPc, family, mode };
}

/** The theory of the chosen key, or null when there is none. */
export function keyContext(c: KeyChoice): KeyContext | null {
  return c.tonicPc === null ? null : makeKeyContext(c.tonicPc, c.family, c.mode);
}

export const setTonic = (c: KeyChoice, tonicPc: number | null): KeyChoice => ({ ...c, tonicPc });

/** Changing family restarts at the family's first mode. */
export function setMode(c: KeyChoice, family: number, mode: number): KeyChoice {
  return sanitiseKey({ ...c, family, mode });
}

export const modeName = (c: KeyChoice): string => shortModeName(FAMILIES[c.family].names[c.mode]);

export function keyTitle(c: KeyChoice): string {
  const t = c.tonicPc === null ? null : TONICS.find((x) => x.pc === c.tonicPc);
  return t ? `${t.name} ${modeName(c)}` : "No key";
}

/** Query string for sharing: ?key=7&family=0&mode=1 (no key leaves it out). */
export function toQuery(c: KeyChoice): string {
  return c.tonicPc === null ? "" : `?key=${c.tonicPc}&family=${c.family}&mode=${c.mode}`;
}

export function fromQuery(search: string): KeyChoice | null {
  const p = new URLSearchParams(search);
  if (!p.has("key")) return null;
  const k = sanitiseKey({ tonicPc: Number(p.get("key")), family: Number(p.get("family") ?? 0), mode: Number(p.get("mode") ?? 0) });
  return k.tonicPc === null ? null : k;
}

/** Position of a tonic on the circle of fifths: C 0, G 1, D 2 ... F♯ 6 ... D♭ 11. */
export const fifthsPosition = (pc: number): number => (((pc * 7) % 12) + 12) % 12;

/** The twelve tonics in circle-of-fifths order, starting at C. (F♯ and D♭ are the two spellings kept by TONICS.) */
export const CIRCLE: Tonic[] = [...TONICS].sort((a, b) => fifthsPosition(a.pc) - fifthsPosition(b.pc));

/** Sharps (+) or flats (-) in the key signature of a major key on this tonic. */
export function majorSignature(pc: number): number {
  const p = fifthsPosition(pc);
  return p <= 6 ? p : p - 12;
}

/** Key signature of the chosen key: the signature of the major scale it shares its notes with (its parent). */
export function keySignature(c: KeyChoice): { count: number; kind: "sharps" | "flats" | "none" } | null {
  const ctx = keyContext(c);
  if (!ctx || c.family !== 0) return null;
  const parent = TONICS.find((t) => t.name === ctx.parentTonic);
  if (!parent) return null;
  const n = majorSignature(parent.pc);
  return { count: Math.abs(n), kind: n > 0 ? "sharps" : n < 0 ? "flats" : "none" };
}

/** MIDI notes of the scale starting at its tonic in the octave of `base` (60 = C4), ending on the tonic an octave up. */
export function scaleMidis(ctx: KeyContext, base = 60): number[] {
  const root = base + ((ctx.tonic.pc - base) % 12 + 12) % 12;
  return [...ctx.steps.map((s) => root + s), root + 12];
}
