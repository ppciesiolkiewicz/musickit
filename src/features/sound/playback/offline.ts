import { createBufferBackend } from "../engine/backends/buffer";
import { getInstrumentConfig } from "../engine/instruments";
import { noteToMidi } from "../engine/notes";
import type { Step } from "./sequence";

export interface OfflineClick {
  /** ms from the start */
  at: number;
  accent: boolean;
}

/**
 * Timed notes (and metronome clicks) rendered off the clock to a stereo buffer, sounding as the live player does. Always on our
 * buffer player: it plays on any context, and touches no global state the live sound depends on.
 */
export async function renderOffline(o: { steps: Step[]; clicks?: OfflineClick[]; durationMs: number; instrumentId?: string; sampleRate?: number }): Promise<AudioBuffer> {
  const { steps, clicks = [], durationMs, instrumentId = "PIANO", sampleRate = 48000 } = o;
  const ctx = new OfflineAudioContext(2, Math.ceil((durationMs / 1000) * sampleRate), sampleRate);
  if (!getInstrumentConfig(instrumentId)) throw new Error(`${instrumentId}: an instrument without samples cannot be rendered offline`);
  const backend = createBufferBackend(ctx);

  for (const s of steps) {
    const midi = noteToMidi(s.note);
    if (midi === null) continue;
    await backend.load(instrumentId, midi);
    // a strict instrument without that note gives null and stays silent, as live
    backend.start(instrumentId, { midi, at: s.at / 1000, velocity: s.velocity ?? 0.8, duration: s.hold / 1000 }, ctx.destination);
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
