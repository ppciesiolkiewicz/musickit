# Sampler: rules

The sample library and the sound generator of looper instruments. Behaviour spec: `spec/sampler.md`.

- Imports only `@/features/sound`, `@/features/tuner/pitch` (pure maths) and shared components. Never the looper, creator or guitar tools: the looper imports this feature's public index, never the other way. `SoundSpec` mirrors the looper's `VoiceSpec` by shape.
- Keys never reach the browser. The app's provider key (`ELEVENLABS_API_KEY`) is read only in `src/app/api/sampler/generate/route.ts`, and only used when `SAMPLER_SITE_PASSWORD` is also set and sent. A person's own key travels in the `x-provider-key` header, is forwarded and never stored or logged by the server.
- Never forward a provider's error body to the client (`server/elevenlabs.ts` maps statuses to fixed messages).
- Samples and audio persist through `SamplerStore` (`store/types.ts`). IndexedDB today; a cloud store means a new implementation of the same interface. The library (`library.ts`) is one shared store per page; it deletes audio before announcing a change.
- New provider: add it to `PROVIDERS`, a `server/<name>.ts` with an injectable `fetch`, a case in the route, a test.
- Model code (`model/`) is pure and tested. Run the tests and the type check before every commit.
