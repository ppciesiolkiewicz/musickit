import { getAudioContext, getOutputBus, midiToHz } from "@/features/sound";
import type { GlidePath } from "./glide";

/**
 * The lip roll's tone: a soft, slightly buzzy voice (a triangle wave through a low-pass, with a gentle vibrato) that
 * follows the path's points on the audio clock, so the picture and the sound never drift apart.
 */
export interface GlideSound { t0: number; ctx: AudioContext; stop(): void }

export function playGlide(path: GlidePath, delay = 0.12): GlideSound {
  const ctx = getAudioContext();
  const t0 = ctx.currentTime + delay;
  const end = t0 + path.duration;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.22, t0 + 0.08);
  env.gain.setValueAtTime(0.22, end - 0.15);
  env.gain.linearRampToValueAtTime(0, end);
  // a small vibrato, like a voice
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ctx.createGain();
  depth.gain.value = 2.5;
  lfo.connect(depth).connect(osc.detune);
  const [first, ...rest] = path.points;
  osc.frequency.setValueAtTime(midiToHz(first.midi), t0);
  for (const p of rest) osc.frequency.exponentialRampToValueAtTime(midiToHz(p.midi), t0 + p.t);
  osc.connect(filter).connect(env).connect(getOutputBus());
  osc.start(t0);
  lfo.start(t0);
  osc.stop(end + 0.05);
  lfo.stop(end + 0.05);
  return {
    t0,
    ctx,
    stop: () => {
      env.gain.cancelScheduledValues(ctx.currentTime);
      env.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      setTimeout(() => {
        try {
          osc.stop();
          lfo.stop();
        } catch { /* already stopped */ }
        env.disconnect();
      }, 120);
    },
  };
}

/**
 * The starting note of the student's own pass: the same voice, sounding `delay` seconds from now at full level and fading
 * to nothing over `seconds`, while the line is still flat, so the student starts on it and carries on alone.
 */
export function playCue(midi: number, delay: number, seconds: number): GlideSound {
  const ctx = getAudioContext();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = midiToHz(midi);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.2, t0 + 0.06);
  env.gain.linearRampToValueAtTime(0, t0 + seconds);
  osc.connect(filter).connect(env).connect(getOutputBus());
  osc.start(t0);
  osc.stop(t0 + seconds + 0.05);
  return {
    t0,
    ctx,
    stop: () => {
      env.gain.cancelScheduledValues(ctx.currentTime);
      env.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      setTimeout(() => {
        try {
          osc.stop();
        } catch { /* already stopped */ }
        env.disconnect();
      }, 120);
    },
  };
}
