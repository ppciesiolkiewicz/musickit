import { getAudioContext, getOutputBus } from "@/features/sound";

let current: (() => void) | null = null;

/**
 * Play an exact reference pitch: a soft tone of a few harmonics, synthesised at `hz`. Not a sampled instrument, whose samples are
 * stretched from a few recorded notes and tuned to A440, so the tuner would hear them off.
 */
export function playReference(hz: number, seconds = 1.6): void {
  current?.();
  const ctx = getAudioContext();
  void ctx.resume();
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.25, t + 0.02);
  out.gain.setTargetAtTime(0, t + seconds - 0.4, 0.12);
  out.connect(getOutputBus());
  const oscs = [1, 2, 3].map((h, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = hz * h;
    g.gain.value = [1, 0.4, 0.2][i];
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + seconds);
    return o;
  });
  const stop = () => {
    oscs.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
    out.disconnect();
    if (current === stop) current = null;
  };
  oscs[0].onended = stop;
  current = stop;
}
