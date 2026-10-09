# NAM amp models

Runs Neural Amp Modeler `.nam` files on the guitar signal as a looper effect ("Amp model (NAM)"). Code: `src/features/nam/`.

## Supported
WaveNet (A1 and A2 features), LSTM, SlimmableContainer. ConvNet, Linear and slimmable WaveNet are refused with a message when the file is added.

## How it runs
- An AudioWorklet (`workletSource.ts`) with WebAssembly SIMD kernels (`wasm/kernels.c`, built by `wasm/build.sh` into `kernelsWasm.ts`); a JS fallback exists.
- The model's rate differs from the context's: a streaming windowed-sinc resampler (16 samples of latency).
- Silent while the model warms up; passthrough with no model.
- Parameters: model id, input/output dB, gate dB (-90 off), level match (-18 dB target from the file's loudness, unverified), size, mix.

## Library
Models are stored in IndexedDB `musickit-nam` on this device. When a file is added it is validated by building it, then benchmarked; the picker shows the speed (under 4x real time warns, under 2x is too heavy).

## Verified
Output matches the NeuralAmpModelerCore renderer to about 1e-6 on its example models (fixtures in `fixtures/`, MIT licence file included), A2 included. Not verified in a real browser: worklet loading, WASM inside the worklet, audio quality, latency. Speeds were measured in Node, not on a user device. With mix under 100% and resampling, the dry path is not delayed, so it may comb-filter.

## Tests
`npx tsx --test src/features/nam/*.test.ts`
