/** The inference code as a callable module (for tests and for any code running on the main thread). */
import { NAM_DSP_SOURCE } from "./dspSource";
import { KERNELS_WASM_BASE64 } from "./kernelsWasm";

export interface BuildOptions {
  /** the WebAssembly kernel module; without it a plain JavaScript version runs */
  wasm?: Uint8Array;
}

export interface NamModelRuntime {
  inCh: number;
  outCh: number;
  prewarmSamples: number;
  sampleRate: number;
  loudness: number | null;
  breakpoints?: number[];
  setSlim?(v: number): boolean;
  reset(): void;
  process(inputs: Float32Array[], outputs: Float32Array[], n: number): void;
}

export interface ResamplerRuntime {
  process(x: Float32Array, n: number, out: Float32Array | number[]): number;
}

interface Dsp {
  buildModel(spec: unknown, maxBlock: number, opts?: BuildOptions): NamModelRuntime;
  Resampler: new (inRate: number, outRate: number) => ResamplerRuntime;
}

export const loadDsp = (): Dsp => new Function(NAM_DSP_SOURCE)() as Dsp;

/** The kernel module as bytes. */
export function kernelBytes(): Uint8Array {
  const bin = atob(KERNELS_WASM_BASE64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
