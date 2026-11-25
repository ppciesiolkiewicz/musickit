import { getAudioContext } from "@/features/sound";
import { detectPitch } from "@/features/tuner";
import { createOnsetDetector } from "@/features/rhythm";
import { midiOfHz } from "../model/fx";

/** Forwards the stream's samples (first channel) in batches, with the audio-clock time of each batch's first sample. */
const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(512); this.n = 0; this.t = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    if (this.n === 0) this.t = currentFrame / sampleRate;
    this.buf.set(ch, this.n);
    this.n += ch.length;
    if (this.n >= this.buf.length) { this.port.postMessage({ t: this.t, samples: this.buf.slice(0, this.n) }); this.n = 0; }
    return true;
  }
}
registerProcessor("neckfx-tap", Tap);
`;
const loaded = new WeakSet<AudioContext>();

/** A pick heard: its note (null when the pitch didn't settle) and how loud, 0 to 1. */
export interface Pick { midi: number | null; level: number }

/** Pitch is read this long after the pick, past the attack's noise. */
const SETTLE_S = 0.03;
const WINDOW = 2048;

/**
 * Listens to the audio of a stream the page already has open (the camera's): each pick (the rhythm game's onset detector) is
 * reported with its note (the tuner's `detectPitch`) once enough sound after it has come in, about 80 ms. Stop with the
 * returned function.
 */
export async function listenForPicks(stream: MediaStream, onPick: (p: Pick) => void): Promise<() => void> {
  if (!stream.getAudioTracks().length) throw new Error("the camera has no sound");
  const ctx = getAudioContext();
  if (ctx.state !== "running") await ctx.resume().catch(() => undefined);
  if (!loaded.has(ctx)) {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    loaded.add(ctx);
  }
  const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
  const tap = new AudioWorkletNode(ctx, "neckfx-tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
  const mute = ctx.createGain();
  mute.gain.value = 0;
  // its output is silent; connected so every browser keeps pulling it
  src.connect(tap).connect(mute).connect(ctx.destination);
  const onsets = createOnsetDetector(ctx.sampleRate, { riseDb: 9 });
  const rate = ctx.sampleRate;
  // the latest samples, and the time of the first one
  const ring = new Float32Array(rate);
  let filled = 0, ringStart = 0;
  const pending: number[] = [];
  tap.port.onmessage = (e: MessageEvent<{ t: number; samples: Float32Array }>) => {
    const { t, samples } = e.data;
    if (filled + samples.length > ring.length) {
      const drop = filled + samples.length - ring.length;
      ring.copyWithin(0, drop, filled);
      filled -= drop;
      ringStart += drop / rate;
    }
    if (!filled) ringStart = t;
    ring.set(samples, filled);
    filled += samples.length;
    pending.push(...onsets.push(samples, t));
    while (pending.length) {
      const from = Math.round((pending[0] + SETTLE_S - ringStart) * rate);
      if (from + WINDOW > filled) break;
      pending.shift();
      if (from < 0) continue;
      const buf = ring.slice(from, from + WINDOW);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const level = Math.min(1, Math.sqrt(sum / WINDOW) * 6);
      const p = detectPitch(buf, rate, { minHz: 75, maxHz: 1400 });
      onPick({ midi: p ? midiOfHz(p.freq) : null, level });
    }
  };
  return () => {
    tap.port.onmessage = null;
    src.disconnect();
    tap.disconnect();
    mute.disconnect();
  };
}
