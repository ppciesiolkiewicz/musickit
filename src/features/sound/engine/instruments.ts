import type { Tuning } from "./notes";
import { getRuntimeInstrument, runtimeInstrumentOptions } from "./runtime";
import SAMPLES from "./samples.generated.json";
import MEASURED from "./tuning.generated.json";

export interface InstrumentConfig {
  label: string;
  urls: Record<string, string>;
  baseUrl: string;
  attack?: number;
  release?: number;
  /** cents each sample file measures off its note (keyed by the sample's MIDI note), played shifted back by that */
  tuning?: Tuning;
  /** plays when named (a saved project) but is not offered in pickers */
  hidden?: boolean;
}

const DEFAULT_ATTACK = 0;
const DEFAULT_RELEASE = 0.3;

/** Where each instrument's samples are (`npm run samples:fetch`) and how far each measures off its note (`npm run samples:measure`). */
const sampled = (id: keyof typeof SAMPLES) => ({
  urls: SAMPLES[id].urls as Record<string, string>,
  baseUrl: SAMPLES[id].baseUrl,
  tuning: (MEASURED.tuning as Record<string, Tuning>)[id],
});

/**
 * The built-in instruments. The ids are kept whatever plays them, since saved looper projects and backing styles name them:
 * METAL_GUITAR is a clean electric guitar now, ACCORDION a harmonium, and SYNTH_ACCORDION (no library has one) plays the same
 * harmonium, hidden from the pickers.
 */
export const INSTRUMENTS = {
  PIANO: { label: "Piano", ...sampled("PIANO") },
  ACCORDION: { label: "Harmonium", ...sampled("ACCORDION") },
  BASSOON: { label: "Bassoon", ...sampled("BASSOON") },
  CELLO: { label: "Cello", ...sampled("CELLO") },
  ELEC_PIANO: { label: "Electric Piano", ...sampled("ELEC_PIANO") },
  FLUTE: { label: "Flute", ...sampled("FLUTE") },
  HONKY_TONK_PIANO: { label: "Honky Tonk Piano", ...sampled("HONKY_TONK_PIANO") },
  METAL_GUITAR: { label: "Electric Guitar", ...sampled("METAL_GUITAR") },
  POP_LEAD: { label: "Pop Lead", ...sampled("POP_LEAD") },
  SYNTH_ACCORDION: { label: "Synth Accordion", hidden: true, ...sampled("SYNTH_ACCORDION") },
  SYNTH_BRASS: { label: "Synth Brass", ...sampled("SYNTH_BRASS") },
  SYNTH_LEAD: { label: "Synth Lead", ...sampled("SYNTH_LEAD") },
} as const satisfies Record<string, InstrumentConfig>;

export type InstrumentId = keyof typeof INSTRUMENTS;

export const OSCILLATOR_ID = "OSCILLATOR" as const;
export const INSTRUMENT_PIANO: InstrumentId = "PIANO";

export const INSTRUMENT_OPTIONS: { label: string; value: string }[] = [
  ...Object.entries(INSTRUMENTS).filter(([, c]) => !(c as InstrumentConfig).hidden).map(([id, config]) => ({ label: config.label, value: id })),
  { label: "Oscillator", value: OSCILLATOR_ID },
];

/** Built-in instruments, then the ones added at run time, then the oscillator. */
export function allInstrumentOptions(): { label: string; value: string }[] {
  const builtIn = INSTRUMENT_OPTIONS.filter((o) => o.value !== OSCILLATOR_ID);
  return [...builtIn, ...runtimeInstrumentOptions(), { label: "Oscillator", value: OSCILLATOR_ID }];
}

export function getInstrumentConfig(id: string): { label: string; urls: Record<string, string>; baseUrl: string; attack: number; release: number; strict: boolean; runtime: boolean; tuning?: Tuning } | null {
  const builtIn = INSTRUMENTS[id as InstrumentId] as InstrumentConfig | undefined;
  const config = builtIn ?? getRuntimeInstrument(id);
  if (!config) return null;
  return { label: config.label, urls: config.urls, baseUrl: config.baseUrl, attack: config.attack ?? DEFAULT_ATTACK, release: config.release ?? DEFAULT_RELEASE, strict: (config as { strict?: boolean }).strict === true, runtime: !builtIn, tuning: (config as { tuning?: Tuning }).tuning };
}
