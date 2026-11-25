import { Note } from "@tonaljs/tonal";
import { gripName } from "@/lib/chordKit/gripName";
import { FAMILIES, MODE_LIST, degreeLabel, makeKeyContext } from "@/features/theory/theory";
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
  /** a ring from each note's place as it is played, its name while it sounds, and the chord the notes sounding make */
  pulse: boolean;
  /** the chord shape the notes sounding together make, joined, with its name */
  chords: boolean;
  /** the finger number of each note, where the riff says */
  fingers: boolean;
  /** a faint shape for the notes coming next */
  next: boolean;
  /** note names, or degrees in the key */
  labels: "name" | "degree";
}
export const DEFAULT_CV: CvSettings = { numbers: "dots", strings: true, notes: true, fire: true, fireStrength: 1, pulse: true, chords: true, fingers: false, next: true, labels: "name" };

/** Settings read back from storage: anything unreadable falls back to the default. */
export function readCv(v: unknown): CvSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof CvSettings, unknown>>;
  const flag = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
  return {
    numbers: NUMBERS.includes(o.numbers as Numbers) ? (o.numbers as Numbers) : DEFAULT_CV.numbers,
    strings: flag(o.strings, DEFAULT_CV.strings),
    notes: flag(o.notes, DEFAULT_CV.notes),
    fire: flag(o.fire, DEFAULT_CV.fire),
    pulse: flag(o.pulse, DEFAULT_CV.pulse),
    chords: flag(o.chords, DEFAULT_CV.chords),
    fingers: flag(o.fingers, DEFAULT_CV.fingers),
    next: flag(o.next, DEFAULT_CV.next),
    labels: o.labels === "name" || o.labels === "degree" ? o.labels : DEFAULT_CV.labels,
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

/** How long a Pick pulse ring grows (s), and the shortest time a note counts as sounding, for one with no end. */
export const PULSE_S = 0.7, MIN_HOLD_S = 0.3;

/** A note of a take: when it starts and ends (s) in the video, and where it is played when the riff says. */
export interface TakeNote { start: number; midi: number; end?: number; string?: number; fret?: number; finger?: number }

/**
 * The take's notes on screen at time `t` for Pick pulse: each one from its start until its ring has grown or it stops
 * sounding, whichever is later, with how long since it started (`age`) and whether it still sounds (`held`).
 */
export function pulsesAt<N extends TakeNote>(notes: N[], t: number): (N & { age: number; held: boolean })[] {
  return notes.flatMap((n) => {
    const age = t - n.start, hold = Math.max(MIN_HOLD_S, (n.end ?? n.start) - n.start);
    return age >= 0 && age < Math.max(PULSE_S, hold) ? [{ ...n, age, held: age < hold }] : [];
  });
}

/** The chord the notes sounding together make ("Am", "E5", "C/E"), or null for one note or no chord: low to high, the bass first. */
export function chordOf(midis: number[]): { name: string; rootPc: number } | null {
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  if (new Set(sorted.map((m) => ((m % 12) + 12) % 12)).size < 2) return null;
  const g = gripName(sorted);
  return g ? { name: g.name, rootPc: g.rootPc } : null;
}

/** How far ahead (s) the notes coming next show. */
export const NEXT_LEAD_S = 0.6;

/** The notes sounding at `t` (start <= t < end; no end counts as `MIN_HOLD_S`), grouped by the same start (to 1 ms), each group named when it is a chord. */
export function chordsAt(notes: TakeNote[], t: number): { start: number; notes: TakeNote[]; name: string | null }[] {
  const groups: { start: number; notes: TakeNote[] }[] = [];
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    if (!(n.start <= t && t < (n.end ?? n.start + MIN_HOLD_S))) continue;
    const g = groups.find((x) => Math.abs(x.start - n.start) < 0.001);
    if (g) g.notes.push(n);
    else groups.push({ start: n.start, notes: [n] });
  }
  return groups.map((g) => ({ ...g, name: chordOf(g.notes.map((n) => n.midi))?.name ?? null }));
}

/** The notes of the next start after `t` (all that share it), when it is within `lead` seconds; else none. */
export function comingAt(notes: TakeNote[], t: number, lead = NEXT_LEAD_S): TakeNote[] {
  const later = notes.filter((n) => n.start > t);
  if (!later.length) return [];
  const next = Math.min(...later.map((n) => n.start));
  return next - t <= lead ? later.filter((n) => Math.abs(n.start - next) < 0.001) : [];
}

/** A note's name (with ♯) or its degree in the key; with no key, or a scale not found, its name. */
export function noteLabel(midi: number, labels: CvSettings["labels"], key?: { tonic: number; scale: string }): string {
  const pc = ((midi % 12) + 12) % 12;
  const name = Note.pitchClass(Note.fromMidiSharps(midi)).replace("#", "♯");
  const mode = key && MODE_LIST.find((m) => m.name === key.scale);
  if (labels !== "degree" || !key || !mode) return name;
  return degreeLabel(pc, makeKeyContext(key.tonic, FAMILIES.indexOf(mode.family), mode.k));
}
