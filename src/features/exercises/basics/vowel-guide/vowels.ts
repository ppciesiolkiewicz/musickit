import type { Registers } from "@/features/theory/registers";
import type { Range } from "@/features/theory/singing";
import { zoneFor } from "../voice-hill/hill";

/**
 * The vowel guide's pure model: the notes it asks for (`targetNotes`), the holds in order (`holdsOf`), whether a sung
 * pitch is on the note (`heardOf`, `towards`), and the drawn mouth as numbers (`mouthShape`). No React, no sound.
 * The tool hears a pitch, never a vowel: nothing here judges the vowel.
 */

export const VOWELS = ["ah", "eh", "ee", "oh", "oo"] as const;
export type Vowel = (typeof VOWELS)[number];
export const isVowel = (v: unknown): v is Vowel => VOWELS.includes(v as Vowel);

/** How far the notes climb: one easy note, from it up to the first break, or from the first break up to the second. */
export const VOWEL_CLIMBS = ["one-note", "to-break", "across-break"] as const;
export type VowelClimb = (typeof VOWEL_CLIMBS)[number];
export const isVowelClimb = (v: unknown): v is VowelClimb => VOWEL_CLIMBS.includes(v as VowelClimb);

export const LIMITS = { seconds: [2, 6] } as const;
export const DEFAULTS = { seconds: 3 } as const;

/** the most notes a climb asks for, the first and the last among them */
export const CLIMB_NOTES = 4;
/** no note is asked for nearer the top of the range than this, in semitones (the seed rule for a new singer: three or more under the top) */
export const UNDER_TOP = 3;

type VoiceMap = Range & Registers;

/**
 * The easy note every climb starts from: the note the hill's "middle" place plays (`zoneFor`, a 5th over the bottom of
 * the range; a tenor's G3), kept `UNDER_TOP` under the top of a short range and never under its bottom.
 */
export const easyNote = (map: VoiceMap): number => Math.max(map.low, Math.min(zoneFor("middle", map).ref, map.high - UNDER_TOP));

/** Up to `n` whole notes from `from` to `to`, evenly spread, both ends among them, each once. */
function spread(from: number, to: number, n = CLIMB_NOTES): number[] {
  if (to <= from) return [from];
  const notes = Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / (n - 1)));
  return notes.filter((m, i) => i === 0 || m !== notes[i - 1]);
}

/**
 * The notes asked for, low to high, in MIDI. "one-note": the easy note alone. "to-break": from the easy note up to the
 * voice's first break. "across-break": from the first break up to the second, where head voice starts. The breaks are
 * the voice type's typical ones (`REGISTERS`), and no note sits nearer the top of the range than `UNDER_TOP`. A tenor:
 * G3; G3 A3 C4 D4; D4 E4 F4 G4.
 */
export function targetNotes(climb: VowelClimb, map: VoiceMap): number[] {
  const easy = easyNote(map);
  const cap = (m: number) => Math.max(easy, Math.min(m, map.high - UNDER_TOP));
  if (climb === "one-note") return [easy];
  if (climb === "to-break") return spread(easy, cap(map.primo));
  return spread(cap(map.primo), cap(map.secondo));
}

/** The vowels asked for, in the order written, each once; all five when none is written. */
export function cleanVowels(list: unknown): Vowel[] {
  const out = (Array.isArray(list) ? list : []).filter(isVowel).filter((v, i, all) => all.indexOf(v) === i);
  return out.length ? out : [...VOWELS];
}

export interface VowelHold { vowel: Vowel; midi: number }

/** The holds in order: every vowel on the first note, then every vowel on the next note up. */
export const holdsOf = (vowels: Vowel[], notes: number[]): VowelHold[] => notes.flatMap((midi) => vowels.map((vowel) => ({ vowel, midi })));

/** What the mic heard against the note asked for: "none" with no voice (a breath), "in" within `cents` of it, else "out". */
export const heardOf = (pitch: number | null, midi: number, cents: number): "none" | "in" | "out" =>
  pitch === null ? "none" : Math.abs(pitch - midi) * 100 <= cents ? "in" : "out";

/** Which way the voice has to move to reach the note: 1 up, -1 down, 0 when on it. */
export const towards = (pitch: number, midi: number, cents: number): -1 | 0 | 1 => (heardOf(pitch, midi, cents) === "in" ? 0 : pitch < midi ? 1 : -1);

/** The drawn mouth, each 0 to 1: how far the jaw is dropped, how wide the corners sit, how far the lips are pushed round. */
export interface MouthShape { open: number; wide: number; round: number }

/** Each vowel's mouth on an easy note: "ah" open tall, "eh" half open and wide, "ee" nearly the "oo" mouth, lips a little round and the corners in (not a smile), "oh" round and open, "oo" round and small. */
export const MOUTHS: Record<Vowel, MouthShape> = {
  ah: { open: 0.95, wide: 0.5, round: 0 },
  eh: { open: 0.5, wide: 0.75, round: 0 },
  ee: { open: 0.24, wide: 0.32, round: 0.75 },
  oh: { open: 0.6, wide: 0.38, round: 0.6 },
  oo: { open: 0.25, wide: 0.2, round: 1 },
};

/** the width every vowel moves towards as the note climbs */
const MID_WIDE = 0.5;
/** how far a vowel has opened, and moved towards the middle width, at the top of the range */
const OPENS = 0.4;
const NARROWS = 0.5;

/** How high a note sits for the mouth, 0 to 1: 0 at the easy note and under it, 1 at the top of the range. */
export function liftOf(midi: number, map: VoiceMap): number {
  const from = easyNote(map);
  return map.high <= from ? 0 : Math.min(1, Math.max(0, (midi - from) / (map.high - from)));
}

/**
 * A vowel's mouth on a note `lift` high (`liftOf`). As the note climbs every vowel opens a little, and its width moves
 * towards the middle: the wide vowel ("eh") comes in at the corners, the round ones ("ee", "oh", "oo") open out.
 */
export function mouthShape(vowel: Vowel, lift: number): MouthShape {
  const t = Math.min(1, Math.max(0, lift));
  const { open, wide, round } = MOUTHS[vowel];
  return { open: open + (1 - open) * OPENS * t, wide: wide + (MID_WIDE - wide) * NARROWS * t, round };
}

/** A mouth part of the way from `a` to `b` (`t` 0 to 1): what the drawing shows while it moves to the next shape. */
export const blend = (a: MouthShape, b: MouthShape, t: number): MouthShape => ({
  open: a.open + (b.open - a.open) * t,
  wide: a.wide + (b.wide - a.wide) * t,
  round: a.round + (b.round - a.round) * t,
});
