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

## Private cloud library
- Models can live in a private Vercel Blob store (access private, folder `nam/`). The browser never reads the store: `GET/POST/DELETE /api/nam` and `GET /api/nam/file?path=` use the Blob SDK with `MUSICKIT_BLOB_READ_WRITE_TOKEN` (falls back to `BLOB_READ_WRITE_TOKEN`).
- Password: none by default (the site is private by obscurity; the store token stays on the server). Set `NAM_LIBRARY_PASSWORD` to require one: sent as `x-site-password`, kept in localStorage `musickit.nam.cloudPassword`, and the panel shows the password field only when the server asks. Without the store token the library is off (404).
- Rules (pure, tested in `server/cloud.test.ts`): only `.nam` files, safe names, no folders, 4 MB per file (Vercel's server upload limit).
- In the picker, the cloud button opens a panel: sign in, list, use (the file is copied into the browser's own library, then selected), upload, delete. Used models stay in the browser, so loading is local and offline.
- Not verified against a real store yet. Licences still apply to models you did not capture yourself: keep this library private.

## Setups and variants in the cloud library
- A folder under `nam/` is one setup and the `.nam` files in it are its variants: `nam/JCM800/Clean.nam`, `nam/JCM800/Crunch.nam`. One level of folder only; a file directly in `nam/` is a setup of its own. The list route returns `group` and `variant` for each file.
- The cloud panel shows each setup as a heading with its variants as buttons. Using one copies it into the browser's library under the name "Setup / Variant" and remembers its cloud path, so it is not downloaded twice.
- Uploading from the app puts files at the top level; to group variants, put them in a folder in the Blob store (dashboard) with the same layout.
