import { readDeviceChoice, subscribeDeviceChoice, type InputChannel } from "./devices";

/** How loud a frame of samples is (root mean square). */
function rms(data: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return data.length ? Math.sqrt(sum / data.length) : 0;
}

/** Which source of a tap carries `channel` on a device with `channels` inputs: a mono device only has its mix. */
export function tapSource(channel: InputChannel, channels: number): "mix" | 0 | 1 {
  if (channels < 2 || channel === "both") return "mix";
  return channel === "1" ? 0 : 1;
}

export interface ChannelTap {
  /** one channel (mono) carrying the input as chosen: both inputs mixed, Input 1 or Input 2; switched when the choice changes */
  output: AudioNode;
  /** how many inputs the device gives (1 or 2) */
  channels: number;
  /** each input's level now (root mean square, 0..1): one for a mono device, two for an audio interface */
  levels(): number[];
  close(): void;
}

/**
 * Taps an open input (`source`, from a stream of `channels` channels) for a listener: `output` carries the channel the app listens to
 * (`channel`, the app's choice by default, followed when it changes) and `levels` reads each input apart, for the input chip.
 */
export function tapChannels(
  ctx: BaseAudioContext,
  source: AudioNode,
  channels: number,
  channel: { read: () => InputChannel; subscribe: (cb: () => void) => () => void } = { read: () => readDeviceChoice().channel, subscribe: subscribeDeviceChoice },
): ChannelTap {
  const n = Math.min(2, Math.max(1, channels));
  const output = ctx.createGain();
  output.channelCount = 1;
  output.channelCountMode = "explicit";
  output.channelInterpretation = "speakers";
  // the mix: the browser folds a stereo input into one channel (left and right averaged)
  const mix = ctx.createGain();
  mix.channelCount = 1;
  mix.channelCountMode = "explicit";
  mix.channelInterpretation = "speakers";
  source.connect(mix);
  mix.connect(output);
  const split = n > 1 ? ctx.createChannelSplitter(2) : null;
  const gates: GainNode[] = [];
  const meters: AnalyserNode[] = [];
  if (split) {
    source.connect(split);
    for (let i = 0; i < 2; i++) {
      const gate = ctx.createGain();
      split.connect(gate, i);
      gate.connect(output);
      gates.push(gate);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      split.connect(an, i);
      meters.push(an);
    }
  } else {
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    mix.connect(an);
    meters.push(an);
  }
  const route = () => {
    const pick = tapSource(channel.read(), n);
    mix.gain.value = pick === "mix" ? 1 : 0;
    gates.forEach((g, i) => (g.gain.value = pick === i ? 1 : 0));
  };
  route();
  const unsubscribe = channel.subscribe(route);
  const data = meters.map((an) => new Float32Array(an.fftSize));
  return {
    output,
    channels: n,
    levels: () =>
      meters.map((an, i) => {
        an.getFloatTimeDomainData(data[i]);
        return rms(data[i]);
      }),
    close() {
      unsubscribe();
      for (const node of [mix, output, split, ...gates, ...meters]) node?.disconnect();
      try {
        source.disconnect(mix);
        if (split) source.disconnect(split);
      } catch {
        /* already gone */
      }
    },
  };
}
