import { loadDsp, type NamModelRuntime } from "./dsp";

/** A parsed .nam file, ready to hand to the DSP. Weights stay plain arrays until `toTransferable`. */
export type NamSpec = Record<string, unknown>;

export interface NamInfo {
  name: string;
  /** WaveNet, LSTM or SlimmableContainer */
  architecture: string;
  version: string;
  /** the rate the model was trained at; null when the file does not say (48 kHz is assumed) */
  sampleRate: number | null;
  /** dB, from the file's metadata */
  loudness: number | null;
  gear: string | null;
  /** number of weights */
  params: number;
  /** sizes a slimmable model can switch between: the upper edges of all but the last range, 0..1 */
  sizes: number[] | null;
}

export type ReadResult = { ok: true; spec: NamSpec; info: NamInfo } | { ok: false; error: string };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function countWeights(spec: NamSpec): number {
  const subs = (spec.config as { submodels?: { model: NamSpec }[] } | undefined)?.submodels;
  if (spec.architecture === "SlimmableContainer" && subs) return subs.reduce((n, s) => n + countWeights(s.model), 0);
  return Array.isArray(spec.weights) ? spec.weights.length : 0;
}

/**
 * Reads the text of a .nam file. The model is really built once (in plain JavaScript) so a file with the wrong number of weights,
 * an unsupported layer or a missing field is refused here, with a message, and not later on the audio thread.
 */
export function readNam(text: string, fallbackName = "Model"): ReadResult {
  let spec: NamSpec;
  try {
    spec = JSON.parse(text);
  } catch {
    return { ok: false, error: "That is not a .nam file." };
  }
  if (!spec || typeof spec !== "object" || typeof spec.architecture !== "string" || !spec.config || typeof spec.config !== "object") return { ok: false, error: "That is not a .nam file." };
  let model: NamModelRuntime;
  try {
    model = loadDsp().buildModel(spec, 128);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "This model cannot be loaded." };
  }
  const meta = (spec.metadata && typeof spec.metadata === "object" ? spec.metadata : {}) as Record<string, unknown>;
  const gear = [str(meta.gear_make), str(meta.gear_model)].filter(Boolean).join(" ") || null;
  return {
    ok: true,
    spec,
    info: {
      name: str(meta.name) ?? gear ?? fallbackName.replace(/\.[^.]+$/, ""),
      architecture: spec.architecture,
      version: str(spec.version) ?? "?",
      sampleRate: num(spec.sample_rate),
      loudness: num(meta.loudness) ?? model.loudness,
      gear,
      params: countWeights(spec),
      sizes: model.breakpoints ?? null,
    },
  };
}

/** A copy of the spec with every `weights` list as a Float32Array (cheap to post to the audio thread and half the size). */
export function toTransferable(spec: NamSpec): NamSpec {
  const walk = (v: unknown, key?: string): unknown => {
    if (key === "weights" && Array.isArray(v)) return Float32Array.from(v as number[]);
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(spec) as NamSpec;
}

/**
 * The gain (dB) that brings a model to the level of the others, from the loudness its file reports. The official plug-in
 * aims at -18 dB. A model without a loudness is left alone.
 */
export function levelMatchDb(loudness: number | null): number {
  return loudness === null ? 0 : Math.max(-24, Math.min(24, -18 - loudness));
}

/** How a model's speed on this device reads in the picker. `speed` is how many times faster than real time it runs. */
export function speedNote(speed: number | null): { text: string; warn: boolean } | null {
  if (speed === null) return null;
  const x = speed >= 10 ? Math.round(speed) : Math.round(speed * 10) / 10;
  if (speed < 2) return { text: `${x}× real time: too heavy for this device`, warn: true };
  if (speed < 4) return { text: `${x}× real time: may crackle under load`, warn: true };
  return { text: `${x}× real time`, warn: false };
}
