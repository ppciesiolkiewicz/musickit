import { getInstrumentConfig } from "../engine/instruments";
import { noteToMidi, pickSample } from "../engine/notes";
import { instrumentSamples, loadSample } from "../engine/samples";
import type { Step } from "./sequence";

export interface OfflineClick {
  /** ms from the start */
  at: number;
  accent: boolean;
}

/** Timed notes (and metronome clicks) rendered off the clock to a stereo buffer, sounding as the live player does. */
export async function renderOffline(o: { steps: Step[]; clicks?: OfflineClick[]; durationMs: number; instrumentId?: string; sampleRate?: number }): Promise<AudioBuffer> {
  const { steps, clicks = [], durationMs, instrumentId = "PIANO", sampleRate = 48000 } = o;
  const ctx = new OfflineAudioContext(2, Math.ceil((durationMs / 1000) * sampleRate), sampleRate);
  const config = getInstrumentConfig(instrumentId);
  if (!config) throw new Error(`${instrumentId}: an instrument without samples cannot be rendered offline`);
  const samples = instrumentSamples(instrumentId);

  // same envelope as the live player: ramp up over the attack, ramp down over the release from the note's end
  for (const s of steps) {
    const midi = noteToMidi(s.note);
    if (midi === null) continue;
    const match = pickSample(midi, samples, config.strict);
    if (!match) continue; // a strict instrument without that note stays silent, as live
    const buffer = await loadSample(match.sample.url);
    const t = s.at / 1000;
    const off = (s.at + s.hold) / 1000;
    const release = config.release ?? 0.3;
    const peak = 0.8 * Math.max(0.05, Math.min(1, (s.velocity ?? 0.8) / 0.8));
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + (config.attack || 0.01));
    // a note released before its attack ends is cut where the ramp has got to
    gain.gain.setValueAtTime(Math.min(peak, peak * ((off - t) / (config.attack || 0.01))), Math.max(t, off));
    gain.gain.linearRampToValueAtTime(0.001, Math.max(t, off) + release);
    gain.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = match.rate;
    src.connect(gain);
    src.start(t);
    src.stop(Math.max(t, off) + release + 0.05);
  }

  for (const c of clicks) {
    const t = c.at / 1000;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = c.accent ? 1760 : 1175;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(c.accent ? 0.5 : 0.32, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  return ctx.startRendering();
}
