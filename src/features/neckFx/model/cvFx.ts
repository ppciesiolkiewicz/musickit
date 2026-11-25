import { AMOUNT_MAX } from "./fx";

/** What the OpenCV reader draws over the neck. Pure: NeckCvView draws, CvControls sets. */

export const NUMBERS = ["dots", "all", "off"] as const;
export type Numbers = (typeof NUMBERS)[number];
export const NUMBER_WORDS: Record<Numbers, string> = { dots: "Dot frets", all: "All frets", off: "Off" };
/** The frets with a dot inlay on a Strat. */
export const DOT_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
/** The fret spaces numbered for a setting. */
export const numbered = (n: Numbers): number[] => (n === "off" ? [] : n === "dots" ? DOT_FRETS : Array.from({ length: 22 }, (_, i) => i + 1));

export interface CvSettings {
  /** which fret spaces get their number above and below the board */
  numbers: Numbers;
  /** draw the six strings found */
  strings: boolean;
  /** name the note under each fingertip; a note heard lights where it was played */
  notes: boolean;
  /** flames along the board's edges and strings that shake when a note is heard */
  fire: boolean;
  /** how strong Neck fire is, 0 to `AMOUNT_MAX` */
  fireStrength: number;
}
export const DEFAULT_CV: CvSettings = { numbers: "dots", strings: true, notes: true, fire: true, fireStrength: 1 };

/** Settings read back from storage: anything unreadable falls back to the default. */
export function readCv(v: unknown): CvSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof CvSettings, unknown>>;
  const flag = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
  return {
    numbers: NUMBERS.includes(o.numbers as Numbers) ? (o.numbers as Numbers) : DEFAULT_CV.numbers,
    strings: flag(o.strings, DEFAULT_CV.strings),
    notes: flag(o.notes, DEFAULT_CV.notes),
    fire: flag(o.fire, DEFAULT_CV.fire),
    fireStrength: typeof o.fireStrength === "number" && Number.isFinite(o.fireStrength) ? Math.min(AMOUNT_MAX, Math.max(0, o.fireStrength)) : DEFAULT_CV.fireStrength,
  };
}

/** The string names, low E first, as the status line says them. */
export const STRING_WORDS = ["low E", "A", "D", "G", "B", "high E"];

/**
 * How hot Neck fire burns at fret position `f` (0 at the nut), 0 to about 1.6: a low burn all along, hottest round the fretting
 * hand (`hand`, its fret, or null), all of it higher with the playing's `energy` (0 to 1) and leaping with `kick` (the last
 * note heard, 1 when it lands and falling away).
 */
export function heatAt(f: number, hand: number | null, energy: number, kick: number): number {
  const near = hand === null ? 0 : Math.exp(-(((f - hand) / 3) ** 2));
  return (0.35 + 0.65 * near) * (0.6 + 0.6 * energy) + 0.45 * kick * (0.4 + near);
}

/** Smooth noise from -1 to 1 for the flames' flicker: a few sines, so it needs no table. */
export const flicker = (x: number, t: number) =>
  (Math.sin(x * 1.7 + t * 2.3) + 0.6 * Math.sin(x * 3.9 - t * 3.7 + 1.3) + 0.35 * Math.sin(x * 7.3 + t * 5.9 + 4.1)) / 1.95;
