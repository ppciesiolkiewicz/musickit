/** What a tuner is set to: the instrument, its tuning and the A4 reference. Pure, shared by the tuner page and the looper's tuner. */

import { instrumentById, type Instrument, type InstrumentId, type Tuning } from "@/features/theory/tunings";
import { hzToNote, nearestString } from "./pitch";

export interface TunerChoice { instrument: InstrumentId; tuning: string; a4: number }

/** The instruments a tuner offers: Chromatic for any note and the four common ones. */
export const TUNER_INSTRUMENTS: Instrument[] = (["chromatic", "guitar", "bass", "ukulele", "violin"] as const).map((id) => instrumentById(id)!);

export const DEFAULT_CHOICE: TunerChoice = { instrument: "guitar", tuning: "standard", a4: 440 };

export const A4_MIN = 400;
export const A4_MAX = 480;

/** A4 kept in range, to a tenth of a hertz. */
export const clampA4 = (n: number) => Math.max(A4_MIN, Math.min(A4_MAX, Math.round(n * 10) / 10));

/** A valid choice from loose input (query string or storage), or null. Instruments the tuner no longer offers give null. */
export function sanitiseChoice(raw: Partial<Record<keyof TunerChoice, unknown>> | null | undefined): TunerChoice | null {
  const inst = TUNER_INSTRUMENTS.find((i) => i.id === raw?.instrument);
  if (!inst) return null;
  const tuning = inst.tunings.find((t) => t.id === raw?.tuning)?.id ?? inst.tunings[0]?.id ?? "";
  const a4 = Number(raw?.a4);
  return { instrument: inst.id, tuning, a4: Number.isFinite(a4) && a4 > 0 ? clampA4(a4) : 440 };
}

/** The choice with another instrument, on that instrument's first tuning. */
export const withInstrument = (c: TunerChoice, id: InstrumentId): TunerChoice => ({ ...c, instrument: id, tuning: instrumentById(id)?.tunings[0]?.id ?? "" });

export function resolveChoice(c: TunerChoice): { instrument: Instrument; tuning: Tuning | undefined } {
  const instrument = instrumentById(c.instrument) ?? instrumentById(DEFAULT_CHOICE.instrument)!;
  return { instrument, tuning: instrument.tunings.find((t) => t.id === c.tuning) ?? instrument.tunings[0] };
}

export interface TunerRead {
  /** the note name shown big: the nearest open string, or the nearest note on Chromatic */
  name: string;
  octave: number;
  /** cents sharp (+) or flat (−) of that target */
  cents: number;
  /** the note actually heard */
  heard: { name: string; octave: number };
  /** index of the nearest open string, null on Chromatic */
  string: number | null;
}

/** What a tuner shows for a frequency: cents to the nearest open string of the tuning, or to the nearest note on Chromatic. */
export function readHz(hz: number, c: TunerChoice): TunerRead {
  const note = hzToNote(hz, c.a4);
  const strings = resolveChoice(c).tuning?.strings ?? [];
  if (!strings.length) return { name: note.name, octave: note.octave, cents: note.cents, heard: note, string: null };
  const t = nearestString(hz, c.a4, strings);
  const s = strings[t.index];
  return { name: s.name, octave: s.octave, cents: t.cents, heard: note, string: t.index };
}
