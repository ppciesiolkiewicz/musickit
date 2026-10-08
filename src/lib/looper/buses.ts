import { createEffect, clampParams, type EffectSpec, type FxNode } from "./effects";

/**
 * A bus for one group of loops: loops feed `input`, the effect chain runs in series, and `out` (the group volume) goes to the speakers.
 */
export class LoopBus {
  readonly input: GainNode;
  readonly out: GainNode;
  private nodes = new Map<string, { node: FxNode; spec: EffectSpec }>();

  constructor(private ctx: AudioContext, destination: AudioNode) {
    this.input = ctx.createGain();
    this.out = ctx.createGain();
    this.input.connect(this.out);
    this.out.connect(destination);
  }

  setVolume(v: number) {
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** Match the chain to the list: effects that are new are created, removed ones are disposed, changed settings are updated in place. */
  setEffects(specs: EffectSpec[]) {
    const keep = new Set(specs.map((s) => s.id));
    for (const [id, e] of this.nodes) {
      if (!keep.has(id)) {
        e.node.dispose();
        this.nodes.delete(id);
      }
    }
    for (const spec of specs) {
      const have = this.nodes.get(spec.id);
      if (!have) this.nodes.set(spec.id, { node: createEffect(this.ctx, spec), spec });
      else {
        have.node.update(clampParams(spec.kind, spec.params));
        have.spec = spec;
      }
    }
    // rewire: input -> each active effect in order -> out
    try {
      this.input.disconnect();
    } catch {
      /* nothing connected */
    }
    this.nodes.forEach((e) => {
      try {
        e.node.output.disconnect();
      } catch {
        /* nothing connected */
      }
    });
    let prev: AudioNode = this.input;
    for (const spec of specs) {
      if (spec.bypass) continue;
      const e = this.nodes.get(spec.id)!;
      prev.connect(e.node.input);
      prev = e.node.output;
    }
    prev.connect(this.out);
  }

  dispose() {
    this.nodes.forEach((e) => e.node.dispose());
    this.nodes.clear();
    try {
      this.input.disconnect();
      this.out.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}
