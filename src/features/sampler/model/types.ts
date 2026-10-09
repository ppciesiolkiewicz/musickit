/** Where a sample came from. New providers add a kind here and a provider in `server/providers.ts`. */
export type SampleSource = "upload" | "elevenlabs";

export interface SampleMeta {
  id: string;
  name: string;
  source: SampleSource;
  /** the text it was generated from */
  prompt?: string;
  mime: string;
  bytes: number;
  createdAt: number;
}

export interface SamplerInstrument {
  id: string;
  label: string;
  /** note name ("C3") -> sample id. The pitch of a pad is the note the sample sounds at; other notes are tuned from the nearest pad. */
  pads: Record<string, string>;
  attack: number;
  release: number;
}

/** Everything the sampler remembers, apart from the audio itself (that is stored per sample id). */
export interface SamplerProject {
  version: 1;
  samples: SampleMeta[];
  instruments: SamplerInstrument[];
}

/** Prefix of the ids the sampler gives its instruments in the sound engine. */
export const INSTRUMENT_PREFIX = "user:";
