import { createEffect, clampParams, type EffectSpec, type FxNode } from "./effects";

/** A series of effects between `input` and `output`. Empty (or all bypassed) it is a plain wire. */
export class EffectChain {
  readonly input: GainNode;
  readonly output: GainNode;
  private nodes = new Map<string, { node: FxNode; spec: EffectSpec }>();

  constructor(private ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.input.connect(this.output);
  }

  /** Match the chain to the list: new effects are created, removed ones disposed, changed settings updated in place. */
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
    prev.connect(this.output);
  }

  dispose() {
    this.nodes.forEach((e) => e.node.dispose());
    this.nodes.clear();
    for (const n of [this.input, this.output]) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }
}
