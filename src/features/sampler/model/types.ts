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

/** Everything the sampler remembers apart from the audio itself (stored per sample id). Old saves may still carry `instruments`: they are ignored. */
export interface SamplerProject {
  version: 1;
  samples: SampleMeta[];
}
