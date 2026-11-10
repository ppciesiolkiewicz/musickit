import { getAudioContext, getOutputBus } from "@/features/sound";
import type { Breath, BreathKind } from "./breaths";

/**
 * The breathwork's sounds, no voice: a soft tick on each count and a small bell when the phase changes, its pitch by
 * what comes (higher to breathe in, lower to breathe out). All scheduled at the start on the audio clock into one gain,
 * so the pace never drifts; muting sets the gain, stopping disconnects it.
 */

const CHIME: Partial<Record<BreathKind, number>> = { in: 659.25, hold: 783.99, out: 523.25, sss: 587.33, zzz: 587.33, body: 659.25 };

function tone(ctx: AudioContext, out: AudioNode, at: number, hz: number, peak: number, decay: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = hz;
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(peak, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0005, at + decay);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

export interface BreathSound {
  /** the audio clock time the drill starts at */
  t0: number;
  ctx: AudioContext;
  setMuted(muted: boolean): void;
  stop(): void;
}

export function scheduleBreaths(plan: Breath[], muted: boolean): BreathSound {
  const ctx = getAudioContext();
  const bus = ctx.createGain();
  bus.gain.value = muted ? 0 : 1;
  bus.connect(getOutputBus());
  const t0 = ctx.currentTime + 0.15;
  for (const b of plan) {
    const chime = CHIME[b.kind];
    if (chime) {
      tone(ctx, bus, t0 + b.at, chime, 0.13, 1.4);
      tone(ctx, bus, t0 + b.at, chime * 2, 0.03, 0.8);
    }
    // a tick on each count after the first (the chime marks the first); the opening counts in with ticks only
    for (let s = chime ? 1 : 0; s < b.seconds; s++) tone(ctx, bus, t0 + b.at + s, 1318.5, b.kind === "ready" ? 0.07 : 0.035, 0.06);
  }
  return {
    t0,
    ctx,
    setMuted: (m) => bus.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02),
    stop: () => {
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      setTimeout(() => bus.disconnect(), 120);
    },
  };
}
