import type { SampleBackend } from "./backend";
import { liveBackend } from "./backends/choose";
import { getInstrumentConfig } from "./instruments";
import { pickSample } from "./notes";
import { instrumentSamples } from "./samples";

export interface ScheduledNote {
  instrumentId: string;
  midi: number;
  /** AudioContext time the note starts */
  when: number;
  /** seconds it is held before its release */
  duration: number;
  /** 0-1 */
  velocity: number;
  destination: AudioNode;
}

/** What plays scheduled notes; by default the one `liveBackend` picks for the instrument. */
let backendOf: (instrumentId: string) => SampleBackend = liveBackend;
export const setScheduledBackend = (fn: (instrumentId: string) => SampleBackend) => {
  backendOf = fn;
};

/**
 * Play one sampled note at a set time, for anything that schedules ahead on the AudioContext clock (the backing band).
 * The sample is only re-pitched to the note, never stretched, so a tempo change costs no sound quality.
 * Returns false when the sample is not loaded yet (it starts loading, so the next one plays): preload the instrument first.
 */
export function scheduleNote(n: ScheduledNote): boolean {
  const config = getInstrumentConfig(n.instrumentId);
  if (!config || !pickSample(n.midi, instrumentSamples(n.instrumentId), config.strict)) return false;
  const backend = backendOf(n.instrumentId);
  // a scheduled velocity is 0–1 at full scale; the backends take 0.8 as a normal press
  const started = backend.start(n.instrumentId, { midi: n.midi, at: n.when, velocity: n.velocity * 0.8, duration: n.duration }, n.destination);
  if (started) return true;
  void backend.load(n.instrumentId, n.midi).catch(() => undefined);
  return false;
}
