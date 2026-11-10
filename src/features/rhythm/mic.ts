import { openInputStream, openLiveInput, tapChannels } from "@/features/sound";
import { createOnsetDetector, type OnsetOptions } from "./onset";
import { heardNow } from "./clock";

/** Forwards the microphone's samples (one channel: the app's chosen channel of the input) with the audio-clock time of each batch's first sample. */
const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(512); this.n = 0; this.t = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    if (this.n === 0) this.t = currentFrame / sampleRate;
    this.buf.set(ch, this.n);
    this.n += ch.length;
    if (this.n >= this.buf.length) {
      this.port.postMessage({ t: this.t, samples: this.buf.slice(0, this.n) });
      this.n = 0;
    }
    return true;
  }
}
registerProcessor("rhythm-tap", Tap);
`;

const loaded = new WeakSet<AudioContext>();

export interface StrumListener { stop: () => void; setOptions: (o: OnsetOptions) => void }

/**
 * Opens the microphone (the input chosen in the nav's devices menu) and calls `onStrum` with the heard time (see clock.ts) of every strum. The mic hears a strum when the
 * audio clock is at t, but the speakers are behind the clock, and the mic itself adds its own delay (reported by some browsers),
 * so both are taken off; what is left over is the player's offset, which the game lets them set. It hears the app's chosen channel
 * (both inputs of an interface mixed, or one). While it listens it publishes each input's level (see liveInput.ts), so the input chip
 * shows the mic hears.
 */
export async function listenForStrums(ctx: AudioContext, onStrum: (heard: number) => void, options: OnsetOptions): Promise<StrumListener> {
  const stream = await openInputStream({ channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  if (!loaded.has(ctx)) {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    loaded.add(ctx);
  }
  const settings = stream.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & { latency?: number };
  const inputLatency = typeof settings?.latency === "number" ? settings.latency : 0;
  const src = ctx.createMediaStreamSource(stream);
  const tap = new AudioWorkletNode(ctx, "rhythm-tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
  const channels = tapChannels(ctx, src, settings?.channelCount ?? 1);
  // its output is silent; connected so every browser keeps pulling it
  channels.output.connect(tap).connect(ctx.destination);
  let detector = createOnsetDetector(ctx.sampleRate, options);
  const live = openLiveInput();
  tap.port.onmessage = (e: MessageEvent<{ t: number; samples: Float32Array }>) => {
    live.levels(channels.levels());
    const found = detector.push(e.data.samples, e.data.t);
    if (!found.length) return;
    const lag = ctx.currentTime - heardNow(ctx);
    for (const t of found) onStrum(t - inputLatency - lag);
  };
  return {
    setOptions: (o) => { detector = createOnsetDetector(ctx.sampleRate, o); },
    stop: () => {
      tap.port.onmessage = null;
      live.close();
      channels.close();
      src.disconnect();
      tap.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
