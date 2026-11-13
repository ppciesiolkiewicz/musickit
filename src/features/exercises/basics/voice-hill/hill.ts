import type { Range } from "@/features/theory/singing";

/**
 * The hill's pure model: where in the voice the sound is held (`zoneFor`), whether a pitch is there (`inZone`), where
 * the ball sits on the picture (`ballX`, `heightAt`), and how a hold fills and drains (`stepHold`). No React, no sound.
 */

export const HILL_WHERE = ["low", "middle", "high"] as const;
export type HillWhere = (typeof HILL_WHERE)[number];
export const HILL_SOUNDS = ["hum", "oo", "ee"] as const;
export type HillSound = (typeof HILL_SOUNDS)[number];

export const LIMITS = { seconds: [2, 10], reps: [1, 8] } as const;
export const DEFAULTS = { seconds: 3, reps: 5 } as const;

/** The notes that count, in MIDI (an open end is ±Infinity), and the note the Play note button sounds. */
export interface Zone { lo: number; hi: number; ref: number }

/**
 * Where each place sits in a voice's two-octave range: "low" at or under the 5th semitone from its bottom, "middle"
 * from the 6th to the 11th semitone, "high" at or over 6 semitones under its top (for a tenor: E3 and under, F3 to B♭3,
 * F♯4 and over), as the old attunr warm-ups placed them.
 */
export function zoneFor(where: HillWhere, range: Range): Zone {
  if (where === "low") return { lo: -Infinity, hi: range.low + 4, ref: range.low + 4 };
  if (where === "high") return { lo: range.high - 6, hi: Infinity, ref: range.high - 6 };
  return { lo: range.low + 5, hi: range.low + 10, ref: range.low + 7 };
}

/** The pitch (fractional MIDI) is in the zone, `cents` of slack at each closed end. */
export const inZone = (midi: number, z: Zone, cents: number): boolean => midi >= z.lo - cents / 100 && midi <= z.hi + cents / 100;

/** Which way the voice has to move to reach the zone: 0 when in it. */
export const towards = (midi: number, z: Zone, cents: number): -1 | 0 | 1 => (inZone(midi, z, cents) ? 0 : midi < z.lo ? 1 : -1);

/** The semitones shown either side of the middle of the picture. */
export const SPAN = 8;

/** The picture's middle note: the zone's closed edge, or its middle when it has two. */
const centre = (z: Zone) => (Number.isFinite(z.lo) && Number.isFinite(z.hi) ? (z.lo + z.hi) / 2 : Number.isFinite(z.lo) ? z.lo : z.hi);

/** Across the picture, 0 to 1, low notes on the left; clamped a little past both edges so the ball stays in sight. */
export const ballX = (midi: number, z: Zone): number => Math.min(1.02, Math.max(-0.02, 0.5 + (midi - centre(z)) / (2 * SPAN)));

/** The zone across the picture, 0 to 1. */
export function zoneX(z: Zone): [number, number] {
  const x = (m: number) => Math.min(1, Math.max(0, ballX(m, z)));
  return [Number.isFinite(z.lo) ? x(z.lo) : 0, Number.isFinite(z.hi) ? x(z.hi) : 1];
}

/**
 * The ground's height at x, 0 (bottom) to 1 (top). "low": a slope down to the left, so a lower sound rolls the ball
 * down into the hollow. "high": the same slope, climbed to the top on the right. "middle": a valley, the zone at its floor.
 */
export function heightAt(where: HillWhere, x: number): number {
  const t = Math.min(1, Math.max(0, x));
  if (where === "middle") return (1 + Math.cos(2 * Math.PI * t)) / 2;
  return (1 - Math.cos(Math.PI * t)) / 2;
}

export interface Hold { progress: number }

/**
 * One frame of a hold, `dt` seconds long: in the zone it fills over `seconds`; out of it, sung, it drains at half that
 * speed; with no sound (a breath) it waits. Returns the new progress, 0 to 1.
 */
export function stepHold(progress: number, heard: "in" | "out" | "none", dt: number, seconds: number): number {
  if (heard === "none") return progress;
  const next = progress + (heard === "in" ? dt / seconds : -dt / (2 * seconds));
  return Math.min(1, Math.max(0, next));
}

export const clampInt = (v: number | undefined, [lo, hi]: readonly [number, number], fallback: number): number =>
  v === undefined || !Number.isFinite(v) ? fallback : Math.min(hi, Math.max(lo, Math.round(v)));
