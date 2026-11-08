import { getAudioContext } from "./context";
import { getInstrumentConfig } from "./instruments";
import { pickSample } from "./notes";
import { cachedSample, instrumentSamples, loadSample } from "./samples";

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

/**
 * Play one sampled note at a set time, for anything that schedules ahead on the AudioContext clock (the backing band).
 * The sample is only re-pitched to the note, never stretched, so a tempo change costs no sound quality.
 * Returns false when the sample is not loaded yet (it starts loading, so the next one plays): preload the instrument first.
 */
export function scheduleNote(n: ScheduledNote): boolean {
  const config = getInstrumentConfig(n.instrumentId);
  const match = config ? pickSample(n.midi, instrumentSamples(n.instrumentId), config.strict) : null;
  if (!config || !match) return false;
  const buffer = cachedSample(match.sample.url);
  if (!buffer) {
    void loadSample(match.sample.url).catch(() => undefined);
    return false;
  }
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = match.rate;
  const gain = ctx.createGain();
  const peak = 0.8 * Math.max(0.05, Math.min(1, n.velocity));
  const attack = Math.max(0.003, config.attack);
  const release = Math.max(0.03, config.release);
  const off = n.when + Math.max(0.02, n.duration);
  gain.gain.setValueAtTime(0, n.when);
  gain.gain.linearRampToValueAtTime(peak, n.when + attack);
  gain.gain.setValueAtTime(peak, off);
  gain.gain.linearRampToValueAtTime(0.0001, off + release);
  src.connect(gain);
  gain.connect(n.destination);
  src.start(n.when);
  src.stop(off + release + 0.02);
  src.onended = () => gain.disconnect();
  return true;
}
