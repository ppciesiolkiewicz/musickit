import type { Range } from "@/features/theory/singing";
import type { Registers } from "@/features/theory/registers";

/** A voice's range and where it changes register. */
export type VoiceMap = Range & Registers;

/**
 * The lip roll's pure model: the path the tone takes (a slide, a siren or one held note) as points in time and pitch,
 * the pitch on it at a time, and one round's phases (listen, then your turn). It runs from head voice to chest voice, from
 * the voice's registers (`REGISTERS`). No React, no sound.
 */

export const LIP_ROLL_SHAPES = ["down", "up", "siren", "hold"] as const;
export type LipRollShape = (typeof LIP_ROLL_SHAPES)[number];

export const LIMITS = { plays: [1, 8], seconds: [2, 10] } as const;
export const DEFAULTS = { plays: 3, seconds: 5 } as const;

/** A point of the path: `t` seconds from its start, `midi` the pitch. */
export interface PathPoint { t: number; midi: number }
export interface GlidePath { points: PathPoint[]; duration: number; low: number; high: number }

/** how long the slide stays on its first and its last note, in seconds */
const EDGE = 1;

/**
 * Where a lip roll goes in a voice (`voiceMap`): a slide from head voice to chest voice, its top 3 semitones over the second
 * break and its bottom 7 under the first (a 5th down into chest voice), both kept inside the voice's comfortable range
 * (a bass reaches only 2 semitones into head voice before its top). "hold" is one chest-voice note, 5 semitones under the first break.
 */
export function rollNotes(v: VoiceMap): { high: number; low: number; hold: number } {
  return { high: Math.min(v.high, v.secondo + 3), low: Math.max(v.low, v.primo - 7), hold: Math.max(v.low, v.primo - 5) };
}

/**
 * The tone's path in a voice: "down" from head voice to chest voice, "up" the other way, "siren" up and back down,
 * "hold" one chest-voice note for `seconds`. A slide holds its first and last note a second each and takes a quarter
 * second a semitone between them, never under 2.5 seconds.
 */
export function glidePath(shape: LipRollShape, v: VoiceMap, seconds: number = DEFAULTS.seconds): GlidePath {
  const { high, low, hold } = rollNotes(v);
  if (shape === "hold") return { points: [{ t: 0, midi: hold }, { t: seconds, midi: hold }], duration: seconds, low: hold, high: hold };
  const ramp = Math.max(2.5, (high - low) * 0.25);
  const [a, b] = shape === "up" || shape === "siren" ? [low, high] : [high, low];
  const points: PathPoint[] = [{ t: 0, midi: a }, { t: EDGE, midi: a }, { t: EDGE + ramp, midi: b }];
  if (shape === "siren") points.push({ t: EDGE + ramp + 0.6, midi: b }, { t: EDGE + 2 * ramp + 0.6, midi: a }, { t: 2 * EDGE + 2 * ramp + 0.6, midi: a });
  else points.push({ t: 2 * EDGE + ramp, midi: b });
  return { points, duration: points[points.length - 1].t, low, high };
}

/** The pitch on the path at `t` seconds, held at both ends. */
export function midiAt(path: GlidePath, t: number): number {
  const ps = path.points;
  if (t <= ps[0].t) return ps[0].midi;
  for (let i = 1; i < ps.length; i++) {
    if (t <= ps[i].t) {
      const a = ps[i - 1], b = ps[i];
      return b.t === a.t ? b.midi : a.midi + ((b.midi - a.midi) * (t - a.t)) / (b.t - a.t);
    }
  }
  return ps[ps.length - 1].midi;
}

/** the gap between the tone and the student's turn, in seconds */
export const GAP = 0.8;
/** the rest after the student's turn before the next round, in seconds */
export const REST = 1.6;

export type RoundPhase = "listen" | "gap" | "you" | "rest";

/** Where a round is at `t` seconds from its start: the phase, and the time inside the path (for listen and you), or null once it has ended. */
export function roundAt(path: GlidePath, t: number): { phase: RoundPhase; at: number } | null {
  const d = path.duration;
  if (t < d) return { phase: "listen", at: t };
  if (t < d + GAP) return { phase: "gap", at: d };
  if (t < 2 * d + GAP) return { phase: "you", at: t - d - GAP };
  if (t < 2 * d + GAP + REST) return { phase: "rest", at: d };
  return null;
}

export const roundSeconds = (path: GlidePath): number => 2 * path.duration + GAP + REST;

/** How far a sung pitch is from the path, in semitones, for the colour of the student's line: near (≤ 1), off (more). */
export const nearPath = (path: GlidePath, at: number, midi: number, semis = 1): boolean => Math.abs(midi - midiAt(path, at)) <= semis;

export const clampInt = (v: number | undefined, [lo, hi]: readonly [number, number], fallback: number): number =>
  v === undefined || !Number.isFinite(v) ? fallback : Math.min(hi, Math.max(lo, Math.round(v)));
