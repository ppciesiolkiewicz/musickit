"use client";

import { getAudioContext, getOutputBus } from "@/features/sound";

/**
 * A click at `bpm` on the AudioContext clock from `anchor` (its time in seconds), louder on beat 1 of each 4/4 bar, to the
 * speakers only: the take records the input stream, so the click is heard and never recorded (unless a microphone picks it
 * up from the room). Returns a stop function.
 */
export function startClick(bpm: number, anchor: number): () => void {
  const ctx = getAudioContext();
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(getOutputBus());
  const period = 60 / bpm;
  let next = 0;
  const tick = () => {
    while (anchor + next * period < ctx.currentTime + 0.12) {
      const t = anchor + next * period, accent = next % 4 === 0;
      const osc = ctx.createOscillator(), env = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = accent ? 1760 : 1175;
      env.gain.setValueAtTime(accent ? 0.5 : 0.3, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + 0.045);
      next++;
    }
  };
  tick();
  const id = window.setInterval(tick, 25);
  return () => { window.clearInterval(id); try { out.disconnect(); } catch { /* already gone */ } };
}
