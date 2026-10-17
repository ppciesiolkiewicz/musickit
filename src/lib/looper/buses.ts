import { EffectChain, type EffectSpec } from "@/features/instruments/model";

export { EffectChain };

/** Peak of the latest block of samples from an analyser. */
export function peakOf(a: AnalyserNode, buf: Float32Array<ArrayBuffer>): number {
  a.getFloatTimeDomainData(buf);
  let m = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i]);
    if (v > m) m = v;
  }
  return m;
}

/**
 * A bus for one group of loops: loops feed `input`, then the pre-fader effects, the fader (group volume), the post-fader effects,
 * and the speakers. A meter reads what leaves the bus.
 */
export class LoopBus {
  readonly input: GainNode;
  private pre: EffectChain;
  private fader: GainNode;
  private post: EffectChain;
  private meter: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;

  constructor(private ctx: AudioContext, destination: AudioNode) {
    this.input = ctx.createGain();
    this.pre = new EffectChain(ctx);
    this.fader = ctx.createGain();
    this.post = new EffectChain(ctx);
    this.input.connect(this.pre.input);
    this.pre.output.connect(this.fader);
    this.fader.connect(this.post.input);
    this.post.output.connect(destination);
    this.meter = ctx.createAnalyser();
    this.meter.fftSize = 512;
    this.post.output.connect(this.meter);
    this.buf = new Float32Array(this.meter.fftSize) as Float32Array<ArrayBuffer>;
  }

  /** Peak level of what leaves the bus, 0..1. */
  level(): number {
    return peakOf(this.meter, this.buf);
  }

  setVolume(v: number) {
    this.fader.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setEffects(specs: EffectSpec[]) {
    this.pre.setEffects(specs.filter((s) => !s.post));
    this.post.setEffects(specs.filter((s) => s.post));
  }

  dispose() {
    this.pre.dispose();
    this.post.dispose();
    for (const n of [this.input, this.fader, this.meter]) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }
}
