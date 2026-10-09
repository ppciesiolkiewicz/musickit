"use client";

import { kernelBytes } from "./dsp";
import { NAM_PROCESSOR_NAME, NAM_WORKLET_SOURCE } from "./workletSource";
import { levelMatchDb, type NamInfo, type NamSpec } from "./info";

/** What the effect needs from the model library. */
export interface ModelSource {
  /** the model with this id, or null when this browser does not have it */
  load(id: number): Promise<{ spec: NamSpec; info: NamInfo } | null>;
}

/** An effect node in the shape the looper's effect chains use. */
export interface NamEffectNode {
  input: AudioNode;
  output: AudioNode;
  update(params: Record<string, number>): void;
  dispose(): void;
}

const workletReady = new WeakMap<BaseAudioContext, Promise<void>>();

/** Loads the worklet into an audio context once. */
export function ensureNamWorklet(ctx: BaseAudioContext): Promise<void> {
  let p = workletReady.get(ctx);
  if (!p) {
    const url = URL.createObjectURL(new Blob([NAM_WORKLET_SOURCE], { type: "application/javascript" }));
    p = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    p.catch(() => workletReady.delete(ctx));
    workletReady.set(ctx, p);
  }
  return p;
}

const dbToGain = (db: number) => 10 ** (db / 20);

/**
 * The NAM effect as a node: transparent until a model is loaded, then the model runs in an AudioWorklet.
 * Parameters (see the "nam" effect of the looper): model (library id, 0 = none), input and output (dB), gate (dB, -90 = off),
 * match (1 = bring the model to a common level), size (0..1 for slimmable models), mix.
 */
export function createNamEffect(ctx: AudioContext, params: Record<string, number>, source: ModelSource, onStatus?: (s: { model: number; state: "none" | "loading" | "ready" | "error"; message?: string }) => void): NamEffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry);
  dry.connect(output);
  wet.connect(output);
  let node: AudioWorkletNode | null = null;
  let active = false;
  let current = params;
  let loadedId = 0;
  let token = 0;
  let loudness: number | null = null;
  let disposed = false;
  let lastSize = -1;

  const apply = () => {
    const t = ctx.currentTime;
    const q = current;
    const mix = active ? q.mix : 0;
    wet.gain.setTargetAtTime(mix, t, 0.02);
    dry.gain.setTargetAtTime(1 - mix, t, 0.02);
    if (!node) return;
    node.parameters.get("inGain")?.setTargetAtTime(dbToGain(q.input), t, 0.02);
    node.parameters.get("outGain")?.setTargetAtTime(dbToGain(q.output + (q.match >= 0.5 ? levelMatchDb(loudness) : 0)), t, 0.02);
    node.parameters.get("gate")?.setTargetAtTime(q.gate <= -89 ? 0 : dbToGain(q.gate), t, 0.02);
    if (q.size !== lastSize) {
      lastSize = q.size;
      node.port.postMessage({ type: "size", value: q.size });
    }
  };

  const ensureNode = async () => {
    await ensureNamWorklet(ctx);
    if (disposed) return null;
    if (!node) {
      node = new AudioWorkletNode(ctx, NAM_PROCESSOR_NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      input.connect(node);
      node.connect(wet);
    }
    return node;
  };

  const load = async (id: number) => {
    const mine = ++token;
    loadedId = id;
    if (!id) {
      active = false;
      node?.port.postMessage({ type: "clear" });
      onStatus?.({ model: 0, state: "none" });
      apply();
      return;
    }
    onStatus?.({ model: id, state: "loading" });
    try {
      const [n, model] = await Promise.all([ensureNode(), source.load(id)]);
      if (mine !== token || disposed || !n) return;
      if (!model) throw new Error("This model is not in this browser's library.");
      loudness = model.info.loudness;
      lastSize = -1;
      await new Promise<void>((resolve, reject) => {
        n.port.onmessage = (e: MessageEvent) => {
          if (e.data?.type === "loaded") resolve();
          else if (e.data?.type === "error") reject(new Error(e.data.message));
        };
        n.port.postMessage({ type: "load", spec: model.spec, wasm: kernelBytes() });
      });
      if (mine !== token || disposed) return;
      active = true;
      apply();
      onStatus?.({ model: id, state: "ready" });
    } catch (e) {
      if (mine !== token) return;
      active = false;
      apply();
      onStatus?.({ model: id, state: "error", message: e instanceof Error ? e.message : "Could not load the model." });
    }
  };

  apply();
  void load(Math.round(params.model || 0));

  return {
    input,
    output,
    update(q) {
      current = q;
      const id = Math.round(q.model || 0);
      if (id !== loadedId) void load(id);
      else apply();
    },
    dispose() {
      disposed = true;
      token++;
      try {
        node?.port.close();
      } catch {
        /* already closed */
      }
      [input, output, dry, wet, node].forEach((n) => {
        try {
          n?.disconnect();
        } catch {
          /* already disconnected */
        }
      });
    },
  };
}
