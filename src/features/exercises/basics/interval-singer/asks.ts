/**
 * The pure side of `interval-singer`: where Do sits in the voice, which intervals fit from there, the next one to ask,
 * and their names. No React, no sound (tested in `asks.test.ts`).
 */
import { INTERVALS } from "@/lib/chordKit/intervals";
import type { Range } from "@/features/theory/singing";

export type IntervalDir = "up" | "down" | "both";
export const INTERVAL_DIRS: IntervalDir[] = ["up", "down", "both"];

/** M3, P5 and the octave: the default set */
export const DEFAULT_INTERVALS = [4, 7, 12];

/** the chromatic solfège from Do (movable Do, sharps up: Do Di Re Ri Mi...; written as the usual singer's set) */
const SOLFEGE = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Fi", "Sol", "Le", "La", "Te", "Ti"];

/** "P5" for 7, "M3" for -4: the short name, no direction */
export const shortName = (semis: number): string => INTERVALS.find((i) => i.semis === Math.abs(semis))?.short ?? `${Math.abs(semis)}`;

/** "perfect 5th up", "major 3rd down" */
export function longName(semis: number): string {
  const name = INTERVALS.find((i) => i.semis === Math.abs(semis))?.name ?? `${Math.abs(semis)} semitones`;
  return `${name} ${semis < 0 ? "down" : "up"}`;
}

/** The solfège of the note `semis` from Do: Sol for 7, Sol for -5 (the Sol under Do) */
export const solfegeOf = (semis: number): string => SOLFEGE[((semis % 12) + 12) % 12];

/** how far under the middle of the range the asked span is centred, in semitones */
const EASY_BELOW_MID = 3;

/** The intervals asked, signed by direction (up +, down -). */
export const signedOf = (semis: number[], dir: IntervalDir): number[] =>
  semis.flatMap((s) => (dir === "up" ? [s] : dir === "down" ? [-s] : [s, -s]));

/**
 * Do in the voice: the key's note (`keyPc`) in the range from which the most of the asked intervals land inside it,
 * and of those the one whose span sits nearest a minor 3rd under the middle of the range (a voice's easy notes sit
 * lower than the middle of its two octaves: a tenor's C3 to C5 is easiest around A3, and G4 and up is hard for one who
 * is new). With it, the intervals that fit from there. null when no Do in the range fits any interval.
 */
export function placeDo(keyPc: number, range: Range, semis: number[], dir: IntervalDir): { midi: number; asks: number[] } | null {
  const signed = signedOf(semis, dir);
  const mid = (range.low + range.high) / 2 - EASY_BELOW_MID;
  let best: { midi: number; asks: number[]; off: number } | null = null;
  for (let m = range.low; m <= range.high; m++) {
    if (((m - keyPc) % 12 + 12) % 12 !== 0) continue;
    const asks = signed.filter((s) => m + s >= range.low && m + s <= range.high);
    if (!asks.length) continue;
    const off = Math.abs((Math.min(m, ...asks.map((s) => m + s)) + Math.max(m, ...asks.map((s) => m + s))) / 2 - mid);
    if (!best || asks.length > best.asks.length || (asks.length === best.asks.length && off < best.off)) best = { midi: m, asks, off };
  }
  return best && { midi: best.midi, asks: best.asks };
}

/** One more or one less of a set, kept in order, never none: what a chip of keys or intervals does. */
export const toggleOne = (xs: number[], x: number): number[] =>
  xs.includes(x) ? (xs.length > 1 ? xs.filter((y) => y !== x) : xs) : [...xs, x].sort((a, b) => a - b);

/** Whether a sung note (fractional MIDI) is within `cents` of any of these notes. */
export const onANote = (midi: number, notes: number[], cents: number): boolean =>
  notes.some((n) => Math.abs(midi - n) * 100 <= cents);

/** The next interval to ask: any from the pool, never the one just asked when there is a choice. */
export function nextAsk(asks: number[], rand: () => number, prev: number | null): number | null {
  if (!asks.length) return null;
  const pool = asks.length > 1 && prev !== null ? asks.filter((s) => s !== prev) : asks;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
