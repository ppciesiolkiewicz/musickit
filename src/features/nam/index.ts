/**
 * Neural Amp Modeler support: load .nam models (WaveNet, LSTM and the A2 slimmable container) and run them on a guitar signal.
 *
 *   dspSource.ts   the inference code as a string, so one copy runs in the AudioWorklet and in the tests
 *   wasm/          C source of the SIMD kernels and the script that builds kernelsWasm.ts
 *   workletSource  the processor around the model (gate, gains, sample rate conversion)
 *   info.ts        reads .nam files and describes them
 *   library.ts     the models a person added, kept in the browser
 *   host.ts        the effect node
 *
 * The inference matches NeuralAmpModelerCore (MIT) to about 1e-6; see fixtures/ and dsp.test.ts.
 * This feature imports nothing from the app, so the looper (or anything else) can plug it in.
 */
export { createNamEffect, ensureNamWorklet, type ModelSource, type NamEffectNode } from "./host";
export { getModelLibrary, type ModelRecord } from "./library";
export { levelMatchDb, readNam, speedNote, type NamInfo } from "./info";
