export interface InstrumentConfig {
  label: string;
  urls: Record<string, string>;
  baseUrl: string;
  attack?: number;
  release?: number;
}

const DEFAULT_ATTACK = 0;
const DEFAULT_RELEASE = 0.3;

export const INSTRUMENTS = {
  PIANO: {
    label: "Piano",
    urls: { G3: "pianoG3.wav", C4: "pianoC4.wav", G4: "pianoG4.wav", C5: "pianoC5.wav", G5: "pianoG5.wav", C6: "pianoC6.wav" },
    baseUrl: "/instruments/PIANO/",
  },
  ACCORDION: {
    label: "Accordion",
    urls: { C1: "accordionC1.wav", C2: "accordionC2.wav" },
    baseUrl: "/instruments/ACCORDION/",
  },
  BASSOON: {
    label: "Bassoon",
    urls: { C2: "bassoonC2.wav", C3: "bassoonC3.wav", C4: "bassoonC4.wav", G2: "bassoonG2.wav" },
    baseUrl: "/instruments/BASSOON/",
  },
  CELLO: {
    label: "Cello",
    urls: { C2: "cello2C2.wav", C3: "cello2C3.wav", C4: "cello2C4.wav" },
    baseUrl: "/instruments/CELLO/",
  },
  ELEC_PIANO: {
    label: "Electric Piano",
    urls: { G1: "epianoG1.wav", C2: "epianoC2.wav", G2: "epianoG2.wav", C3: "epianoC3.wav", G3: "epianoG3.wav" },
    baseUrl: "/instruments/ELEC-PIANO/",
  },
  FLUTE: {
    label: "Flute",
    urls: { C1: "fluteC1.wav", C2: "fluteC2.wav" },
    baseUrl: "/instruments/FLUTE/",
  },
  HONKY_TONK_PIANO: {
    label: "Honky Tonk Piano",
    urls: { G1: "honkypianoG1.wav", C2: "honkypianoC2.wav", G2: "honkypianoG2.wav", C3: "honkypianoC3.wav", G3: "honkypianoG3.wav", C4: "honkypianoC4.wav" },
    baseUrl: "/instruments/HONKY-TONK-PIANO/",
  },
  METAL_GUITAR: {
    label: "Metal Guitar",
    urls: { G1: "metalguitarG1.wav", C2: "metalguitarC2.wav", G2: "metalguitarG2.wav", C3: "metalguitarC3.wav" },
    baseUrl: "/instruments/METAL-GUITAR/",
  },
  POP_LEAD: {
    label: "Pop Lead",
    urls: { G1: "popleadG1.wav", G2: "popleadG2.wav", G3: "popleadG3.wav" },
    baseUrl: "/instruments/POP-LEAD/",
  },
  SYNTH_ACCORDION: {
    label: "Synth Accordion",
    urls: { G1: "synthaccordionG1.wav", G2: "synthaccordionG2.wav", G3: "synthaccordionG3.wav" },
    baseUrl: "/instruments/SYNTH-ACCORDION/",
  },
  SYNTH_BRASS: {
    label: "Synth Brass",
    urls: { C2: "synthbrassC2.wav", C3: "synthbrassC3.wav", C4: "synthbrassC4.wav" },
    baseUrl: "/instruments/SYNTH-BRASS/",
  },
  SYNTH_LEAD: {
    label: "Synth Lead",
    urls: { G1: "synthleadG1.wav", C2: "synthleadC2.wav", C3: "synthleadC3.wav", G3: "synthleadG3.wav" },
    baseUrl: "/instruments/SYNTH-LEAD/",
  },
} as const satisfies Record<string, InstrumentConfig>;

export type InstrumentId = keyof typeof INSTRUMENTS;

export const OSCILLATOR_ID = "OSCILLATOR" as const;
export const INSTRUMENT_PIANO: InstrumentId = "PIANO";

export const INSTRUMENT_OPTIONS: { label: string; value: string }[] = [
  ...Object.entries(INSTRUMENTS).map(([id, config]) => ({ label: config.label, value: id })),
  { label: "Oscillator", value: OSCILLATOR_ID },
];

export function getInstrumentConfig(id: string): { label: string; urls: Record<string, string>; baseUrl: string; attack: number; release: number } | null {
  const config = INSTRUMENTS[id as InstrumentId] as InstrumentConfig | undefined;
  if (!config) return null;
  return { label: config.label, urls: config.urls, baseUrl: config.baseUrl, attack: config.attack ?? DEFAULT_ATTACK, release: config.release ?? DEFAULT_RELEASE };
}
