import { midiToName } from "@/features/sound/engine/notes";
import type { RuntimeInstrument } from "@/features/sound/engine/runtime";

/** What a looper instrument asks its voice to play. The same shape as the looper's `VoiceSpec` (the sampler does not import the looper). */
export type SoundSpec =
  | { kind: "piano"; instrument: string }
  | { kind: "pitched"; sample: string | null; root: number }
  | { kind: "pads"; samples: (string | null)[] };

/** pad i plays note PAD_BASE + i (C2 upward), as in the looper */
export const PAD_BASE = 36;

export const sampleIds = (spec: SoundSpec): string[] =>
  spec.kind === "pitched" ? (spec.sample ? [spec.sample] : []) : spec.kind === "pads" ? [...new Set(spec.samples.filter((s): s is string => !!s))] : [];

/** The runtime instrument for a sampler spec. `urlOf` gives a sample's playable url, or nothing when it is missing (then that note is silent). */
export function runtimeFor(spec: Exclude<SoundSpec, { kind: "piano" }>, urlOf: (id: string) => string | null | undefined): RuntimeInstrument {
  if (spec.kind === "pitched") {
    const url = spec.sample ? urlOf(spec.sample) : null;
    return url
      ? { label: "Sampler", urls: { [midiToName(spec.root)]: url }, baseUrl: "", attack: 0, release: 0.3, hidden: true }
      : { label: "Sampler", urls: {}, baseUrl: "", strict: true, hidden: true };
  }
  const urls: Record<string, string> = {};
  spec.samples.forEach((id, i) => {
    const url = id ? urlOf(id) : null;
    if (url) urls[midiToName(PAD_BASE + i)] = url;
  });
  // a long release lets a hit ring on after the key is let go
  return { label: "Sampler pads", urls, baseUrl: "", attack: 0, release: 1.5, strict: true, hidden: true };
}
